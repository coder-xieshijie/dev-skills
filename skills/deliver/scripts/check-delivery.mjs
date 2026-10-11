#!/usr/bin/env node
// Result check for the deliver Skill. It looks at results only, never at the
// order in which the work was done.
//
//   node check-delivery.mjs --repo <worktree> --base <target ref> --frozen
//   node check-delivery.mjs --repo <worktree> --base <target ref> --head <MR head>
//                           --plan <plan.md> --owner <model ID> --report <report.md> [--report <report.md> ...]
//
// <target ref> is the MR's target branch as fetched locally, e.g. origin/main.
//
// 1. spec and verify are the versions the user confirmed. The newest commit on
//    the MR's own line (first-parent <base>..head) whose trailers include
//    `Frozen-Spec: <path> sha256=<hex>` and `Frozen-Verify: <path> sha256=<hex>`
//    (core-spec, freeze.mjs --trailers) is the handoff; the two files at the
//    head must have those hashes. --frozen runs this check alone, on HEAD and
//    on the files in the worktree. When the files were handed over as local
//    paths instead, pass --spec <path>@<sha256> --verify <path>@<sha256>.
// 2. Each report's `head:` is the MR head, or an ancestor of it after which
//    only Markdown files, test files and files under plan.md's directory
//    (plan, evidence) changed; spec and verify themselves always count as
//    changes. The report's head must contain the latest handoff, so a report
//    made before the user re-confirmed spec and verify does not hold. A test
//    file is *.test.* / *.spec.*, anything under __tests__/, or under a test/,
//    tests/ or e2e/ directory at the repository root or at a package root (a
//    directory with its own package.json, pyproject.toml, go.mod or Cargo.toml).
// 3. Each report says `verdict: PASS`.
// 4. The model on each report's `verifier-model:` line is not of the family of
//    the owner model given with --owner. Without --owner, plan.md's
//    `- owner:` line is read instead (plans written before --owner existed). Reports written before that key
//    have a `验证模型：` or `验证模型:` line instead, read the same way.
//
// Several reports are allowed (verification split across sessions); each must
// pass 2-4. Whether they cover every scenario is the verifier's call.
// Exit 0 when every check passes, 1 when any fails, 2 on usage errors.
// Zero dependencies.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

const USAGE =
  "usage: check-delivery.mjs --repo <worktree> --base <target ref> --frozen\n" +
  "       check-delivery.mjs --repo <worktree> --base <target ref> --head <MR head>\n" +
  "                          --plan <plan.md> --owner <model ID> --report <report.md> [--report ...]\n" +
  "       (instead of --base: --spec <path>@<sha256> --verify <path>@<sha256>)";

function usage(message) {
  console.error(`check-delivery: ${message}\n${USAGE}`);
  process.exit(2);
}

const args = { report: [] };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i];
  if (key === "--frozen") {
    args.frozen = true;
    continue;
  }
  if (!["--repo", "--base", "--head", "--plan", "--owner", "--report", "--spec", "--verify"].includes(key))
    usage(`unknown argument ${key}`);
  if (i + 1 >= argv.length) usage(`missing value for ${key}`);
  const value = argv[(i += 1)];
  if (key === "--report") args.report.push(value);
  else args[key.slice(2)] = value;
}
const local = Boolean(args.spec || args.verify);
if (!args.repo) usage("--repo is required");
if (local && !(args.spec && args.verify)) usage("--spec and --verify go together");
if (!local && !args.base) usage("--base is required (the MR's target branch, e.g. origin/main)");
if (!args.frozen) {
  if (!args.head) usage("--head is required: the MR's head as the platform reports it");
  if (!args.plan) usage("--plan is required");
  if (!args.report.length) usage("give at least one --report");
}
for (const file of [args.repo, args.plan, ...args.report])
  if (file && !existsSync(file)) usage(`not found: ${file}`);

const run = (gitArgs, encoding) =>
  execFileSync("git", ["-C", args.repo, ...gitArgs], {
    encoding,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  });
const git = (...gitArgs) => run(gitArgs, "utf8").trim();
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
function commit(ref, name) {
  try {
    return git("rev-parse", "--verify", `${ref}^{commit}`);
  } catch {
    return usage(`${name} ${ref} is not a commit in ${args.repo}; fetch it first`);
  }
}

let root;
try {
  root = realpathSync(git("rev-parse", "--show-toplevel"));
} catch {
  usage(`not a git worktree: ${args.repo}`);
}
const head = args.frozen ? commit("HEAD", "HEAD") : commit(args.head, "--head");
const errors = [];
const notes = [];

// 1. The frozen files.
const kinds = ["spec", "verify"];
const frozenFiles = new Set();
let handoffSha = null;
if (local) {
  for (const kind of kinds) {
    const m = args[kind].match(/^(.+)@([0-9a-f]{64})$/);
    if (!m) usage(`--${kind} must be <path>@<sha256>`);
    if (existsSync(m[1])) frozenFiles.add(path.relative(root, realpathSync(m[1])).split(path.sep).join("/"));
    if (!existsSync(m[1])) errors.push(`${kind} not found: ${m[1]}`);
    else if (sha256(readFileSync(m[1])) !== m[2]) errors.push(`${kind} is not the version the user confirmed: ${m[1]}`);
  }
} else {
  const base = commit(args.base, "--base");
  const TRAILER = (key) => `%(trailers:key=${key},valueonly,separator=%x1d)`;
  const log = git("log", "--first-parent", `--format=%H%x1f${TRAILER("Frozen-Spec")}%x1f${TRAILER("Frozen-Verify")}%x1e`, `${base}..${head}`);
  let handoff = null;
  for (const record of log.split("\x1e")) {
    const [sha, ...values] = record.replace(/^\n/, "").split("\x1f");
    if (!sha || values.every((v) => !v?.trim())) continue;
    handoff = { sha };
    kinds.forEach((kind, i) => {
      const m = values[i]?.trim().match(/^([^\x1d]+?)\s+sha256=([0-9a-f]{64})$/);
      if (!m) errors.push(`handoff ${sha.slice(0, 12)}: the ${kind} trailer is missing, repeated or not "<path> sha256=<64 hex>"`);
      else if (path.isAbsolute(m[1]) || m[1].split("/").includes("..")) errors.push(`handoff ${sha.slice(0, 12)}: ${kind} path must be inside the repository: ${m[1]}`);
      else {
        handoff[kind] = { file: path.posix.normalize(m[1]), hash: m[2] };
        frozenFiles.add(handoff[kind].file);
      }
    });
    handoffSha = sha;
    break;
  }
  if (!handoff)
    errors.push(`no handoff commit in ${base.slice(0, 12)}..${head.slice(0, 12)} (none ends with Frozen-Spec and Frozen-Verify trailers)`);
  for (const kind of kinds) {
    const want = handoff?.[kind];
    if (!want) continue;
    let blob = null;
    try {
      blob = run(["show", `${head}:${want.file}`]);
    } catch {}
    const fix = `; restore it with: git checkout ${handoff.sha.slice(0, 12)} -- ${want.file}`;
    if (!blob) errors.push(`${kind} ${want.file} is missing at ${head.slice(0, 12)}${fix}`);
    else if (sha256(blob) !== want.hash) errors.push(`${kind} ${want.file} at ${head.slice(0, 12)} is not the version confirmed in handoff ${handoff.sha.slice(0, 12)}${fix}`);
    else if (args.frozen) {
      const worktreeFile = path.join(root, want.file);
      if (!existsSync(worktreeFile) || sha256(readFileSync(worktreeFile)) !== want.hash)
        errors.push(`${kind} ${want.file} has uncommitted changes${fix}`);
    }
  }
  if (handoff?.spec && handoff?.verify) notes.push(`handoff ${handoff.sha.slice(0, 12)}: ${handoff.spec.file}, ${handoff.verify.file}`);
}

// 2-4. The verification reports.
function isAncestor(a, b) {
  try {
    git("merge-base", "--is-ancestor", a, b);
    return true;
  } catch {
    return false;
  }
}
function familyOf(token) {
  const id = token.toLowerCase().split("/").pop();
  if (/^(claude|anthropic)/.test(id)) return "anthropic";
  if (/^(gpt|o\d|codex|openai)/.test(id)) return "openai";
  if (/^(minimax|abab)/.test(id)) return "minimax";
  if (/^gemini/.test(id)) return "google";
  return null;
}
function familyIn(text) {
  const found = [...new Set(text.split(/[\s,;:=()`'"，；：（）]+/).map(familyOf).filter(Boolean))];
  if (found.length === 1) return { family: found[0] };
  return { problem: found.length ? `names more than one model family (${found.join(", ")})` : `names no model ID: "${text.trim()}"` };
}

if (!args.frozen) {
  const plan = readFileSync(args.plan, "utf8");
  const ownerLine = plan.match(/^[ \t]*-[ \t]*owner:(.*)$/m)?.[1];
  let owner;
  if (args.owner !== undefined) {
    owner = familyIn(args.owner);
    if (owner.problem) errors.push(`--owner ${owner.problem}`);
  } else {
    owner = ownerLine === undefined ? { problem: "no owner: give --owner <your model ID>" } : familyIn(ownerLine);
    if (owner.problem) errors.push(ownerLine === undefined ? owner.problem : `plan.md owner line ${owner.problem}`);
  }
  const planDir = path.relative(root, realpathSync(path.dirname(args.plan))).split(path.sep).join("/");
  const inPlanDir = (f) => planDir && !planDir.startsWith("..") && f.startsWith(`${planDir}/`);
  const MANIFESTS = ["package.json", "pyproject.toml", "go.mod", "Cargo.toml"];
  const isPackageRoot = (dir) =>
    MANIFESTS.some((m) => {
      try {
        git("cat-file", "-e", `${head}:${dir}/${m}`);
        return true;
      } catch {
        return false;
      }
    });
  const isTest = (f) => {
    const dirs = f.split("/").slice(0, -1);
    if (/\.(test|spec)\.[^./]+$/.test(f) || dirs.includes("__tests__")) return true;
    return dirs.some((d, i) => ["test", "tests", "e2e"].includes(d) && (i === 0 || isPackageRoot(dirs.slice(0, i).join("/"))));
  };
  const notCode = (f) => !frozenFiles.has(f) && (/\.md$/i.test(f) || isTest(f) || inPlanDir(f));

  for (const file of args.report) {
    const text = readFileSync(file, "utf8");
    const name = path.basename(file);
    const verified = text.match(/^head:[ \t]*([0-9a-f]{40})[ \t]*$/m)?.[1];
    if (!verified) errors.push(`${name}: no \`head: <40-hex SHA>\` line`);
    else if (handoffSha && !isAncestor(handoffSha, verified))
      errors.push(`${name}: verified ${verified.slice(0, 12)}, which does not contain the latest handoff ${handoffSha.slice(0, 12)}; verify again against the confirmed spec and verify`);
    else if (verified !== head) {
      const ancestor = isAncestor(verified, head);
      const code = ancestor ? git("diff", "-z", "--name-only", "--no-renames", verified, head).split("\0").filter((f) => f && !notCode(f)) : [];
      if (!ancestor) errors.push(`${name}: verified ${verified.slice(0, 12)}, which is not an ancestor of the MR head ${head.slice(0, 12)}; verify the MR head`);
      else if (code.length)
        errors.push(`${name}: verified ${verified.slice(0, 12)}; code changed since (${code.slice(0, 5).join(", ")}${code.length > 5 ? ", ..." : ""}); verify the MR head`);
      else notes.push(`${name}: verified ${verified.slice(0, 12)}; since then only docs, tests, plan or evidence changed`);
    }
    const verdict = text.match(/^verdict:[ \t]*(\S+)/m)?.[1];
    if (verdict !== "PASS") errors.push(`${name}: verdict is ${verdict ?? "missing"}, not PASS`);
    const modelLine = text.match(/^(?:verifier-model:|验证模型[:：])(.*)$/m)?.[1];
    const verifier = modelLine === undefined ? { problem: "has no `verifier-model: <model ID>` line" } : familyIn(modelLine);
    if (verifier.problem) errors.push(`${name}: ${verifier.problem}`);
    else if (owner.family === verifier.family)
      errors.push(`${name}: the verifier is ${verifier.family}, the same family as the owner; verify with another family`);
    else if (owner.family) notes.push(`${name}: verifier ${verifier.family}, owner ${owner.family}`);
  }
}

for (const note of notes) console.log(`  ${note}`);
if (errors.length) {
  console.error(`check-delivery: ${errors.length} problem(s)`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(`check-delivery: OK at ${head.slice(0, 12)}${args.frozen ? " (frozen files only)" : ""}`);
