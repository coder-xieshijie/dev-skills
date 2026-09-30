// Whether a verification report for an earlier head still holds for the MR
// head, shared by check-delivery.mjs.
//
// Following Lauren Tan's patch-id rule in pstack (playbooks/shipping.md), a
// verdict stays valid when the only changes since the verified head are
// tests, docs or lint configuration; anything else is verified again on the
// new head. Unlike pstack, no build comparison is made: the deliver Skill
// already requires the quality commands and CI to pass on the final head.
//
// A path counts as a test or doc only where that is unambiguous; anything
// else, including the frozen spec.md and verify.md, needs a new verification:
// - test: a *.test.* / *.spec.* file, anything under __tests__/, or under a
//   test/, tests/ or e2e/ directory that sits at the repository root or at a
//   package root (a directory with its own manifest such as package.json);
// - docs: a Markdown file at the repository root, or anything under a docs/
//   directory at the repository root, at a package root, or directly inside a
//   top-level dot directory (such as .harness/docs/);
// - lint config: ESLint, Prettier, Stylelint, Biome, Oxlint, markdownlint
//   and EditorConfig files.
// Renames are split into a deletion and an addition, so moving a production
// file into tests/ still counts the production path.
import { gitIn } from "./milestones.mjs";

const LINT_CONFIG =
  /^(\.(eslintrc|eslintignore|prettierrc|prettierignore|stylelintrc|markdownlint|editorconfig)|(eslint|prettier|stylelint|oxlint)\.config\.|biome\.jsonc?$|\.oxlintrc)/i;
const MANIFESTS = ["package.json", "pyproject.toml", "go.mod", "Cargo.toml", "pom.xml", "build.gradle", "build.gradle.kts"];

// isPackageRoot(dir) tells whether dir ("" for the repository root) has its
// own manifest.
export function isNoise(file, isPackageRoot = () => false) {
  const parts = file.split("/");
  const name = parts.at(-1);
  const dirs = parts.slice(0, -1);
  const rootLike = (i) => i === 0 || isPackageRoot(dirs.slice(0, i).join("/"));
  if (/\.(test|spec)\.[^.]+$/.test(name) || dirs.includes("__tests__")) return "test";
  for (let i = 0; i < dirs.length; i += 1) {
    if (["test", "tests", "e2e"].includes(dirs[i]) && rootLike(i)) return "test";
    if (dirs[i] === "docs" && (rootLike(i) || (i === 1 && dirs[0].startsWith(".")))) return "docs";
  }
  if (dirs.length === 0 && /\.md$/i.test(name)) return "docs";
  if (LINT_CONFIG.test(name)) return "lint config";
  return null;
}

// Returns { ok, files: [{ file, kind }], problem }. frozen lists the frozen
// spec.md and verify.md as repository-relative paths.
export function reuseCheck({ repo, verifiedHead, head, frozen = [] }) {
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
  const roots = new Map();
  const isPackageRoot = (dir) => {
    if (!roots.has(dir))
      roots.set(
        dir,
        MANIFESTS.some((m) => {
          try {
            git("cat-file", "-e", `${head}:${dir ? `${dir}/` : ""}${m}`);
            return true;
          } catch {
            return false;
          }
        }),
      );
    return roots.get(dir);
  };
  const files = git("diff", "--name-only", "--no-renames", verifiedHead, head)
    .split("\n")
    .filter(Boolean)
    .map((file) => ({ file, kind: frozen.includes(file) ? null : isNoise(file, isPackageRoot) }));
  const changedFrozen = files.filter((f) => frozen.includes(f.file));
  if (changedFrozen.length)
    return {
      ok: false,
      files,
      problem:
        `${changedFrozen.map((f) => f.file).join(", ")} changed since the report's head ${verifiedHead.slice(0, 12)}; ` +
        "a report against the old acceptance docs does not carry over, verify the MR head again",
    };
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
