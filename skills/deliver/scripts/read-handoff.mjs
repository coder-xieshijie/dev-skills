#!/usr/bin/env node
// Read the frozen inputs from a handoff commit, for the deliver Skill.
//
//   node read-handoff.mjs --repo <worktree> --base <target ref> [--mr <MR/PR URL>]
//                         [--expect-spec <sha256>] [--expect-verify <sha256>]
//
// Run it in the worktree where the requirement branch is checked out. <target
// ref> is the MR's target branch as fetched locally, e.g. origin/main.
//
// core-spec step 9 commits spec.md and verify.md on the requirement branch and
// ends that commit message with two trailers printed by `freeze.mjs --trailers`:
//
//   Frozen-Spec: <path in repo> sha256=<hex>
//   Frozen-Verify: <path in repo> sha256=<hex>
//
// Only the MR's own commits count: the first-parent line of <base>..HEAD, so a
// handoff inherited from the target branch or merged in from elsewhere is
// never picked. The newest commit there whose trailer block (git's own trailer
// parsing, so example lines in the body do not count) has both trailers is the
// handoff commit; a later re-confirmation adds a newer one, which then wins. A
// commit with only one of them, or with either one twice, is an error. Checks:
//
// 1. At the handoff commit, each file's sha256 equals the value in its trailer.
// 2. No commit after the handoff commit, up to HEAD, touches either file.
// 3. The files have no staged, unstaged or conflicted change, and the files in
//    the worktree still have those hashes.
// 4. When the user gave --expect-spec / --expect-verify, they match; the
//    user's values take precedence over what the branch records.
//
// On success it prints the frozen-input lines for plan.md: spec and verify
// with absolute paths in backticks, and the handoff line with the commit's
// author and date.
//
// Exit 0 when every check passes, 1 when any fails or no handoff commit is
// found, 2 on usage errors. Zero dependencies.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const USAGE =
  "usage: read-handoff.mjs --repo <worktree> --base <target ref> [--mr <MR/PR URL>]\n" +
  "                        [--expect-spec <sha256>] [--expect-verify <sha256>]";

function usage(message) {
  console.error(`read-handoff: ${message}\n${USAGE}`);
  process.exit(2);
}

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i];
  if (!["--repo", "--base", "--mr", "--expect-spec", "--expect-verify"].includes(key))
    usage(`unknown argument ${key}`);
  if (i + 1 >= argv.length) usage(`missing value for ${key}`);
  args[key.slice(2)] = argv[(i += 1)];
}
if (!args.repo) usage("--repo is required");
if (!args.base) usage("--base is required (the MR's target branch, e.g. origin/main)");
if (!existsSync(args.repo)) usage(`repo not found: ${args.repo}`);
for (const key of ["expect-spec", "expect-verify"])
  if (args[key] !== undefined && !/^[0-9a-f]{64}$/.test(args[key]))
    usage(`--${key} must be a 64-hex sha256`);

const git = (gitArgs, options = {}) =>
  execFileSync("git", ["-C", args.repo, ...gitArgs], {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
    ...options,
  });
const gitText = (gitArgs) => git(gitArgs, { encoding: "utf8" }).trim();
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

let root;
let head;
let base;
try {
  root = gitText(["rev-parse", "--show-toplevel"]);
  head = gitText(["rev-parse", "--verify", "HEAD^{commit}"]);
} catch {
  usage(`not a git worktree with a commit: ${args.repo}`);
}
try {
  base = gitText(["rev-parse", "--verify", `${args.base}^{commit}`]);
} catch {
  usage(`--base not found: ${args.base}; fetch the MR's target branch first`);
}

// Newest first along the MR's own line. Fields \x1f, records \x1e, repeated
// trailer values \x1d.
const FORMAT =
  "%H%x1f%an%x1f%aI%x1f" +
  "%(trailers:key=Frozen-Spec,valueonly,separator=%x1d)%x1f" +
  "%(trailers:key=Frozen-Verify,valueonly,separator=%x1d)%x1e";
const log = gitText(["log", "--first-parent", `--format=${FORMAT}`, `${base}..${head}`]);
const VALUE = /^(.+?)\s+sha256=([0-9a-f]{64})$/;
let handoff = null;
for (const record of log.split("\x1e")) {
  const [sha, author, date, specRaw = "", verifyRaw = ""] = record.replace(/^\n/, "").split("\x1f");
  if (!sha) continue;
  const values = { spec: specRaw.trim(), verify: verifyRaw.trim() };
  if (!values.spec && !values.verify) continue;
  const parsed = {};
  const problems = [];
  for (const kind of ["spec", "verify"]) {
    const name = kind === "spec" ? "Frozen-Spec" : "Frozen-Verify";
    if (!values[kind]) problems.push(`no ${name} trailer`);
    else if (values[kind].includes("\x1d")) problems.push(`${name} appears more than once`);
    else {
      const m = values[kind].match(VALUE);
      if (!m) problems.push(`${name} is not "<path> sha256=<64 hex>": ${values[kind]}`);
      else parsed[kind] = { file: m[1], hash: m[2] };
    }
  }
  if (problems.length) {
    console.error(`read-handoff: commit ${sha.slice(0, 12)} has an incomplete handoff record`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  handoff = { sha, author, date, ...parsed };
  break;
}
if (!handoff) {
  console.error(
    `read-handoff: no handoff commit in ${base.slice(0, 12)}..${head.slice(0, 12)} ` +
      "(no commit of this MR ends with both Frozen-Spec and Frozen-Verify trailers); " +
      "ask the user for the confirmed sha256",
  );
  process.exit(1);
}

const errors = [];
for (const kind of ["spec", "verify"]) {
  const { file, hash } = handoff[kind];
  if (path.isAbsolute(file) || file.split("/").includes(".."))
    errors.push(`${kind} path must be relative to the repository: ${file}`);
  // 1. The committed file matches the recorded hash.
  let committed;
  try {
    committed = git(["show", `${handoff.sha}:${file}`]);
  } catch {
    errors.push(`${kind} file ${file} is not in handoff commit ${handoff.sha.slice(0, 12)}`);
    continue;
  }
  if (sha256(committed) !== hash)
    errors.push(
      `${kind} in handoff commit ${handoff.sha.slice(0, 12)} does not match its trailer ` +
        `(trailer ${hash.slice(0, 12)}, file ${sha256(committed).slice(0, 12)})`,
    );
  // 3. The worktree file is unchanged.
  const worktreeFile = path.join(root, file);
  if (!existsSync(worktreeFile)) errors.push(`${kind} file missing in the worktree: ${worktreeFile}`);
  else if (sha256(readFileSync(worktreeFile)) !== hash)
    errors.push(`${kind} in the worktree differs from the handoff commit: ${worktreeFile}`);
  // 4. The user's hash, when given, takes precedence.
  const expected = args[`expect-${kind}`];
  if (expected && expected !== hash)
    errors.push(
      `${kind} sha256 the user gave (${expected.slice(0, 12)}) differs from the handoff commit ` +
        `(${hash.slice(0, 12)}); stop and ask the user`,
    );
}

// 3. Also no staged, unstaged or conflicted change to either file.
const dirty = gitText([
  "status",
  "--porcelain=v1",
  "--untracked-files=no",
  "--",
  handoff.spec.file,
  handoff.verify.file,
]);
if (dirty)
  errors.push(`spec or verify has uncommitted or staged changes:\n    ${dirty.split("\n").join("\n    ")}`);

// 2. Nothing after the handoff commit touches the two files.
const later = gitText([
  "log",
  "--format=%h %s",
  `${handoff.sha}..${head}`,
  "--",
  handoff.spec.file,
  handoff.verify.file,
]);
if (later)
  errors.push(
    `commits after the handoff commit change spec or verify without a new handoff:\n    ${later.split("\n").join("\n    ")}`,
  );

if (errors.length) {
  console.error(`read-handoff: ${errors.length} problem(s)`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

let branch = "";
try {
  branch = gitText(["rev-parse", "--abbrev-ref", "HEAD"]);
} catch {
  branch = "";
}
if (!branch || branch === "HEAD") branch = "<需求分支>";
console.log(`- spec: \`${path.join(root, handoff.spec.file)}\` sha256=${handoff.spec.hash}`);
console.log(`- verify: \`${path.join(root, handoff.verify.file)}\` sha256=${handoff.verify.hash}`);
console.log(
  `- 交接: ${args.mr ?? "<MR/PR 链接>"} ${branch} @ ${handoff.sha}（${handoff.author}，${handoff.date}）`,
);
