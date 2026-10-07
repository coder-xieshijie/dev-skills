// Cases for check-links.mjs. Run: node --test skills/agent-prompt-rules/scripts/check-links.test.mjs
// Each case writes its Markdown files into a throwaway directory and checks it.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { checkLinks } from "./check-links.mjs";

const SCRIPT = path.join(import.meta.dirname, "check-links.mjs");
const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function fixture(files) {
  const root = mkdtempSync(path.join(tmpdir(), "check-links-"));
  dirs.push(root);
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  }
  return root;
}
const check = (files, options = {}) =>
  checkLinks({ root: fixture(files), ...options });

test("reports a broken link and a missing anchor", () => {
  const result = check({
    "a.md": "# Top\n[b](b.md)\n[c](c.md)\n[b](b.md#nope)\n[top](#top)\n",
    "b.md": "# B\n",
  });
  assert.deepEqual(result, {
    fileCount: 2,
    errors: [
      "a.md:3: broken link -> c.md (missing c.md)",
      "a.md:4: missing anchor -> b.md#nope",
    ],
  });
});

test("reports a link that leaves the root, in both scopes", () => {
  const files = { "sub/a.md": "[out](../../x.md)\n[in](../b.md)\n", "b.md": "" };
  assert.deepEqual(check(files, { scope: "skill" }).errors, [
    "sub/a.md:1: link leaves the Skill directory -> ../../x.md",
  ]);
  assert.deepEqual(check(files, { scope: "repository" }).errors, [
    "sub/a.md:1: link leaves the repository -> ../../x.md",
  ]);
});

test("reports an anchor on a directory", () => {
  const result = check({
    "a.md": "[d](dir/#x)\n[d](dir/)\n",
    "dir/x.md": "# x\n",
  });
  assert.deepEqual(result.errors, ["a.md:1: anchor on a directory -> dir/#x"]);
});

test("ignores links and definitions in fenced and inline code", () => {
  const result = check({
    "a.md": [
      "```md",
      "[x](missing.md)",
      "[r]: missing.md",
      "```",
      "~~~",
      "[x](missing.md)",
      "~~~",
      "Inline `[x](missing.md)` code.",
      "`[r]: missing.md`",
      "",
    ].join("\n"),
  });
  assert.deepEqual(result.errors, []);
});

test("skips external links", () => {
  const result = check({
    "a.md":
      "[a](https://example.com/x#y) [b](mailto:a@example.com) [c](data:text/plain,x)\n\n[d]: http://example.com/missing.md#x\n",
  });
  assert.deepEqual(result.errors, []);
});

test("archived excerpts: their own links are skipped, anchors into them are checked", () => {
  const result = check(
    {
      "references/sources/anthropic/doc.md":
        "# Kept heading\n[broken](missing.md)\n\n[ref]: missing.md\n",
      "a.md":
        "[ok](references/sources/anthropic/doc.md#kept-heading)\n[gone](references/sources/anthropic/doc.md#gone)\n",
    },
    { archivedOriginals: ["references/sources/anthropic/"] },
  );
  assert.deepEqual(result.errors, [
    "a.md:2: missing anchor -> references/sources/anthropic/doc.md#gone",
  ]);
});

test("a repeated heading gets a -1 suffix", () => {
  const result = check({
    "a.md": "[1](b.md#foo) [2](b.md#foo-1) [3](b.md#foo-2)\n",
    "b.md": "# Foo\n## Foo\n",
  });
  assert.deepEqual(result.errors, ["a.md:1: missing anchor -> b.md#foo-2"]);
});

test("a heading's code spans keep _ and *; emphasis outside them goes", () => {
  const result = check({
    "a.md": [
      "[1](b.md#model_reasoning_effort)",
      "[2](b.md#foo-bar)",
      "[3](b.md#x_y_z-link)",
      "[4](b.md#modelreasoningeffort)",
      "",
    ].join("\n"),
    "b.md": "## `model_reasoning_effort`\n## *Foo* bar\n## [`x_y_z`](a.md) link\n",
  });
  assert.deepEqual(result.errors, [
    "a.md:4: missing anchor -> b.md#modelreasoningeffort",
  ]);
});

test("underscores inside a word are not emphasis", () => {
  const result = check({
    "a.md": "[1](b.md#snake_case_name-and-emph)\n[2](b.md#init-method)\n",
    "b.md": "## snake_case_name and _emph_\n## __init__ method\n",
  });
  assert.deepEqual(result.errors, []);
});

test("duplicate headings skip slugs already taken, like github-slugger", () => {
  const result = check({
    "a.md": "[1](b.md#foo) [2](b.md#foo-1) [3](b.md#foo-1-1)\n",
    "b.md": "# foo\n# foo\n# foo-1\n",
  });
  assert.deepEqual(result.errors, []);
});

test("an anchor into a skipped directory reads the target file", () => {
  const result = check(
    {
      "a.md":
        "[api](node_modules/pkg/README.md#api)\n[nope](node_modules/pkg/README.md#nope)\n",
      "node_modules/pkg/README.md": "# API\n",
    },
    { scope: "repository", skipDirs: ["node_modules"] },
  );
  assert.deepEqual(result, {
    fileCount: 1,
    errors: ["a.md:2: missing anchor -> node_modules/pkg/README.md#nope"],
  });
});

test("root-relative links resolve from the repository root", () => {
  const result = check(
    {
      "README.md": "# Top\n",
      "docs/a.md": "[r](/README.md#top)\n[m](/missing.md)\n[up](/../x.md)\n",
    },
    { scope: "repository" },
  );
  assert.deepEqual(result.errors, [
    "docs/a.md:2: broken link -> /missing.md (missing missing.md)",
    "docs/a.md:3: link leaves the repository -> /../x.md",
  ]);
});

test("root-relative links are an error in a Skill", () => {
  const result = check(
    { "README.md": "", "docs/a.md": "[r](/README.md)\n" },
    { scope: "skill" },
  );
  assert.deepEqual(result.errors, [
    "docs/a.md:1: root-relative link, use a path relative to the file -> /README.md",
  ]);
});

test("reference-style definitions are checked like inline links", () => {
  const result = check({
    "a.md": [
      "See [b][b-ref], [c][], [d], [e], [f] and [g].[^1]",
      "",
      "[b-ref]: b.md#b",
      '[c]: <missing file.md> "Title"',
      "[d]: b.md#nope 'Title'",
      "[e]: https://example.com/",
      "  [f]: dir/#x (Title)",
      "> [g]: ../out.md",
      "[^1]: Footnote.",
      "",
    ].join("\n"),
    "b.md": "# B\n",
    "dir/x.md": "",
  });
  assert.deepEqual(result.errors, [
    "a.md:4: broken link -> missing file.md (missing missing file.md)",
    "a.md:5: missing anchor -> b.md#nope",
    "a.md:7: anchor on a directory -> dir/#x",
  ]);
});

test("a definition's target may be on the next line; indented code is not a definition", () => {
  const result = check({
    "a.md": [
      "See [h], [i], [j], [k], [l] and [m].",
      "",
      "[h]:",
      "  ../out.md",
      "[i]:",
      "  missing.md 'Title'",
      "",
      "    [j]: missing.md",
      "\t[k]: missing.md",
      "",
      "[l]:",
      "> missing.md",
      "",
      "[m]: >target.md",
      "",
    ].join("\n"),
  });
  assert.deepEqual(result.errors, [
    "a.md:3: link leaves the Skill directory -> ../out.md",
    "a.md:5: broken link -> missing.md (missing missing.md)",
    "a.md:14: broken link -> >target.md (missing >target.md)",
  ]);
});

test("definitions in block quotes and under list items are not checked", () => {
  const result = check({
    "a.md": [
      "> [a]: missing.md",
      ">     [b]: missing.md",
      "- Item",
      "",
      "    [c]: ../out.md",
      "",
    ].join("\n"),
  });
  assert.deepEqual(result.errors, []);
});

test("run through a symlink, the CLI checks the Skill directory it sits in", () => {
  const skill = fixture({ "SKILL.md": "[x](missing.md)\n" });
  mkdirSync(path.join(skill, "scripts"));
  copyFileSync(SCRIPT, path.join(skill, "scripts", "check-links.mjs"));
  const link = path.join(fixture({}), "linked-skill");
  symlinkSync(skill, link);
  const run = () =>
    spawnSync("node", [path.join(link, "scripts", "check-links.mjs")], {
      encoding: "utf8",
    });

  let result = run();
  assert.equal(result.status, 1);
  assert.equal(
    result.stderr,
    "check-links: 1 problem(s)\n  SKILL.md:1: broken link -> missing.md (missing missing.md)\n",
  );

  writeFileSync(path.join(skill, "SKILL.md"), "[x](scripts/check-links.mjs)\n");
  result = run();
  assert.equal(result.status, 0);
  assert.equal(
    result.stdout,
    "check-links: 1 Markdown files OK (links, anchors)\n",
  );
});
