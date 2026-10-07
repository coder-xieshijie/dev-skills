import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { listClauses } from "./clauses.mjs";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "clauses.mjs");

// The fixture spec is in Chinese on purpose: spec.md follows the user's language.
const spec = `# 主题：核心决策与约束

> 用途说明，不算条款。

## 完整决策与约束

### 4. 请求计量

#### 4.1 什么算一次请求

- 第一条规定。
- 第二条规定，
  续行并入同一条。
  - 嵌套的规定。

一段说明性的规定。

| 项 | 规定 |
|---|---|
| A | 必须 x \\| y |

\`\`\`text
- 代码块里的不算
\`\`\`

### 15. 非目标

1. 本期不新增展示。

## 交付与授权

- 根因未定位的项先复现。
`;

test("numbers list items, paragraphs and table rows under the nearest heading", () => {
  const units = listClauses(spec);
  assert.deepEqual(
    units.map((u) => [u.id, u.line]),
    [
      ["§4.1-1", 11],
      ["§4.1-2", 12],
      ["§4.1-3", 14],
      ["§4.1-4", 16],
      ["§4.1-5", 20],
      ["§15-1", 28],
      ["§交付与授权-1", 32],
    ],
  );
  assert.equal(units[1].text, "第二条规定， 续行并入同一条。");
  assert.ok(units[4].text.startsWith("A | 必须 x "), units[4].text);
  assert.ok(units[4].text.endsWith(" y"), units[4].text);
  assert.equal(units[4].text.split(" | ").length, 2);
});

test("skips headings, blockquotes, fenced code and table header rows", () => {
  const texts = listClauses(spec).map((u) => u.text).join("\n");
  assert.doesNotMatch(texts, /用途说明/);
  assert.doesNotMatch(texts, /代码块里的不算/);
  assert.doesNotMatch(texts, /^项 \| 规定$/m);
});

test("CLI writes the list with the spec hash and count", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "clauses-"));
  const file = path.join(dir, "spec.md");
  const out = path.join(dir, "clauses.md");
  writeFileSync(file, spec);
  execFileSync(process.execPath, [script, "--spec", file, "--out", out]);
  const text = readFileSync(out, "utf8");
  assert.match(text, /sha256 [0-9a-f]{64}, 7 clauses\./);
  assert.match(text, /\| §4\.1-3 \| 14 \| 嵌套的规定。 \|/);
  const row = text.split("\n").find((l) => l.startsWith("| §4.1-5 |"));
  assert.equal(row.split(" | ").length, 3, row);
});

test("CLI rejects a missing spec", () => {
  assert.throws(() => execFileSync(process.execPath, [script, "--spec", "/nonexistent/spec.md"], { stdio: "pipe" }), /status 2|exit code 2|Command failed/);
});
