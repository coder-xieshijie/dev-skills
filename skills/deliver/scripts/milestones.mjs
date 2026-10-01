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
// - a milestone's first check is saved before the next commit after it
//   (author time), so the next milestone is not committed on top of an
//   unhandled check. Later rounds re-check fixes or commits a rebase changed
//   and are not timed. A user can waive the ordering with
//   `- milestone-order: waived ...`;
// - each milestone's first record covers only its own commits.
// Records made before a rebase still count: an old commit matches a branch
// commit that makes the same change (same files, same added and removed
// lines; the surrounding lines may differ), and author time survives a
// rebase. Commits a rebase dropped, because the base already has them, are
// skipped. A commit changed since its check (same author time and subject,
// different change) must be covered again by a later round.
// Records none of whose commits match are kept as history and ignored.
// The owner's commits count from the first handoff commit, also after the user
// changes spec.md or verify.md and hands off again; a later handoff commit
// that only re-freezes those two files is left out.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { frozenTrailers, requirementHandoffs } from "./handoffs.mjs";

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

// The branch the requirement branch is based on, from the 基线 line, so its
// commits are never counted as the owner's after a rebase.
export function baseBranch(plan) {
  return plan.match(/^\s*-\s*基线:\s*(\S+)\s*@/m)?.[1] ?? null;
}

// Where the owner's commits start: the handoff commit, else the baseline.
export function startCommit(plan) {
  return (
    plan.match(/^\s*-\s*交接:.*@\s*([0-9a-f]{7,40})(?![0-9a-f])/m)?.[1] ??
    plan.match(/^\s*-\s*基线:.*@\s*([0-9a-f]{7,40})(?![0-9a-f])/m)?.[1] ??
    null
  );
}

// The paths of the frozen spec.md and verify.md inside the code repository,
// as the handoff trailers write them; a file outside it is left out.
export function frozenPaths(plan, planDir, repo) {
  const found = {};
  for (const m of plan.matchAll(/^\s*-\s*(spec|verify):\s*(?:`([^`]+)`|(\S+))\s+sha256=/gm)) {
    try {
      const rel = path.relative(realpathSync(repo), realpathSync(path.resolve(planDir, m[2] ?? m[3])));
      if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) found[m[1]] = rel.split(path.sep).join("/");
    } catch {}
  }
  return found;
}

// The base branch as a ref in the repository: origin/<branch>, else <branch>.
export function baseRefIn(git, plan) {
  const branch = baseBranch(plan);
  if (!branch) return null;
  return (
    [`origin/${branch}`, branch].find((ref) => {
      try {
        git("rev-parse", "--verify", "--quiet", `${ref}^{commit}`);
        return true;
      } catch {
        return false;
      }
    }) ?? null
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
    git("merge-base", "--is-ancestor", start, head);
  } catch {
    errors.push(
      `the 交接/基线 commit ${start.slice(0, 12)} is not an ancestor of ${head.slice(0, 12)}: the branch was rebased or handed off again; ` +
        "update the frozen inputs (read-handoff.mjs prints the new 交接 line) and check again",
    );
    return { errors, notes };
  }
  // Leave out anything already on the base branch, so upstream commits pulled
  // in by a rebase are not taken for the owner's.
  const baseRef = baseRefIn(git, plan);

  // A user who changes spec.md or verify.md during delivery hands off again:
  // a newer commit with both Frozen-Spec and Frozen-Verify trailers, which
  // becomes the 交接 line. The owner's work still starts at the first handoff,
  // so its checks keep counting. A later handoff commit that only re-freezes
  // the two files is the user's change, not the owner's: it needs no milestone
  // check and is not a next commit for the ordering. Trailers are read as
  // read-handoff.mjs reads them; a plan without a 交接 line is left as it was.
  const handedOff = /^\s*-\s*交接:/m.test(plan);
  const isMerge = (commit) => git("rev-list", "--parents", "-n", "1", commit).split(" ").length > 2;
  const refreezeOnly = (commit) => {
    if (!handedOff) return false;
    const trailers = frozenTrailers(git, commit);
    if (!trailers || isMerge(commit)) return false;
    const files = [trailers.spec.file, trailers.verify.file];
    const changed = git("diff-tree", "--no-commit-id", "--name-only", "-r", "--no-renames", "-z", commit)
      .split("\0")
      .filter(Boolean);
    return changed.length > 0 && changed.every((name) => files.includes(name));
  };
  let first = start;
  if (handedOff && baseRef) {
    const earliest = requirementHandoffs(git, baseRef, head, frozenPaths(plan, planDir, repo))[0]?.commit;
    if (earliest && git("rev-parse", start) !== earliest) {
      try {
        git("merge-base", "--is-ancestor", earliest, start);
        first = earliest;
        notes.push(`counting the owner's commits from the first handoff ${earliest.slice(0, 12)}; the 交接 line names a later one`);
      } catch {}
    }
  }
  try {
    scope = git("rev-list", "--first-parent", "--reverse", `${first}..${head}`, ...(baseRef ? ["--not", baseRef] : []))
      .split("\n")
      .filter(Boolean)
      .filter((commit) => !refreezeOnly(commit));
  } catch {
    errors.push(`cannot list ${first.slice(0, 12)}..${head.slice(0, 12)}; pass --repo <worktree with the requirement branch> and fetch it`);
    return { errors, notes };
  }
  const indexOf = new Map(scope.map((commit, i) => [commit, i]));

  // A record made before a rebase names old SHAs. An old commit is the same as
  // a branch commit when it makes the same change: the same file headers and
  // the same added and removed lines, byte for byte (read as latin1, so no
  // bytes are merged by decoding), and for a binary file the same resulting
  // blob. Context lines, hunk positions and the other blob IDs are left out,
  // because they change whenever the base changes near the edit. diff-tree
  // prints nothing for a merge, so merges match only by SHA.
  const changeOf = (commit) => {
    const diff = execFileSync(
      "git",
      ["-C", repo, "diff-tree", "-p", "-M", "--full-index", "--no-commit-id", "--no-color", commit],
      { maxBuffer: 1 << 28 },
    ).toString("latin1");
    const kept = [];
    let inHunk = false;
    let afterChange = false;
    let resultBlob = "";
    for (const line of diff.split("\n")) {
      if (line.startsWith("diff --git ")) {
        [inHunk, afterChange, resultBlob] = [false, false, ""];
        kept.push(line);
      } else if (!inHunk) {
        if (line.startsWith("@@ ")) inHunk = true;
        else if (line.startsWith("index ")) resultBlob = line.match(/\.\.([0-9a-f]+)/)?.[1] ?? "";
        else if (line.startsWith("Binary files ")) kept.push(`${line} ${resultBlob}`);
        else if (line && !/^(similarity|dissimilarity) index /.test(line)) kept.push(line);
      } else if (line.startsWith("+") || line.startsWith("-")) {
        kept.push(line);
        afterChange = true;
      } else {
        // "\ No newline at end of file" belongs to the line before it.
        if (line.startsWith("\\") && afterChange) kept.push(line);
        afterChange = false;
      }
    }
    return kept.join("\n");
  };
  // A rebase keeps a commit's author time and subject, so a branch commit with
  // the same ones but a different change is the old commit changed after its
  // check (a conflict resolved, or an amend).
  const identityOf = (commit) => git("show", "-s", "--format=%at %s", commit);
  let byChange = null;
  let byIdentity = null;
  const add = (map, key, i) => map.set(key, [...(map.get(key) ?? []), i]);
  // Returns { index } for a commit on the branch, { changed } for one changed
  // since, or {} for one the branch no longer has. `after` is the index of the
  // record's previous commit, so two commits making the same edit map to two
  // branch commits in order.
  const locate = (commit, after) => {
    if (indexOf.has(commit)) return { index: indexOf.get(commit) };
    if (!byChange) {
      byChange = new Map();
      byIdentity = new Map();
      scope.forEach((c, i) => {
        const change = changeOf(c);
        if (change) add(byChange, change, i);
        add(byIdentity, identityOf(c), i);
      });
    }
    const pick = (list) => list.find((i) => i > after) ?? list[0];
    const sameIdentity = byIdentity.get(identityOf(commit)) ?? [];
    const change = changeOf(commit);
    // An empty commit or a merge has no change of its own to compare.
    if (!change) return sameIdentity.length ? { index: pick(sameIdentity) } : {};
    const sameChange = byChange.get(change) ?? [];
    if (sameChange.length) return { index: sameChange.find((i) => sameIdentity.includes(i)) ?? pick(sameChange) };
    return sameIdentity.length ? { changed: pick(sameIdentity) } : {};
  };
  const subject = (i) => git("show", "-s", "--format=%h %s", scope[i]);
  const authorSeconds = (i) => Number(git("show", "-s", "--format=%at", scope[i]));

  // Records whose header or body is broken are errors. A record's commits
  // that the branch no longer has (a rebase dropped them because the base has
  // them, or they were replaced by a commit with another subject) are skipped;
  // a replacement is a new commit and needs its own check like any other. Its commits changed since the check must be checked
  // again, by a later round of any milestone. Records none of whose commits
  // are on the branch unchanged (rewritten, or from before a new handoff) are
  // kept as history and do not count; a later round replaces them.
  const records = readRecords(path.join(planDir, "evidence"));
  const usable = [];
  const changedSinceCheck = new Map();
  for (const record of records) {
    if (record.problems.length) {
      errors.push(`${record.name}: ${record.problems.join("; ")}`);
      continue;
    }
    let commits = [];
    try {
      commits = git("rev-list", "--first-parent", "--reverse", `${record.from}..${record.to}`)
        .split("\n")
        .filter(Boolean)
        .filter((commit) => !refreezeOnly(commit));
    } catch {}
    let after = -1;
    const located = commits.map((commit) => {
      const found = locate(commit, after);
      after = found.index ?? found.changed ?? after;
      return found;
    });
    record.indices = located.flatMap((l) => (l.index === undefined ? [] : [l.index]));
    const changed = located.flatMap((l) => (l.changed === undefined ? [] : [l.changed]));
    for (const i of changed) changedSinceCheck.set(i, record.name);
    const dropped = located.length - record.indices.length - changed.length;
    const parts = [];
    if (dropped) parts.push(`${dropped} no longer on the branch (dropped by a rebase because the base has them, or replaced)`);
    if (changed.length) parts.push(`${changed.length} changed since the check`);
    if (record.indices.length === 0)
      notes.push(
        `${record.name} no longer matches the branch${parts.length ? ` (of its ${located.length} commits, ${parts.join(", ")})` : ""}; it does not count`,
      );
    else {
      if (parts.length) notes.push(`${record.name}: of its ${located.length} commits, ${parts.join(", ")}; the rest still count`);
      usable.push(record);
    }
  }

  for (const { id, scenarios } of declared)
    if (!scenarios.length) notes.push(`${id} names no scenario, so it needs no milestone check`);
    else if (!usable.some((r) => r.milestone === id))
      errors.push(
        `${id} has no milestone check record on the current branch: after its scenarios pass, run the milestone check and save the report with record-milestone-check.mjs`,
      );
  for (const record of usable)
    if (ids.length && !ids.includes(record.milestone))
      notes.push(`${record.name} names ${record.milestone}, which plan.md does not list`);

  // Each milestone's first check (round 1) covers only that milestone's
  // commits, so two milestones cannot share one late check over the whole
  // branch. Later rounds may span fixes anywhere, also when round 1 no longer
  // matches the branch.
  const owner = new Map();
  for (const record of usable.filter((r) => Number(r.round) === 1))
    for (const i of record.indices) {
      if (owner.has(i) && owner.get(i) !== record.milestone)
        errors.push(
          `${owner.get(i)} and ${record.milestone} were first checked over the same commit ${subject(i)}: ` +
            "each milestone's first check covers only its own commits",
        );
      owner.set(i, record.milestone);
    }

  const covered = new Set(usable.flatMap((r) => r.indices));
  const last = covered.size ? Math.max(...covered) : -1;
  for (let i = 0; i <= last; i += 1)
    if (!covered.has(i) && !changedSinceCheck.has(i))
      errors.push(
        `commit ${subject(i)} lies between checked ranges but no milestone check covers it: ` +
          "check it with its milestone and record the result",
      );
  for (const [i, name] of changedSinceCheck)
    if (!covered.has(i))
      errors.push(
        `commit ${subject(i)} changed after ${name} checked it (a rebase conflict or an amend): ` +
          "check it again and record the result as a later round",
      );

  // Only a milestone's first check that still counts is timed. Its next commit
  // skips commits only this milestone's later rounds cover (its fixes, or its
  // commits changed since); a commit any other milestone's record covers is
  // never skipped. Git keeps whole seconds, so compare at that precision.
  const coveredBy = new Map();
  for (const record of usable)
    for (const i of record.indices) coveredBy.set(i, new Set([...(coveredBy.get(i) ?? []), record.milestone]));
  const waived = /^\s*-\s*milestone-order:\s*waived\b/m.test(plan);
  for (const id of new Set(usable.map((r) => r.milestone))) {
    const rounds = usable.filter((r) => r.milestone === id).sort((a, b) => Number(a.round) - Number(b.round));
    const [record] = rounds;
    const ownLater = new Set(
      rounds
        .slice(1)
        .flatMap((r) => r.indices)
        .filter((i) => [...coveredBy.get(i)].every((m) => m === id)),
    );
    let next = Math.max(...record.indices) + 1;
    while (ownLater.has(next)) next += 1;
    if (next >= scope.length) continue;
    const committed = authorSeconds(next);
    if (committed < Math.floor(Date.parse(record.recorded_at) / 1000)) {
      const message =
        `${record.milestone} round ${record.round} was recorded at ${record.recorded_at}, after the next commit ${subject(next)} ` +
        `(${new Date(committed * 1000).toISOString()})` +
        (Number(record.round) > 1 ? `; it is ${id}'s first check that still matches the branch` : "") +
        ". Handle a milestone check before committing the next milestone. " +
        "This cannot be fixed afterwards; if the user accepts it, add `- milestone-order: waived <the user's words and date>` to plan.md's frozen inputs";
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
