// Milestone check records, shared by record-milestone-check.mjs and
// check-delivery.mjs.
//
// A record is evidence/milestone-<ID>-r<round>.md next to plan.md:
//
//   ---
//   milestone: M1
//   round: 1
//   range: <from sha>..<to sha>
//   recorded_at: <ISO time>
//   body_sha256: <hex>
//   ---
//   <the subagent's report, verbatim>
//
// record-milestone-check.mjs writes the header, so recorded_at is the time the
// owner saved the result, and body_sha256 ties the header to the report.
//
// checkMilestones() enforces what the deliver Skill asks of milestone checks:
// - every milestone in plan.md's 里程碑 section that names scenarios (S01,
//   ...) has at least one record; a milestone without scenarios, such as
//   documentation, has no scenarios to check first;
// - the requirement branch is covered without gaps up to the last checked
//   commit (commits after it, such as fixes after the independent
//   verification, are left to that verification);
// - a record is saved before the next commit after its range (author time),
//   so the next milestone is not committed on top of an unhandled check.
//   Records made before a rebase still count: their commits are matched to
//   the branch by `git patch-id --stable`, and author time survives a rebase.
//   A user can waive the ordering with `- milestone-order: waived ...`.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const sha256 = (data) => createHash("sha256").update(data).digest("hex");

export function gitIn(repo) {
  return (...args) =>
    execFileSync("git", ["-C", repo, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1 << 28,
    }).trim();
}

// Milestones declared in the 里程碑 section of plan.md, in order. Each
// milestone's paragraph, list item or sub-heading starts with its ID (M1, M2,
// ...), optionally in bold; its text runs until the next milestone or the end
// of the section. Returns [{ id, scenarios: [S01, ...] }].
export function milestones(plan) {
  const found = [];
  let current = null;
  let level = 0;
  for (const line of plan.split("\n")) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      if (level && heading[1].length <= level) level = 0;
      if (!level && /^里程碑\s*$/.test(heading[2].trim())) {
        level = heading[1].length;
        continue;
      }
    }
    if (!level) {
      current = null;
      continue;
    }
    const text = heading ? heading[2] : line;
    const id = text.match(/^\s*(?:[-*]\s+)?\**\s*(M\d+)(?![0-9A-Za-z])/)?.[1];
    if (id) {
      current = found.find((m) => m.id === id);
      if (!current) found.push((current = { id, scenarios: [] }));
    }
    if (current)
      for (const s of text.match(/\bS\d{2,}\b/g) ?? [])
        if (!current.scenarios.includes(s)) current.scenarios.push(s);
  }
  return found;
}

export function milestoneIds(plan) {
  return milestones(plan).map((m) => m.id);
}

// The git work tree holding the code: an explicit --repo, else the repository
// that contains the frozen spec.md.
export function codeRepo(plan, planDir, override) {
  if (override) return path.resolve(override);
  const spec = plan.match(/^\s*-\s*spec:\s*(?:`([^`]+)`|(\S+))\s+sha256=/m);
  if (!spec) return null;
  const file = path.resolve(planDir, spec[1] ?? spec[2]);
  try {
    return gitIn(path.dirname(file))("rev-parse", "--show-toplevel");
  } catch {
    return null;
  }
}

// Where the owner's commits start: the handoff commit, else the baseline.
export function startCommit(plan) {
  return (
    plan.match(/^\s*-\s*交接:.*@\s*([0-9a-f]{7,40})(?![0-9a-f])/m)?.[1] ??
    plan.match(/^\s*-\s*基线:.*@\s*([0-9a-f]{7,40})(?![0-9a-f])/m)?.[1] ??
    null
  );
}

export function recordName(id, round) {
  return `milestone-${id}-r${round}.md`;
}

export function readRecords(evidenceDir) {
  if (!existsSync(evidenceDir)) return [];
  return readdirSync(evidenceDir)
    .filter((name) => /^milestone-.+\.md$/.test(name))
    .sort()
    .map((name) => {
      const file = path.join(evidenceDir, name);
      const text = readFileSync(file, "utf8");
      const record = { file, name, problems: [] };
      const parts = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!parts) {
        record.problems.push("no header; save the report with record-milestone-check.mjs");
        return record;
      }
      for (const line of parts[1].split("\n")) {
        const field = line.match(/^([a-z_0-9]+):\s*(.*)$/);
        if (field) record[field[1]] = field[2].trim();
      }
      record.body = parts[2];
      if (!/^M\d+$/.test(record.milestone ?? "")) record.problems.push("no `milestone: M<n>` line");
      if (!/^\d+$/.test(record.round ?? "")) record.problems.push("no `round: <n>` line");
      const range = (record.range ?? "").match(/^([0-9a-f]{40})\.\.([0-9a-f]{40})$/);
      if (!range) record.problems.push("no `range: <from sha>..<to sha>` line with full SHAs");
      else [record.from, record.to] = [range[1], range[2]];
      if (Number.isNaN(Date.parse(record.recorded_at ?? ""))) record.problems.push("no valid `recorded_at` time");
      if (record.body_sha256 !== sha256(record.body)) record.problems.push("report changed after it was recorded");
      return record;
    });
}

export function checkMilestones({ plan, planDir, repo, head }) {
  const errors = [];
  const notes = [];
  const declared = milestones(plan);
  const ids = declared.map((m) => m.id);
  if (ids.length === 0)
    errors.push(
      "plan.md lists no milestone IDs under 里程碑: start each milestone's paragraph with its ID (M1, M2, ...); the milestone check records are matched by ID",
    );
  if (!repo) {
    errors.push("cannot find the code repository: pass --repo <worktree with the requirement branch> when spec.md is not inside it");
    return { errors, notes };
  }
  const git = gitIn(repo);
  const start = startCommit(plan);
  if (!start) {
    errors.push("plan.md has no 交接 or 基线 line under the frozen inputs, so the first owner commit is unknown");
    return { errors, notes };
  }
  let scope;
  try {
    scope = git("rev-list", "--first-parent", "--reverse", `${start}..${head}`).split("\n").filter(Boolean);
  } catch {
    errors.push(`cannot list ${start.slice(0, 12)}..${head.slice(0, 12)}; pass --repo <worktree with the requirement branch> and fetch it`);
    return { errors, notes };
  }
  const indexOf = new Map(scope.map((commit, i) => [commit, i]));
  let byPatchId = null;
  const patchId = (commit) => {
    const diff = execFileSync("git", ["-C", repo, "show", "--format=", commit], { maxBuffer: 1 << 28 });
    const out = execFileSync("git", ["-C", repo, "patch-id", "--stable"], { input: diff, encoding: "utf8" });
    return out.split(" ")[0] || null;
  };
  const locate = (commit) => {
    if (indexOf.has(commit)) return indexOf.get(commit);
    if (!byPatchId) {
      byPatchId = new Map();
      for (const c of scope) {
        const id = patchId(c);
        if (id && !byPatchId.has(id)) byPatchId.set(id, indexOf.get(c));
      }
    }
    const id = patchId(commit);
    return id && byPatchId.has(id) ? byPatchId.get(id) : null;
  };
  const subject = (i) => git("show", "-s", "--format=%h %s", scope[i]);
  const authorTime = (i) => git("show", "-s", "--format=%aI", scope[i]);

  const records = readRecords(path.join(planDir, "evidence"));
  const usable = [];
  for (const record of records) {
    if (!record.problems.length) {
      let commits = [];
      try {
        commits = git("rev-list", "--first-parent", "--reverse", `${record.from}..${record.to}`).split("\n").filter(Boolean);
      } catch {
        record.problems.push("range commits are not in this repository");
      }
      if (!record.problems.length && commits.length === 0) record.problems.push("range is empty");
      record.indices = [];
      for (const commit of commits) {
        const i = locate(commit);
        if (i === null) record.problems.push(`${commit.slice(0, 12)} is not on the requirement branch`);
        else record.indices.push(i);
      }
    }
    if (record.problems.length) errors.push(`${record.name}: ${record.problems.join("; ")}`);
    else usable.push(record);
  }

  for (const { id, scenarios } of declared)
    if (!scenarios.length) notes.push(`${id} names no scenario, so it needs no milestone check`);
    else if (!usable.some((r) => r.milestone === id))
      errors.push(
        `${id} has no milestone check record: after its scenarios pass, run the milestone check and save the report with record-milestone-check.mjs`,
      );
  for (const record of usable)
    if (ids.length && !ids.includes(record.milestone))
      notes.push(`${record.name} names ${record.milestone}, which plan.md does not list`);

  const covered = new Set(usable.flatMap((r) => r.indices));
  const last = covered.size ? Math.max(...covered) : -1;
  for (let i = 0; i <= last; i += 1)
    if (!covered.has(i))
      errors.push(`commit ${subject(i)} lies between checked ranges but no milestone check covers it: check it with its milestone and record the result`);

  const waived = /^\s*-\s*milestone-order:\s*waived\b/m.test(plan);
  for (const record of usable) {
    const next = Math.max(...record.indices) + 1;
    if (next >= scope.length) continue;
    const committed = authorTime(next);
    if (Date.parse(committed) < Date.parse(record.recorded_at)) {
      const message =
        `${record.milestone} round ${record.round} was recorded at ${record.recorded_at}, after the next commit ${subject(next)} (${committed}). ` +
        "Handle a milestone check before committing the next milestone. This cannot be fixed afterwards; if the user accepts it, " +
        "add `- milestone-order: waived <the user's words and date>` to plan.md's frozen inputs";
      (waived ? notes : errors).push(waived ? `waived: ${message}` : message);
    }
  }
  if (usable.length)
    notes.push(
      `milestone records: ${usable.length} for ${[...new Set(usable.map((r) => r.milestone))].join(", ")}; ` +
        `${covered.size} of ${scope.length} branch commits covered`,
    );
  return { errors, notes };
}
