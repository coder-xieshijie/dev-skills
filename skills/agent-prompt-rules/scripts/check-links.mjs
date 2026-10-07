#!/usr/bin/env node
// Link gate for this Skill: every relative link and anchor in its Markdown
// files resolves inside the Skill directory. The Skill is installed by
// linking this directory alone, so a link that leaves it breaks on install.
// The repository's scripts/check-links.mjs imports checkLinks from here, so
// this file stays self-contained.
// The archived third-party excerpts keep their links as published, so links
// inside them are not checked; anchors pointing into them are.
// Zero dependencies; run with `node scripts/check-links.mjs` from anywhere.
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CODE_SPAN = /`[^`]*`/g;

/** Strip fenced code blocks, preserving line count. */
function stripFences(text) {
  const lines = text.split("\n");
  let fence = null;
  const kept = lines.map((line) => {
    const open = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      if (open && open[1][0] === fence[0] && open[1].length >= fence.length)
        fence = null;
      return "";
    }
    if (open) {
      fence = open[1];
      return "";
    }
    return line;
  });
  return kept.join("\n");
}

/** Strip fenced code blocks and inline code spans, preserving line count. */
function stripCode(text) {
  return stripFences(text)
    .split("\n")
    .map((line) => line.replace(CODE_SPAN, (m) => " ".repeat(m.length)))
    .join("\n");
}

/** GitHub anchor slug for a heading line's text. */
function slugify(heading) {
  // Like GitHub's slugger, `code` spans keep their text as is and lose only
  // the backticks (to the character filter below), so the link and emphasis
  // rewrites must not see inside them.
  const spans = [];
  const text = heading
    .replace(CODE_SPAN, (m) => `\0${spans.push(m) - 1}\0`)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> label
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1") // emphasis -> text
    // `_` marks emphasis only at word edges: snake_case keeps its underscores.
    .replace(/(?<![\p{L}\p{N}])_{1,3}([^_]+)_{1,3}(?![\p{L}\p{N}])/gu, "$1")
    .replace(/\0(\d+)\0/g, (_, i) => spans[i])
    .trim()
    .toLowerCase();
  return text.replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "").replace(/\s/g, "-");
}

/** Anchor set for one Markdown file, with github-slugger's duplicate suffixes. */
function anchorsOf(text) {
  const occurrences = new Map();
  // Fence-stripped only: heading text must keep inline-code text so the
  // slug matches GitHub's anchor for headings like `## \`check\` versus …`.
  for (const line of stripFences(text).split("\n")) {
    const m = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (!m) continue;
    const original = slugify(m[2]);
    let slug = original;
    while (occurrences.has(slug)) {
      occurrences.set(original, occurrences.get(original) + 1);
      slug = `${original}-${occurrences.get(original)}`;
    }
    occurrences.set(slug, 0);
  }
  return new Set(occurrences.keys());
}

const INLINE_LINK =
  /!?\[[^\]]*\]\(([^()\s]+(?:\([^()]*\)[^()\s]*)?)(?:\s+"[^"]*")?\)/g;
// A reference definition, `[label]: target` or `[label]: <target>` with an
// optional title, which `[text][label]`, `[label][]` and `[label]` link to.
// `[^…]:` starts a footnote, not a definition.
const DEFINITION =
  /^[ \t]*(?:>[ \t]*)*\[(?!\^)(?:[^[\]\\]|\\.)+\]:[ \t]*(?:<([^<>]*)>|(\S+))(?:[ \t]+(?:"[^"]*"|'[^']*'|\([^()]*\)))?[ \t]*$/;

/**
 * Check every Markdown file under `root`. `scope` is "skill" (links may not
 * leave the Skill directory, and root-relative links have no root to resolve
 * from) or "repository" (root-relative links resolve from `root`, as on
 * GitHub). Paths are relative to `root`, with `/` separators.
 */
export function checkLinks({
  root,
  scope = "skill",
  archivedOriginals = [],
  skipDirs = [],
}) {
  const skip = new Set(skipDirs);
  const files = readdirSync(root, { recursive: true })
    .map((f) => f.split(path.sep).join("/"))
    .filter((f) => !f.split("/").some((part) => skip.has(part)))
    .filter((f) => f.endsWith(".md"))
    .sort();
  const contents = new Map(
    files.map((f) => [f, readFileSync(path.join(root, f), "utf8")]),
  );
  const anchorCache = new Map();
  // A link may point into a skipped directory, which was not read above.
  const anchorsFor = (file) => {
    if (!anchorCache.has(file))
      anchorCache.set(
        file,
        anchorsOf(
          contents.get(file) ?? readFileSync(path.join(root, file), "utf8"),
        ),
      );
    return anchorCache.get(file);
  };
  const boundary =
    scope === "skill" ? "the Skill directory" : "the repository";
  const errors = [];

  const checkTarget = (file, where, target) => {
    if (/^(https?:|mailto:|data:)/i.test(target)) return;
    const [rawPath, ...anchorParts] = target.split("#");
    const anchor = decodeURIComponent(anchorParts.join("#"));
    let targetFile = file;
    if (rawPath) {
      const decoded = decodeURIComponent(rawPath);
      let base = path.dirname(file);
      if (decoded.startsWith("/")) {
        if (scope === "skill") {
          errors.push(
            `${where}: root-relative link, use a path relative to the file -> ${target}`,
          );
          return;
        }
        base = ".";
      }
      const resolved = path
        .normalize(path.join(base, decoded))
        .split(path.sep)
        .join("/");
      if (resolved === ".." || resolved.startsWith("../")) {
        errors.push(`${where}: link leaves ${boundary} -> ${target}`);
        return;
      }
      const absolute = path.join(root, resolved);
      if (!existsSync(absolute)) {
        errors.push(`${where}: broken link -> ${target} (missing ${resolved})`);
        return;
      }
      if (anchor && statSync(absolute).isDirectory()) {
        errors.push(`${where}: anchor on a directory -> ${target}`);
        return;
      }
      targetFile = resolved;
    }
    if (!anchor) return;
    if (!targetFile.endsWith(".md")) return;
    if (!anchorsFor(targetFile).has(anchor.toLowerCase()))
      errors.push(`${where}: missing anchor -> ${target}`);
  };

  for (const file of files) {
    if (archivedOriginals.some((prefix) => file.startsWith(prefix))) continue;
    const lines = stripCode(contents.get(file)).split("\n");
    lines.forEach((line, index) => {
      const where = `${file}:${index + 1}`;
      for (const match of line.matchAll(INLINE_LINK))
        checkTarget(file, where, match[1]);
      const definition = line.match(DEFINITION);
      if (definition) checkTarget(file, where, definition[1] ?? definition[2]);
    });
  }
  return { fileCount: files.length, errors };
}

/** Print a checkLinks result; returns the exit code. */
export function report({ fileCount, errors }) {
  if (errors.length) {
    console.error(`check-links: ${errors.length} problem(s)`);
    for (const error of errors) console.error(`  ${error}`);
    return 1;
  }
  console.log(`check-links: ${fileCount} Markdown files OK (links, anchors)`);
  return 0;
}

// Run directly, often through the symlink the Skill is installed with.
const realPath = (file) => {
  try {
    return realpathSync(file);
  } catch {
    return null;
  }
};
const self = fileURLToPath(import.meta.url);
if (process.argv[1] && realPath(process.argv[1]) === realPath(self)) {
  process.exitCode = report(
    checkLinks({
      root: path.dirname(path.dirname(self)),
      scope: "skill",
      // Excerpts of official source documents (see references/sources/README.md).
      archivedOriginals: [
        "references/sources/anthropic/",
        "references/sources/openai/",
      ],
    }),
  );
}
