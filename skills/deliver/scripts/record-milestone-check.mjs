#!/usr/bin/env node
// Save a milestone check's report for the deliver Skill.
//
//   node record-milestone-check.mjs --plan <plan.md> --milestone <M1> --range <from>..<to>
//                                   --report <report file, or - for stdin> [--repo <worktree>]
//
// Writes evidence/milestone-<ID>-r<round>.md next to plan.md: a header with
// the milestone, the round (counted from existing records), the checked range
// as full SHAs, the time of saving and the report's sha256, then the report
// verbatim. check-delivery.mjs reads these records; see milestones.mjs for
// what it enforces.
//
// --range is the commits the check looked at, `from` exclusive, as passed to
// the milestone check. Both ends must resolve, `from` must be an ancestor of
// `to`, the range must not be empty, and `to` must be on the current HEAD of
// the code repository (--repo, else the repository holding spec.md).
//
// Exit 0 when saved, 1 when the range or milestone is rejected, 2 on usage
// errors. Zero dependencies.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { codeRepo, gitIn, milestoneIds, readRecords, recordName, sha256 } from "./milestones.mjs";

const USAGE =
  "usage: record-milestone-check.mjs --plan <plan.md> --milestone <M1> --range <from>..<to> " +
  "--report <file|-> [--repo <worktree>]";

function fail(code, message) {
  console.error(`record-milestone-check: ${message}`);
  if (code === 2) console.error(USAGE);
  process.exit(code);
}

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i].replace(/^--/, "");
  if (!argv[i].startsWith("--") || !["plan", "milestone", "range", "report", "repo"].includes(key))
    fail(2, `unknown argument ${argv[i]}`);
  if (i + 1 >= argv.length) fail(2, `missing value for --${key}`);
  args[key] = argv[(i += 1)];
}
for (const key of ["plan", "milestone", "range", "report"]) if (!args[key]) fail(2, `--${key} is required`);
if (!existsSync(args.plan)) fail(2, `plan not found: ${args.plan}`);
if (!/^M\d+$/.test(args.milestone)) fail(2, `--milestone must look like M1: ${args.milestone}`);
const range = args.range.match(/^([^.\s]+)\.\.([^.\s]+)$/);
if (!range) fail(2, `--range must be <from>..<to>: ${args.range}`);

const planPath = path.resolve(args.plan);
const planDir = path.dirname(planPath);
const plan = readFileSync(planPath, "utf8");
const ids = milestoneIds(plan);
if (ids.length === 0)
  fail(1, "plan.md lists no milestone IDs under 里程碑: start each milestone's paragraph with its ID (M1, M2, ...)");
if (!ids.includes(args.milestone)) fail(1, `${args.milestone} is not one of plan.md's milestones (${ids.join(", ")})`);

const repo = codeRepo(plan, planDir, args.repo);
if (!repo) fail(1, "cannot find the code repository: pass --repo <worktree with the requirement branch>");
const git = gitIn(repo);
const resolve = (ref) => {
  try {
    return git("rev-parse", "--verify", `${ref}^{commit}`);
  } catch {
    return fail(1, `cannot resolve ${ref} in ${repo}`);
  }
};
const from = resolve(range[1]);
const to = resolve(range[2]);
const isAncestor = (a, b) => {
  try {
    git("merge-base", "--is-ancestor", a, b);
    return true;
  } catch {
    return false;
  }
};
if (!isAncestor(from, to)) fail(1, `${from.slice(0, 12)} is not an ancestor of ${to.slice(0, 12)}`);
if (from === to) fail(1, "the range is empty");
if (!isAncestor(to, "HEAD")) fail(1, `${to.slice(0, 12)} is not on the current HEAD of ${repo}`);

const body = args.report === "-" ? readFileSync(0, "utf8") : readFileSync(args.report, "utf8");
if (!body.trim()) fail(1, "the report is empty");

const evidence = path.join(planDir, "evidence");
mkdirSync(evidence, { recursive: true });
const round = readRecords(evidence).filter((r) => r.milestone === args.milestone).length + 1;
const file = path.join(evidence, recordName(args.milestone, round));
if (existsSync(file)) fail(1, `${file} already exists`);
const recordedAt = new Date().toISOString();
const header = [
  "---",
  `milestone: ${args.milestone}`,
  `round: ${round}`,
  `range: ${from}..${to}`,
  `recorded_at: ${recordedAt}`,
  `body_sha256: ${sha256(body)}`,
  "---",
  "",
].join("\n");
writeFileSync(file, header + body);
console.log(`record-milestone-check: saved ${args.milestone} round ${round} (${from.slice(0, 12)}..${to.slice(0, 12)}) at ${recordedAt} -> ${file}`);
