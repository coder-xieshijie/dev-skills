#!/usr/bin/env node
// Clause list for core-spec's gap check (step 7). It numbers every normative
// unit of spec.md so the gap checker can compare spec with verify clause by
// clause instead of section by section. It only lists; it never blocks.
//
//   node clauses.mjs --spec <spec.md> [--out <file>]
//
// A unit is a list item (any depth, continuation lines joined), a paragraph,
// or a table body row. Headings, fenced code, blockquotes and table header or
// separator rows are not units. Each unit gets `§<section>-<k>`: <section> is
// the leading number of the nearest heading ("4.1" for "#### 4.1 ...") or the
// heading text when it has no number; <k> counts units under that heading.
//
// Exit 0 on success, 2 on usage errors. Zero dependencies.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const USAGE = "usage: clauses.mjs --spec <spec.md> [--out <file>]";

export function listClauses(text) {
  const lines = text.split(/\r?\n/);
  const units = [];
  let section = "";
  let counter = 0;
  let current = null;
  let fence = false;

  const flush = () => {
    if (current) {
      const body = current.parts.join(" ").replace(/\s+/g, " ").trim();
      if (body) {
        counter += 1;
        units.push({ id: `§${section}-${counter}`, line: current.line, text: body });
      }
    }
    current = null;
  };

  lines.forEach((raw, index) => {
    const lineNo = index + 1;
    const line = raw.replace(/\s+$/, "");
    if (/^\s*(```|~~~)/.test(line)) {
      flush();
      fence = !fence;
      return;
    }
    if (fence) return;
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      flush();
      const title = heading[1].trim();
      const number = title.match(/^(\d+(?:\.\d+)*)[.\s]/) || title.match(/^(\d+(?:\.\d+)*)$/);
      section = number ? number[1] : title;
      counter = 0;
      return;
    }
    if (line.trim() === "") {
      flush();
      return;
    }
    if (/^\s*>/.test(line)) {
      flush();
      return;
    }
    if (/^\s*\|/.test(line)) {
      flush();
      const cells = splitRow(line);
      const isSeparator = cells.every((c) => /^:?-{2,}:?$/.test(c));
      const next = lines[index + 1] || "";
      const isHeader = /^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(next);
      if (!isSeparator && !isHeader) {
        current = { line: lineNo, parts: [cells.join(" | ")] };
        flush();
      }
      return;
    }
    const item = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (item) {
      flush();
      current = { line: lineNo, parts: [item[1]] };
      return;
    }
    if (current) current.parts.push(line.trim());
    else current = { line: lineNo, parts: [line.trim()] };
  });
  flush();
  return units;
}

// A table row's cells, split on pipes that are not escaped with a backslash.
function splitRow(line) {
  const cells = [];
  let cell = "";
  const body = line.trim();
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "\\" && body[i + 1] === "|") {
      cell += "\\|";
      i += 1;
    } else if (ch === "|") {
      cells.push(cell.trim());
      cell = "";
    } else cell += ch;
  }
  cells.push(cell.trim());
  if (body.startsWith("|")) cells.shift();
  if (cells.length && cells[cells.length - 1] === "") cells.pop();
  return cells;
}

// Escape the pipes that are not escaped yet, so each unit stays in one cell.
function escapePipes(text) {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\\" && text[i + 1] === "|") {
      out += "\\|";
      i += 1;
    } else if (text[i] === "|") out += "\\|";
    else out += text[i];
  }
  return out;
}

export function renderClauses(specPath, text, units) {
  const hash = createHash("sha256").update(text).digest("hex");
  const rows = units.map((u) => `| ${u.id} | ${u.line} | ${escapePipes(u.text)} |`);
  return [
    "# spec 条款清单",
    "",
    `spec：${specPath}，sha256 ${hash}，共 ${units.length} 条。`,
    "",
    "| 条款 | 行 | 内容 |",
    "|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--spec" || key === "--out") {
      if (!argv[i + 1]) return usage(`${key} needs a value`);
      args[key.slice(2)] = argv[i + 1];
      i += 1;
    } else return usage(`unknown argument: ${key}`);
  }
  if (!args.spec) return usage("--spec is required");
  if (!existsSync(args.spec)) return usage(`spec not found: ${args.spec}`);
  const text = readFileSync(args.spec, "utf8");
  const out = renderClauses(args.spec, text, listClauses(text));
  if (args.out) writeFileSync(args.out, out);
  else process.stdout.write(out);
  return 0;
}

function usage(message) {
  console.error(`${message}\n${USAGE}`);
  return 2;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
