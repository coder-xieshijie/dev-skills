#!/usr/bin/env node
// Delivery gate for the deliver Skill. Run it on the MR's actual head before
// calling the MR mergeable, and again before merging:
//
//   node check-delivery.mjs --plan <plan.md> --report <report.md> [--head <sha>]
//
// 1. spec and verify still match the sha256 recorded under plan.md's frozen
//    inputs, so no scenario was made to pass by editing the acceptance docs.
// 2. The verification report names the same head as the MR. Without --head,
//    the HEAD of the git repository that contains plan.md is used.
// 3. Every scenario ID in verify.md (S01, S02, ...) has a row in the report,
//    and no row is FAIL. UNVERIFIED rows pass the gate but are listed, because
//    the MR must declare them.
//
// Exit 0 when every check passes, 1 when any fails, 2 on usage errors.
// Zero dependencies.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const USAGE =
  "usage: check-delivery.mjs --plan <plan.md> --report <report.md> [--head <sha>]";

function usage(message) {
  console.error(`check-delivery: ${message}\n${USAGE}`);
  process.exit(2);
}

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i];
  if (!["--plan", "--report", "--head"].includes(key))
    usage(`unknown argument ${key}`);
  if (i + 1 >= argv.length) usage(`missing value for ${key}`);
  args[key.slice(2)] = argv[(i += 1)];
}
if (!args.plan || !args.report) usage("--plan and --report are required");
for (const key of ["plan", "report"])
  if (!existsSync(args[key])) usage(`${key} file not found: ${args[key]}`);

const planPath = path.resolve(args.plan);
const planDir = path.dirname(planPath);
const plan = readFileSync(planPath, "utf8");
const report = readFileSync(path.resolve(args.report), "utf8");
const sha256 = (file) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

const errors = [];
const notes = [];

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
  const actual = sha256(entry.file);
  if (actual !== entry.hash)
    errors.push(
      `${kind} changed since it was frozen: ${entry.file} ` +
        `(recorded ${entry.hash.slice(0, 12)}, now ${actual.slice(0, 12)})`,
    );
}

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
const reportHead = report.match(/^head:\s*([0-9a-f]{40})\s*$/m)?.[1];
if (!reportHead) errors.push("report has no `head: <40-hex SHA>` line");
else if (reportHead !== head)
  errors.push(
    `report verifies ${reportHead.slice(0, 12)}, but the MR head is ${head.slice(0, 12)}`,
  );

// 3. Every scenario has a row; none FAIL.
const verify = frozen.has("verify") && existsSync(frozen.get("verify").file)
  ? readFileSync(frozen.get("verify").file, "utf8")
  : "";
const scenarios = [...new Set(verify.match(/\bS\d{2,}\b/g) ?? [])].sort();
if (verify && scenarios.length === 0)
  errors.push("verify.md has no scenario IDs (S01, S02, ...)");

const rows = new Map();
for (const m of report.matchAll(
  /^\|\s*(S\d{2,})\s*\|\s*(PASS|FAIL|UNVERIFIED)\s*\|/gm,
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

for (const note of notes) console.log(`  note: ${note}`);
if (errors.length) {
  console.error(`check-delivery: ${errors.length} problem(s)`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(
  `check-delivery: OK (spec and verify unchanged; report head ${head.slice(0, 12)}; ` +
    `${scenarios.length} scenarios, ${notes.filter((n) => n.endsWith("UNVERIFIED")).length} UNVERIFIED)`,
);
