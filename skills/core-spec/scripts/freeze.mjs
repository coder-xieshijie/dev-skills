#!/usr/bin/env node
// Freeze check for the core-spec Skill. Run it right before asking the user to
// confirm spec.md and verify.md:
//
//   node freeze.mjs --spec <spec.md> --verify <verify.md> [--trailers]
//
// It prints both files' sha256 as the frozen-input lines deliver's plan.md
// uses, and checks the spec sha256 that verify.md records: every sha256 on a
// line of verify.md that mentions "spec" must equal the spec as it is now, and
// there must be at least one, so the user confirms a matching pair.
//
// With --trailers, once the pair matches it also prints the two lines that
// end the handoff commit message (core-spec step 9), with paths relative to
// the git repository that holds the files:
//
//   Frozen-Spec: <path in repo> sha256=<hex>
//   Frozen-Verify: <path in repo> sha256=<hex>
//
// deliver's read-handoff.mjs reads the confirmed hashes from these lines.
//
// Exit 0 when the pair matches, 1 when it does not, 2 on usage errors.
// Zero dependencies.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

const USAGE = "usage: freeze.mjs --spec <spec.md> --verify <verify.md> [--trailers]";

function usage(message) {
  console.error(`freeze: ${message}\n${USAGE}`);
  process.exit(2);
}

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i];
  if (key === "--trailers") {
    args.trailers = true;
    continue;
  }
  if (!["--spec", "--verify"].includes(key)) usage(`unknown argument ${key}`);
  if (i + 1 >= argv.length) usage(`missing value for ${key}`);
  args[key.slice(2)] = argv[(i += 1)];
}
if (!args.spec || !args.verify) usage("--spec and --verify are required");
for (const key of ["spec", "verify"])
  if (!existsSync(args[key])) usage(`${key} file not found: ${args[key]}`);

const specPath = path.resolve(args.spec);
const verifyPath = path.resolve(args.verify);
const sha256 = (file) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
const specHash = sha256(specPath);
const verifyHash = sha256(verifyPath);

// Paths relative to the spec's directory, which is where plan.md lives.
const base = path.dirname(specPath);
console.log(`- spec: ${path.relative(base, specPath)} sha256=${specHash}`);
console.log(`- verify: ${path.relative(base, verifyPath)} sha256=${verifyHash}`);

const recorded = [
  ...new Set(
    readFileSync(verifyPath, "utf8")
      .split("\n")
      .filter((line) => /spec/i.test(line))
      .flatMap((line) => line.match(/\b[0-9a-f]{64}\b/g) ?? []),
  ),
];
const stale = recorded.filter((h) => h !== specHash);
if (recorded.length > 0 && stale.length === 0) {
  let trailers = [];
  if (args.trailers) {
    const repoPath = (file) => {
      let root;
      try {
        root = execFileSync("git", ["-C", path.dirname(file), "rev-parse", "--show-toplevel"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();
      } catch {
        usage(`--trailers needs the files inside a git repository: ${file}`);
      }
      root = realpathSync(root);
      const relative = path.relative(root, realpathSync(file)).split(path.sep).join("/");
      if (relative.startsWith("..")) usage(`file is outside its repository: ${file}`);
      return { root, relative };
    };
    const spec = repoPath(specPath);
    const verify = repoPath(verifyPath);
    if (spec.root !== verify.root)
      usage(
        `--trailers needs spec and verify in the same repository (${spec.root} vs ${verify.root}); ` +
          "hand off local paths instead",
      );
    trailers = [
      `Frozen-Spec: ${spec.relative} sha256=${specHash}`,
      `Frozen-Verify: ${verify.relative} sha256=${verifyHash}`,
    ];
  }
  console.log("freeze: OK (verify.md records the current spec sha256)");
  for (const line of trailers) console.log(line);
  process.exit(0);
}
console.error(
  recorded.length === 0
    ? "freeze: verify.md has no spec sha256 on a line that mentions spec; add it to the source section"
    : `freeze: verify.md records spec sha256 ${stale.map((h) => h.slice(0, 12)).join(", ")}, ` +
        `but the spec is now ${specHash.slice(0, 12)}; update verify.md's source and rerun`,
);
process.exit(1);
