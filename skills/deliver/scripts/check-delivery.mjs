#!/usr/bin/env node
// Delivery gate for the deliver Skill.
//
//   node check-delivery.mjs --plan <plan.md> --frozen-only
//   node check-delivery.mjs --plan <plan.md> --milestones-only [--head <sha>] [--repo <dir>]
//   node check-delivery.mjs --plan <plan.md> --report <report.md> [--head <sha>] [--repo <dir>]
//
// --frozen-only runs check 1 alone; run it when starting or resuming, after
// writing the user-confirmed hashes into plan.md. --milestones-only runs
// check 5 alone, on the code repository's HEAD unless --head is given. The
// full gate runs on the MR's actual head before calling the MR mergeable,
// and again before merging:
//
// 1. spec and verify still match the sha256 recorded under plan.md's frozen
//    inputs (the hashes the user confirmed), so no scenario was made to pass
//    by editing the acceptance docs. When either differs from the first
//    handoff commit on the requirement branch, the user changed it during
//    delivery: plan.md must record their confirmation of the current hash
//    (`- 重新确认: verify sha256=<hex> <the user's words and date>`), the
//    change is listed for the MR, and the full gate wants the verifier's
//    "验收文档改动" section, in which it judges whether acceptance got looser.
// 2. The verification report names the same head as the MR. Without --head,
//    the HEAD of the git repository that contains plan.md is used. A report
//    for an earlier head still holds when that head is an ancestor of the MR
//    head and every file changed since is a test, a doc or lint config, and
//    neither spec.md nor verify.md changed (report-reuse.mjs); the files are
//    listed.
// 3. The report is complete (report-format.mjs): a row for every scenario and
//    every requirement proven by a mechanical or existing check, the verdict,
//    smoke-regression and code-issues lines, the model line and the closing
//    sections. The verdict and smoke-regression are PASS, code-issues is 0,
//    no row is FAIL, and a row may be UNVERIFIED only when its reason starts
//    with 覆盖盲区 and verify.md lists the ID as a blind-spot entry; such rows
//    are listed, because the MR must declare them.
// 4. The report came from run-verifier.mjs: its run record
//    (<report>.run.json) is valid, names the same head, holds the report's
//    sha256, and the family of its model (recomputed from the model ID)
//    differs from the owner's family in plan.md.
//    A same-family verifier passes only when plan.md records the user's
//    waiver (`- cross-family: waived ...`).
// 5. Milestone checks (milestones.mjs): every milestone ID in plan.md has a
//    record saved by record-milestone-check.mjs, the records cover the
//    branch without gaps up to the last checked commit, and each record was
//    saved before the next commit. A late record passes only with the
//    user's waiver (`- milestone-order: waived ...`).
//
// The code repository is --repo, else the git repository that holds spec.md.
// Exit 0 when every check passes, 1 when any fails, 2 on usage errors.
// Zero dependencies.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { branchHandoffs } from "./handoffs.mjs";
import { baseRefIn, checkMilestones, codeRepo, gitIn } from "./milestones.mjs";
import { familyOf } from "./model-family.mjs";
import { isDeclaredBlindSpot, parseReport, parseVerify, reportProblems } from "./report-format.mjs";
import { reuseCheck } from "./report-reuse.mjs";

const USAGE =
  "usage: check-delivery.mjs --plan <plan.md> --frozen-only\n" +
  "       check-delivery.mjs --plan <plan.md> --milestones-only [--head <sha>] [--repo <dir>]\n" +
  "       check-delivery.mjs --plan <plan.md> --report <report.md> [--head <sha>] [--repo <dir>]";

function usage(message) {
  console.error(`check-delivery: ${message}\n${USAGE}`);
  process.exit(2);
}

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i];
  if (key === "--frozen-only" || key === "--milestones-only") {
    args[key.slice(2)] = true;
    continue;
  }
  if (!["--plan", "--report", "--head", "--repo"].includes(key))
    usage(`unknown argument ${key}`);
  if (i + 1 >= argv.length) usage(`missing value for ${key}`);
  args[key.slice(2)] = argv[(i += 1)];
}
if (!args.plan) usage("--plan is required");
if (args["frozen-only"] && args["milestones-only"])
  usage("--frozen-only and --milestones-only are separate checks");
if (!args["frozen-only"] && !args["milestones-only"] && !args.report)
  usage("--report is required unless --frozen-only or --milestones-only");
if (args["frozen-only"] && (args.report || args.head || args.repo))
  usage("--frozen-only takes only --plan");
if (args["milestones-only"] && args.report)
  usage("--milestones-only takes no --report");
for (const key of ["plan", "report"])
  if (args[key] && !existsSync(args[key]))
    usage(`${key} file not found: ${args[key]}`);

const planPath = path.resolve(args.plan);
const planDir = path.dirname(planPath);
const plan = readFileSync(planPath, "utf8");
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

const errors = [];
const notes = [];

function finish(okMessage) {
  for (const note of notes) console.log(`  note: ${note}`);
  if (errors.length) {
    console.error(`check-delivery: ${errors.length} problem(s)`);
    for (const error of errors) console.error(`  ${error}`);
    process.exit(1);
  }
  console.log(`check-delivery: OK (${okMessage})`);
  process.exit(0);
}

const repo = codeRepo(plan, planDir, args.repo);

if (args["milestones-only"]) {
  let head = args.head;
  if (head === undefined && repo) {
    try {
      head = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    } catch {}
  }
  if (head !== undefined && !/^[0-9a-f]{40}$/.test(head)) usage(`--head must be a 40-hex SHA: ${head}`);
  const result = checkMilestones({ plan, planDir, repo, head });
  errors.push(...result.errors);
  notes.push(...result.notes);
  finish(`milestone checks recorded in order up to ${String(head).slice(0, 12)}`);
}

// 1. Frozen inputs: `- spec: spec.md sha256=<hex>`, paths relative to plan.md
// or absolute; a path in backticks may contain spaces.
const frozen = new Map();
for (const m of plan.matchAll(
  /^\s*-\s*(spec|verify):\s*(?:`([^`]+)`|(\S+))\s+sha256=([0-9a-f]{64})\s*$/gm,
))
  frozen.set(m[1], { file: path.resolve(planDir, m[2] ?? m[3]), hash: m[4] });

for (const kind of ["spec", "verify"]) {
  const entry = frozen.get(kind);
  if (!entry) {
    errors.push(`plan.md has no frozen-input line for ${kind}`);
    continue;
  }
  if (!existsSync(entry.file)) {
    errors.push(`${kind} file not found: ${entry.file}`);
    continue;
  }
  const actual = sha256(readFileSync(entry.file));
  if (actual !== entry.hash)
    errors.push(
      `${kind} changed since it was frozen: ${entry.file} ` +
        `(recorded ${entry.hash.slice(0, 12)}, now ${actual.slice(0, 12)})`,
    );
}

// Changes to spec or verify since the first handoff (check 1, continued).
function acceptanceChanges(headSha) {
  if (!repo || !headSha || !/^\s*-\s*交接:/m.test(plan)) return [];
  const git = gitIn(repo);
  const baseRef = baseRefIn(git, plan);
  if (!baseRef) return [];
  let first;
  try {
    first = branchHandoffs(git, baseRef, headSha)[0];
  } catch {
    return [];
  }
  const changed = [];
  for (const kind of ["spec", "verify"]) {
    const now = frozen.get(kind)?.hash;
    if (!first || !now || first[kind].hash === now) continue;
    changed.push(kind);
    notes.push(
      `${kind} changed since the first handoff ${first.commit.slice(0, 12)} (${first[kind].hash.slice(0, 12)} -> ${now.slice(0, 12)}); ` +
        `list it in the MR: git diff ${first.commit.slice(0, 12)} ${headSha.slice(0, 12)} -- ${first[kind].file}`,
    );
    const confirmed = new RegExp(`^[ \\t]*-[ \\t]*重新确认:[ \\t]*${kind}[ \\t]+sha256=${now}[ \\t]+\\S`, "m");
    if (!confirmed.test(plan))
      errors.push(
        `${kind} is not the version of the first handoff, and plan.md has no \`- 重新确认: ${kind} sha256=${now} <the user's words and date>\` line. ` +
          "Only the user changes spec and verify (deliver, 停下); record their words when they confirmed this version",
      );
  }
  return changed;
}

if (args["frozen-only"]) {
  let repoHead;
  try {
    repoHead = repo ? execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() : undefined;
  } catch {}
  acceptanceChanges(repoHead);
  finish("spec and verify match the frozen hashes");
}

const reportPath = path.resolve(args.report);
const report = readFileSync(reportPath, "utf8");

// 2. Report head equals the MR head.
let head = args.head;
if (head === undefined) {
  try {
    head = execFileSync("git", ["-C", planDir, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    usage("no --head given and plan.md is not inside a git repository");
  }
}
if (!/^[0-9a-f]{40}$/.test(head)) usage(`--head must be a 40-hex SHA: ${head}`);

if (acceptanceChanges(head).length && !/验收文档改动/.test(report))
  errors.push(
    "spec or verify changed since the first handoff, but the report has no 验收文档改动 section; " +
      "run the verifier again with the current run-verifier.mjs, which points it at the first handoff",
  );

// A report for an earlier head holds when only tests, docs or lint config
// changed since; otherwise the checks below compare against the MR head.
const parsed = parseReport(report);
let verifiedHead = head;
if (parsed.head && parsed.head !== head) {
  if (!repo) errors.push("cannot find the code repository to compare the report's head; pass --repo");
  else {
    const inRepo = (file) => {
      try {
        return path.relative(realpathSync(repo), realpathSync(file)).split(path.sep).join("/");
      } catch {
        return null;
      }
    };
    const frozenInRepo = [...frozen.values()].map((f) => inRepo(f.file));
    const reuse = frozenInRepo.some((f) => !f || f.startsWith(".."))
      ? {
          ok: false,
          problem:
            "spec.md or verify.md lives outside the code repository, so nothing shows they are the ones the report was checked against; " +
            "verify the MR head again",
        }
      : reuseCheck({ repo, verifiedHead: parsed.head, head, frozen: frozenInRepo });
    if (reuse.ok) {
      verifiedHead = parsed.head;
      notes.push(
        `report is for ${parsed.head.slice(0, 12)}; since then only tests, docs or lint config changed, so it holds for ` +
          `${head.slice(0, 12)} (${reuse.files.map((f) => `${f.file} [${f.kind}]`).join(", ") || "no file changes"}); ` +
          "the quality commands and CI still have to pass on the MR head",
      );
    } else errors.push(reuse.problem);
  }
}

// 3. Complete report, PASS verdict, no FAIL, UNVERIFIED only for blind spots.
const verifyText = frozen.has("verify") && existsSync(frozen.get("verify").file)
  ? readFileSync(frozen.get("verify").file, "utf8")
  : "";
const verifyInfo = parseVerify(verifyText);
if (verifyText && verifyInfo.scenarios.length === 0)
  errors.push("verify.md has no scenario IDs (S01, S02, ...)");
errors.push(...reportProblems(parsed, verifyInfo, verifiedHead));
if (parsed.verdict && parsed.verdict !== "PASS")
  errors.push(`report verdict is ${parsed.verdict}`);
if (parsed.smoke && parsed.smoke !== "PASS")
  errors.push(`smoke-regression is ${parsed.smoke}`);
if (parsed.codeIssues) errors.push(`report lists ${parsed.codeIssues} code issue(s)`);
const required = [...verifyInfo.scenarios, ...verifyInfo.requirements];
for (const id of required) {
  const rows = parsed.rows.get(id) ?? [];
  if (rows.some((r) => r.result === "FAIL")) errors.push(`${id} is FAIL`);
  else if (rows.some((r) => r.result === "UNVERIFIED")) {
    if (rows.every((r) => r.result !== "UNVERIFIED" || isDeclaredBlindSpot(id, r, verifyInfo)))
      notes.push(`${id} is UNVERIFIED (declared blind spot)`);
    else errors.push(`${id} is UNVERIFIED and not a declared blind spot; resolve the environment and re-verify`);
  }
}
for (const id of parsed.rows.keys())
  if (verifyText && !required.includes(id))
    notes.push(`${id} is in the report but not required by verify.md`);

// 4. Run record from run-verifier.mjs.
const recordPath = reportPath.replace(/\.md$/, ".run.json");
let record = null;
if (recordPath === reportPath || !existsSync(recordPath))
  errors.push(`no run record next to the report (${path.basename(recordPath)}); run the verifier through run-verifier.mjs`);
else {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(recordPath, "utf8"));
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) record = parsed;
    else errors.push(`run record is not a JSON object: ${recordPath}`);
  } catch {
    errors.push(`run record is not valid JSON: ${recordPath}`);
  }
}
if (record) {
  if (record.valid !== true)
    errors.push(`run record is not valid: ${(record.problems ?? []).join("; ") || "valid is not true"}`);
  if (record.head !== verifiedHead)
    errors.push(`run record head ${String(record.head).slice(0, 12)} is not the report's head ${verifiedHead.slice(0, 12)}`);
  if (record.report_sha256 !== sha256(report))
    errors.push("report changed after the verifier returned it (sha256 differs from the run record)");
  if (!record.session_id) errors.push("run record has no session_id");
  if (!record.model) errors.push("run record has no model");
  const owner = plan.match(/^\s*-\s*owner:.*\bfamily=(\S+)/m)?.[1];
  const waived = /^\s*-\s*cross-family:\s*waived\b/m.test(plan);
  if (!owner) errors.push("plan.md has no `- owner: family=<family> model=<model>` line");
  else {
    // Recompute from the model ID; the family field alone is not trusted.
    const family = familyOf(record.model);
    if (!family) errors.push(`cannot tell the model family of ${record.model}`);
    else if (record.family !== family)
      errors.push(`run record family ${record.family} does not match model ${record.model} (${family})`);
    else if (family === owner.toLowerCase()) {
      if (waived) notes.push(`verifier family ${family} equals the owner's; the user waived cross-family verification`);
      else errors.push(`verifier family ${family} equals the owner's family; cross-family verification is required`);
    }
  }
}

// 5. Milestone checks were recorded, cover the branch and came in order.
{
  const result = checkMilestones({ plan, planDir, repo, head });
  errors.push(...result.errors);
  notes.push(...result.notes);
}

finish(
  `spec and verify unchanged; report head ${verifiedHead.slice(0, 12)} for MR head ${head.slice(0, 12)}; ` +
    `${verifyInfo.scenarios.length} scenarios, ${verifyInfo.requirements.length} checked requirements, ` +
    `${notes.filter((n) => n.includes("UNVERIFIED")).length} UNVERIFIED; ` +
    `verifier ${record?.family}/${record?.model} session ${record?.session_id}`,
);
