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

// The handoffs of one requirement on the branch, oldest first. Start from the
// newest handoff naming one of `current` (the frozen files' paths in the
// repository; without them, the newest handoff) and go back through handoffs
// that share a spec or verify path with the ones already taken, so a moved
// file keeps its history and another requirement's handoff on the same branch
// is left out.
export function requirementHandoffs(git, baseRef, head, current = {}) {
  const all = branchHandoffs(git, baseRef, head);
  const wanted = [current.spec, current.verify].filter(Boolean).map((f) => path.posix.normalize(f));
  let at = all.length - 1;
  if (wanted.length) while (at >= 0 && !wanted.includes(all[at].spec.file) && !wanted.includes(all[at].verify.file)) at -= 1;
  if (at < 0) return [];
  const chain = [all[at]];
  const paths = new Set([all[at].spec.file, all[at].verify.file]);
  for (let i = at - 1; i >= 0; i -= 1)
    if (paths.has(all[i].spec.file) || paths.has(all[i].verify.file)) {
      chain.unshift(all[i]);
      paths.add(all[i].spec.file).add(all[i].verify.file);
    }
  return chain;
}
