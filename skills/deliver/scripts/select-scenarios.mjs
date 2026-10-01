#!/usr/bin/env node
// Pick the scenarios to run again after a change, for the deliver Skill
// (SKILL.md, 里程碑).
//
//   node select-scenarios.mjs --plan <plan.md> --from <head the scenarios last ran on>
//                             [--to <head, default HEAD>] [--failed S04,S09] [--repo <worktree>] [--json]
//
// plan.md's 验证与验收 section holds a table with a 场景 column (scenario IDs
// such as S01, S12b, RG1, or 冒烟集) and a 涉及路径 column: the code each row
// exercises, as globs relative to the repository root (`**` crosses
// directories, `*` and `?` stay within one; a pattern without wildcards also
// matches everything under it). A row whose 涉及路径 is empty, `-` or `*` runs
// every time, and so does the 冒烟集 row.
//
// Each file changed between --from and --to is
// - left out when it is only a test, doc or lint config, as report-reuse.mjs
//   decides for carrying a verification report over;
// - a reason to rerun every scenario when it is the frozen spec.md or
//   verify.md, or when no row claims it, so a path the owner forgot to list
//   makes the selection larger, never smaller;
// - otherwise a reason to rerun the rows whose 涉及路径 match it.
// --failed adds scenarios that failed last time. The final head still runs
// every scenario (SKILL.md, 完成条件 1); this only narrows reruns in between.
//
// Exit 0 with the selection, 1 when plan.md's table is missing or malformed
// or a commit cannot be resolved, 2 on usage errors.
import { readFileSync } from "node:fs";
import path from "node:path";
import { codeRepo, frozenPaths, gitIn } from "./milestones.mjs";
import { changedFiles } from "./report-reuse.mjs";

const USAGE =
  "usage: select-scenarios.mjs --plan <plan.md> --from <commit> [--to <commit>] " +
  "[--failed S04,S09] [--repo <worktree>] [--json]";
const ID = /\b(?:S|RG)\d+[a-z]?\b/g;
const SMOKE = "冒烟集";

function fail(code, message) {
  console.error(code === 2 ? `${message}\n${USAGE}` : message);
  process.exit(code);
}

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i].replace(/^--/, "");
  if (key === "json") {
    args.json = true;
    continue;
  }
  if (!argv[i].startsWith("--") || !["plan", "from", "to", "failed", "repo"].includes(key))
    fail(2, `unknown argument ${argv[i]}`);
  if (i + 1 >= argv.length) fail(2, `missing value for --${key}`);
  args[key] = argv[(i += 1)];
}
for (const key of ["plan", "from"]) if (!args[key]) fail(2, `--${key} is required`);

const planPath = path.resolve(args.plan);
let plan;
try {
  plan = readFileSync(planPath, "utf8");
} catch {
  fail(1, `cannot read ${planPath}`);
}
const planDir = path.dirname(planPath);
const repo = codeRepo(plan, planDir, args.repo);
if (!repo) fail(1, "cannot find the code repository: pass --repo <worktree with the requirement branch>");
const git = gitIn(repo);
const resolve = (ref) => {
  try {
    return git("rev-parse", "--verify", `${ref}^{commit}`);
  } catch {
    fail(1, `cannot resolve ${ref} in ${repo}`);
  }
};
const from = resolve(args.from);
const to = resolve(args.to ?? "HEAD");

// ---- plan.md: the 验证与验收 table ----

const lines = plan.split("\n");
const start = lines.findIndex((l) => /^#{1,6}\s+\**验证与验收/.test(l));
if (start < 0) fail(1, "plan.md has no 验证与验收 section; add one with a 场景 | 命令 | 涉及路径 table");
const level = lines[start].match(/^#+/)[0].length;
let end = lines.length;
for (let i = start + 1; i < lines.length; i += 1) {
  const h = lines[i].match(/^(#{1,6})\s/);
  if (h && h[1].length <= level) {
    end = i;
    break;
  }
}
const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    // A `|` inside backticks or escaped as \| is part of the cell.
    .split(/(?<!\\)\|(?=(?:[^`]*`[^`]*`)*[^`]*$)/)
    .map((c) => c.trim());
let header = null;
let sceneCol = -1;
let pathCol = -1;
const rows = [];
for (let i = start + 1; i < end; i += 1) {
  const line = lines[i];
  if (!/^\s*\|/.test(line)) {
    if (header && rows.length) break;
    header = null;
    continue;
  }
  const row = cells(line);
  if (!header) {
    const s = row.findIndex((c) => c.includes("场景"));
    const p = row.findIndex((c) => c.includes("涉及路径"));
    if (s >= 0 && p >= 0) [header, sceneCol, pathCol] = [row, s, p];
    continue;
  }
  if (row.every((c) => /^:?-{3,}:?$/.test(c))) continue;
  const ids = [...new Set(row[sceneCol]?.match(ID) ?? [])];
  if (row[sceneCol]?.includes(SMOKE)) ids.push(SMOKE);
  if (!ids.length) fail(1, `plan.md 验证与验收 line ${i + 1}: no scenario ID in the 场景 column: ${row[sceneCol] ?? ""}`);
  const raw = (row[pathCol] ?? "").trim();
  const quoted = [...raw.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
  const patterns = (quoted.length ? quoted : raw.split(/[、,，\s]+/)).filter((p) => p && p !== "-");
  const always = ids.includes(SMOKE) || !patterns.length || patterns.includes("*");
  rows.push({ ids, patterns: always ? [] : patterns, always, line: i + 1 });
}
if (!header) fail(1, "plan.md 验证与验收 has no table with both a 场景 and a 涉及路径 column");
if (!rows.length) fail(1, "plan.md 验证与验收 table has no rows");

function globToRegExp(glob) {
  const g = glob.replace(/^\.\//, "").replace(/\/+$/, "");
  let re = "";
  for (let i = 0; i < g.length; i += 1) {
    const c = g[i];
    if (c === "*" && g[i + 1] === "*") {
      i += 1;
      if (g[i + 1] === "/") {
        i += 1;
        re += "(?:.*/)?";
      } else re += ".*";
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  // Without wildcards, a path also matches what lies under it.
  return new RegExp(/[*?]/.test(g) ? `^${re}$` : `^${re}(?:/.*)?$`);
}
for (const row of rows) row.res = row.patterns.map((p) => ({ p, re: globToRegExp(p) }));

// ---- selection ----

const frozen = Object.values(frozenPaths(plan, planDir, repo));
const files = from === to ? [] : changedFiles({ repo, from, to, frozen });
const allIds = [...new Set(rows.flatMap((r) => r.ids))];
const reasons = new Map();
const add = (id, why) => {
  if (!reasons.has(id)) reasons.set(id, []);
  if (!reasons.get(id).includes(why)) reasons.get(id).push(why);
};
const ignored = [];
const unclaimed = [];
const frozenChanged = [];
for (const { file, kind } of files) {
  if (frozen.includes(file)) {
    frozenChanged.push(file);
    continue;
  }
  if (kind) {
    ignored.push({ file, kind });
    continue;
  }
  let claimed = false;
  for (const row of rows)
    for (const { p, re } of row.res)
      if (re.test(file)) {
        claimed = true;
        for (const id of row.ids) add(id, `${file} (\`${p}\`)`);
      }
  if (!claimed) unclaimed.push(file);
}
const all = frozenChanged.length > 0 || unclaimed.length > 0;
if (all)
  for (const id of allIds)
    add(id, frozenChanged.length ? `frozen file changed: ${frozenChanged.join(", ")}` : "a changed file is not in any 涉及路径");
for (const row of rows) if (row.always) for (const id of row.ids) add(id, id === SMOKE ? "smoke set: always" : "no 涉及路径: always");
for (const id of (args.failed ?? "").split(/[,，\s]+/).filter(Boolean)) add(id, "failed last time");

const order = (id) => {
  const i = allIds.indexOf(id);
  return i < 0 ? allIds.length : i;
};
const selected = [...reasons.keys()].sort((a, b) => order(a) - order(b));

if (args.json) {
  console.log(
    JSON.stringify(
      {
        from,
        to,
        all,
        scenarios: selected.map((id) => ({ id, reasons: reasons.get(id) })),
        unclaimed,
        frozenChanged,
        ignored,
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    `${from.slice(0, 12)}..${to.slice(0, 12)}: ${files.length} file(s) changed, ` +
      `${ignored.length} of them only tests, docs or lint config`,
  );
  console.log(`rerun ${selected.length} of ${allIds.length}${all ? " (all)" : ""}: ${selected.join(", ")}`);
  for (const id of selected) console.log(`  ${id}: ${reasons.get(id).slice(0, 3).join("; ")}${reasons.get(id).length > 3 ? "; ..." : ""}`);
  if (unclaimed.length)
    console.log(
      `not in any 涉及路径, so every scenario reruns (add the paths to plan.md 验证与验收 to narrow it):\n` +
        unclaimed.map((f) => `  ${f}`).join("\n"),
    );
}
