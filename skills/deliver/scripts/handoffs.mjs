// Handoff commits: the commits core-spec makes when the user confirms spec.md
// and verify.md, ending with two trailers printed by `freeze.mjs --trailers`:
//
//   Frozen-Spec: <path in repo> sha256=<hex>
//   Frozen-Verify: <path in repo> sha256=<hex>
//
// Read as read-handoff.mjs reads them: git's own trailer parsing, each trailer
// exactly once, the value "<path> sha256=<64 hex>" on one line. Paths are
// normalized, so ./specs/verify.md and specs/verify.md are the same file.
// Shared by milestones.mjs, check-delivery.mjs and run-verifier.mjs.
import path from "node:path";

const TRAILERS =
  "%(trailers:key=Frozen-Spec,valueonly,separator=%x1d)%x1f%(trailers:key=Frozen-Verify,valueonly,separator=%x1d)";

function parseValue(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("\x1d")) return null;
  const m = trimmed.match(/^(.+?)\s+sha256=([0-9a-f]{64})$/);
  return m ? { file: path.posix.normalize(m[1]), hash: m[2] } : null;
}

function parseRecord(text) {
  const [spec = "", verify = ""] = text.split("\x1f");
  const parsed = { spec: parseValue(spec), verify: parseValue(verify) };
  return parsed.spec && parsed.verify ? parsed : null;
}

// { spec: { file, hash }, verify: { file, hash } } for a handoff commit, else null.
export function frozenTrailers(git, commit) {
  return parseRecord(git("log", "-1", `--format=${TRAILERS}`, commit));
}

function handoffLog(git, args) {
  const out = git("log", "--first-parent", "--reverse", `--format=%H%x1f${TRAILERS}%x1e`, ...args);
  const found = [];
  for (const record of out.split("\x1e")) {
    const text = record.replace(/^\n/, "");
    const at = text.indexOf("\x1f");
    if (at < 0) continue;
    const parsed = parseRecord(text.slice(at + 1));
    if (parsed) found.push({ commit: text.slice(0, at).trim(), ...parsed });
  }
  return found;
}

// Handoff commits on the requirement branch, oldest first: the first-parent
// line after the base branch, as read-handoff.mjs searches it.
export function branchHandoffs(git, baseRef, head) {
  return handoffLog(git, [`${baseRef}..${head}`]);
}

// Handoff commits for one verify.md (its path in the repository), oldest
// first, along HEAD's first-parent line. For callers that do not know the
// base branch: another requirement's handoffs name another verify.md.
export function handoffsFor(git, head, verifyFile) {
  const file = path.posix.normalize(verifyFile);
  return handoffLog(git, [head, "--", file]).filter((h) => h.verify.file === file);
}
