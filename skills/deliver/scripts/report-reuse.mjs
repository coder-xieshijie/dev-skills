// Whether a verification report for an earlier head still holds for the MR
// head, shared by check-delivery.mjs.
//
// Following Lauren Tan's patch-id rule in pstack (playbooks/shipping.md), a
// verdict stays valid when the only changes since the verified head are
// tests, docs or lint configuration; anything else is verified again on the
// new head. Unlike pstack, no build comparison is made: the deliver Skill
// already requires the quality commands and CI to pass on the final head.
import { gitIn } from "./milestones.mjs";

const LINT_CONFIG =
  /^(\.(eslintrc|eslintignore|prettierrc|prettierignore|stylelintrc|markdownlint|editorconfig)|(eslint|prettier|stylelint|oxlint)\.config\.|biome\.jsonc?$|\.oxlintrc)/i;

// Tests, docs and lint configuration by path.
export function isNoise(file) {
  const parts = file.split("/");
  const name = parts.at(-1);
  if (parts.some((p) => ["test", "tests", "__tests__", "e2e"].includes(p))) return "test";
  if (/\.(test|spec)\.[^.]+$/.test(name)) return "test";
  if (parts.slice(0, -1).includes("docs")) return "docs";
  if (parts.length === 1 && /\.md$/i.test(name)) return "docs";
  if (LINT_CONFIG.test(name)) return "lint config";
  return null;
}

// Returns { ok, files: [{ file, kind }], problem }.
export function reuseCheck({ repo, verifiedHead, head }) {
  const git = gitIn(repo);
  try {
    git("merge-base", "--is-ancestor", verifiedHead, head);
  } catch {
    return {
      ok: false,
      files: [],
      problem: `the report's head ${verifiedHead.slice(0, 12)} is not an ancestor of the MR head ${head.slice(0, 12)}; verify the MR head`,
    };
  }
  const files = git("diff", "--name-only", verifiedHead, head)
    .split("\n")
    .filter(Boolean)
    .map((file) => ({ file, kind: isNoise(file) }));
  const other = files.filter((f) => !f.kind);
  if (other.length)
    return {
      ok: false,
      files,
      problem:
        `the report is for ${verifiedHead.slice(0, 12)}, and ${other.length} file(s) other than tests, docs or lint config ` +
        `changed since then (${other.slice(0, 5).map((f) => f.file).join(", ")}${other.length > 5 ? ", ..." : ""}); ` +
        "verify the MR head again",
    };
  return { ok: true, files, problem: null };
}
