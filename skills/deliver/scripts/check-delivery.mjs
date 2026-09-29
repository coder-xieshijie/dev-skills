#!/usr/bin/env node
// Delivery gate for the deliver Skill.
//
//   node check-delivery.mjs --plan <plan.md> --frozen-only
//   node check-delivery.mjs --plan <plan.md> --report <report.md> [--head <sha>]
//
// --frozen-only runs check 1 alone; run it when starting or resuming, after
// writing the user-confirmed hashes into plan.md. The full gate runs on the
// MR's actual head before calling the MR mergeable, and again before merging:
//
// 1. spec and verify still match the sha256 recorded under plan.md's frozen
//    inputs (the hashes the user confirmed), so no scenario was made to pass
//    by editing the acceptance docs.
// 2. The verification report names the same head as the MR. Without --head,
//    the HEAD of the git repository that contains plan.md is used.
// 3. Every scenario ID in verify.md (S01, S02, ...) has a row in the report,
//    no row is FAIL, and the report names its model. UNVERIFIED rows pass the
//    gate but are listed, because the MR must declare them.
// 4. The report came from run-verifier.mjs: its run record
//    (<report>.run.json) is valid, names the same head, holds the report's
//    sha256, and the family of its model (recomputed from the model ID)
//    differs from the owner's family in plan.md.
//    A same-family verifier passes only when plan.md records the user's
//    waiver (`- cross-family: waived ...`).
//
// Exit 0 when every check passes, 1 when any fails, 2 on usage errors.
// Zero dependencies.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { familyOf } from "./model-family.mjs";

const USAGE =
  "usage: check-delivery.mjs --plan <plan.md> --frozen-only\n" +
  "       check-delivery.mjs --plan <plan.md> --report <report.md> [--head <sha>]";

function usage(message) {
  console.error(`check-delivery: ${message}\n${USAGE}`);
  process.exit(2);
}

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i];
  if (key === "--frozen-only") {
    args["frozen-only"] = true;
    continue;
  }
  if (!["--plan", "--report", "--head"].includes(key))
    usage(`unknown argument ${key}`);
  if (i + 1 >= argv.length) usage(`missing value for ${key}`);
  args[key.slice(2)] = argv[(i += 1)];
}
if (!args.plan) usage("--plan is required");
if (!args["frozen-only"] && !args.report)
  usage("--report is required unless --frozen-only");
if (args["frozen-only"] && (args.report || args.head))
  usage("--frozen-only takes only --plan");
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

// 1. Frozen inputs: `- spec: spec.md sha256=<hex>`, paths relative to plan.md.
const frozen = new Map();
for (const m of plan.matchAll(
  /^\s*-\s*(spec|verify):\s*`?([^\s`]+)`?\s+sha256=([0-9a-f]{64})\s*$/gm,
))
  frozen.set(m[1], { file: path.resolve(planDir, m[2]), hash: m[3] });

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
if (args["frozen-only"]) finish("spec and verify match the frozen hashes");

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
const reportHead = report.match(/^head:[ \t]*([0-9a-f]{40})[ \t]*$/m)?.[1];
if (!reportHead) errors.push("report has no `head: <40-hex SHA>` line");
else if (reportHead !== head)
  errors.push(
    `report verifies ${reportHead.slice(0, 12)}, but the MR head is ${head.slice(0, 12)}`,
  );

// 3. Every scenario has a row; none FAIL; the report names its model.
const verify = frozen.has("verify") && existsSync(frozen.get("verify").file)
  ? readFileSync(frozen.get("verify").file, "utf8")
  : "";
const scenarios = [...new Set(verify.match(/\bS\d{2,}\b/g) ?? [])].sort();
if (verify && scenarios.length === 0)
  errors.push("verify.md has no scenario IDs (S01, S02, ...)");

const rows = new Map();
for (const m of report.matchAll(
  /^\|[ \t]*(S\d{2,})[ \t]*\|[ \t]*(PASS|FAIL|UNVERIFIED)[ \t]*\|[^|\n]*\|[^|\n]*\|[ \t]*$/gm,
)) {
  if (!rows.has(m[1])) rows.set(m[1], new Set());
  rows.get(m[1]).add(m[2]);
}
for (const id of scenarios) {
  const results = rows.get(id);
  if (!results) errors.push(`${id} has no row in the report`);
  else if (results.has("FAIL")) errors.push(`${id} is FAIL`);
  else if (results.has("UNVERIFIED")) notes.push(`${id} is UNVERIFIED`);
}
for (const id of rows.keys())
  if (verify && !scenarios.includes(id))
    notes.push(`${id} is in the report but not in verify.md`);
if (!/^验证模型[:：][ \t]*\S[^\n]*$/m.test(report))
  errors.push("report has no `验证模型：` line with a value");
for (const section of ["冒烟集与回归范围", "代码问题"])
  if (!report.includes(section))
    errors.push(`report has no \`${section}\` section (it may be truncated)`);

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
  if (record.head !== head)
    errors.push(`run record head ${String(record.head).slice(0, 12)} is not the MR head ${head.slice(0, 12)}`);
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

finish(
  `spec and verify unchanged; report head ${head.slice(0, 12)}; ` +
    `${scenarios.length} scenarios, ${notes.filter((n) => n.endsWith("UNVERIFIED")).length} UNVERIFIED; ` +
    `verifier ${record?.family}/${record?.model} session ${record?.session_id}`,
);
