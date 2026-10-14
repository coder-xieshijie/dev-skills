#!/usr/bin/env node
// Checks and counts the merge gate's findings ledger, a TSV file with one row
// per finding.
//
//   node findings.mjs check <findings.tsv> [--final]
//   node findings.mjs summary <findings.tsv> [--json]
//
// Columns, in this order, tab-separated, first line is the header:
//   id        unique, e.g. CX-01, SA2-03, RUN-01
//   source    who reported it: a reviewer prefix, runtime, delta-review, checker
//   area      the review area it belongs to
//   title     one line
//   location  file:line or scenario id
//   proposed  severity the reporter proposed: P0-P3
//   verdict   PENDING, CONFIRMED, REJECTED or CANNOT_VERIFY
//   severity  final severity P0-P3; required once CONFIRMED
//   same_as   id of the row this one duplicates, or empty
//   fix       the sub-MR that fixes it, e.g. !123 or #45
//   status    open, fixing, merged, deferred, blocked or rejected
//   note      why deferred or blocked, and what unblocks it
// Lines starting with # and empty lines are ignored. A row with same_as is
// counted once, through the row it names.
//
// check exits 0 when the ledger is well formed, 1 with one line per problem.
// With --final it also applies the gate rules: no PENDING rows; a duplicate
// has the same verdict as the row it names; every confirmed P0-P2 finding is
// merged or blocked; every confirmed P3 is merged or deferred; every
// CANNOT_VERIFY row is blocked (proposed P0-P2) or deferred (P3), with a note.
// It exits 3 when the rules hold but some rows are blocked, so the MR still
// waits on them. summary prints counts as a Markdown table, or JSON. Exit 2
// on usage errors. Zero dependencies.
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const COLUMNS = [
  "id", "source", "area", "title", "location", "proposed",
  "verdict", "severity", "same_as", "fix", "status", "note",
];
const SEVERITIES = ["P0", "P1", "P2", "P3"];
const VERDICTS = ["PENDING", "CONFIRMED", "REJECTED", "CANNOT_VERIFY"];
const STATUSES = ["open", "fixing", "merged", "deferred", "blocked", "rejected"];
const MUST_FIX = ["P0", "P1", "P2"];

export function parse(text) {
  const lines = text.split(/\r?\n/).map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => line.trim() !== "" && !line.startsWith("#"));
  if (lines.length === 0) return { rows: [], problems: ["empty file: the first line must be the header"] };
  const header = lines[0].line.split("\t").map((c) => c.trim());
  if (header.join("\t") !== COLUMNS.join("\t")) {
    return { rows: [], problems: [`line ${lines[0].n}: header must be: ${COLUMNS.join(" ")}`] };
  }
  const rows = [];
  const problems = [];
  for (const { line, n } of lines.slice(1)) {
    const cells = line.split("\t");
    if (cells.length !== COLUMNS.length) {
      problems.push(`line ${n}: ${cells.length} cells, expected ${COLUMNS.length}`);
      continue;
    }
    rows.push({ n, ...Object.fromEntries(COLUMNS.map((c, i) => [c, cells[i].trim()])) });
  }
  return { rows, problems };
}

export function check(rows, { final = false } = {}) {
  const problems = [];
  const blocked = [];
  const ids = new Map();
  for (const r of rows) {
    const at = `line ${r.n} (${r.id || "no id"})`;
    if (!r.id) problems.push(`${at}: id is empty`);
    else if (ids.has(r.id)) problems.push(`${at}: id also on line ${ids.get(r.id).n}`);
    else ids.set(r.id, r);
    if (r.proposed && !SEVERITIES.includes(r.proposed)) problems.push(`${at}: proposed must be one of ${SEVERITIES.join(", ")}`);
    if (!VERDICTS.includes(r.verdict)) problems.push(`${at}: verdict must be one of ${VERDICTS.join(", ")}`);
    if (r.severity && !SEVERITIES.includes(r.severity)) problems.push(`${at}: severity must be one of ${SEVERITIES.join(", ")}`);
    if (!STATUSES.includes(r.status)) problems.push(`${at}: status must be one of ${STATUSES.join(", ")}`);
  }
  for (const r of rows) {
    const at = `line ${r.n} (${r.id})`;
    if (r.same_as) {
      const target = ids.get(r.same_as);
      if (!target) problems.push(`${at}: same_as ${r.same_as} is not an id in the ledger`);
      else if (target.same_as) problems.push(`${at}: same_as ${r.same_as} is itself a duplicate; name ${target.same_as}`);
      else if (final && r.verdict !== target.verdict) {
        problems.push(`${at}: verdict ${r.verdict} differs from ${r.same_as} (${target.verdict}); settle one verdict for the issue`);
      }
      continue;
    }
    if (r.verdict === "CONFIRMED" && !r.severity) problems.push(`${at}: a CONFIRMED finding needs a severity`);
    if (r.verdict === "REJECTED" && r.status !== "rejected") problems.push(`${at}: a REJECTED finding has status rejected`);
    if (r.status === "rejected" && r.verdict !== "REJECTED") problems.push(`${at}: status rejected needs verdict REJECTED`);
    if (["fixing", "merged"].includes(r.status) && !r.fix) problems.push(`${at}: status ${r.status} needs the fixing sub-MR in fix`);
    if (["deferred", "blocked"].includes(r.status) && !r.note) problems.push(`${at}: status ${r.status} needs a note saying why and what unblocks it`);
    if (final) {
      if (r.verdict === "PENDING") problems.push(`${at}: still PENDING; every finding needs a verdict before the gate ends`);
      if (r.verdict === "CONFIRMED" && MUST_FIX.includes(r.severity)) {
        if (r.status === "blocked") blocked.push(r);
        else if (r.status !== "merged") problems.push(`${at}: confirmed ${r.severity} must be merged or blocked, is ${r.status}`);
      }
      if (r.verdict === "CONFIRMED" && r.severity === "P3" && !["merged", "deferred"].includes(r.status)) {
        problems.push(`${at}: confirmed P3 must be merged or deferred, is ${r.status}`);
      }
      if (r.verdict === "CANNOT_VERIFY") {
        const severe = r.proposed !== "P3";
        if (r.status === "blocked") blocked.push({ ...r, severity: r.proposed || "unrated" });
        else if (severe || r.status !== "deferred") {
          problems.push(`${at}: CANNOT_VERIFY with proposed ${r.proposed || "none"} must be ${severe ? "blocked" : "blocked or deferred"}, is ${r.status}`);
        }
      }
    }
  }
  return { problems, blocked };
}

export function summarize(rows) {
  const canonical = rows.filter((r) => !r.same_as);
  const confirmed = canonical.filter((r) => r.verdict === "CONFIRMED");
  const bySeverity = Object.fromEntries(SEVERITIES.map((s) => {
    const of = confirmed.filter((r) => r.severity === s);
    const count = (...st) => of.filter((r) => st.includes(r.status)).length;
    return [s, { total: of.length, merged: count("merged"), blocked: count("blocked"), deferred: count("deferred"), open: count("open", "fixing") }];
  }));
  return {
    findings: rows.length,
    duplicates: rows.length - canonical.length,
    confirmed: confirmed.length,
    rejected: canonical.filter((r) => r.verdict === "REJECTED").length,
    cannotVerify: canonical.filter((r) => r.verdict === "CANNOT_VERIFY").length,
    pending: canonical.filter((r) => r.verdict === "PENDING").length,
    bySeverity,
  };
}

function markdown(s) {
  const out = ["| Severity | Confirmed | Merged | Blocked | Deferred | Open |", "|---|---|---|---|---|---|"];
  for (const [sev, c] of Object.entries(s.bySeverity)) out.push(`| ${sev} | ${c.total} | ${c.merged} | ${c.blocked} | ${c.deferred} | ${c.open} |`);
  const sum = (k) => Object.values(s.bySeverity).reduce((a, c) => a + c[k], 0);
  out.push(`| Total | ${s.confirmed} | ${sum("merged")} | ${sum("blocked")} | ${sum("deferred")} | ${sum("open")} |`);
  out.push("", `${s.findings} rows, ${s.duplicates} duplicates, ${s.rejected} rejected, ${s.cannotVerify} cannot verify, ${s.pending} pending.`);
  return out.join("\n");
}

function main(argv) {
  const usage = "usage: findings.mjs check <findings.tsv> [--final] | findings.mjs summary <findings.tsv> [--json]";
  const [command, file, ...flags] = argv;
  const allowed = { check: ["--final"], summary: ["--json"] }[command];
  if (!allowed || !file || flags.some((f) => !allowed.includes(f))) {
    console.error(usage);
    return 2;
  }
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch (error) {
    console.error(`findings: cannot read ${file}: ${error.message}`);
    return 2;
  }
  const { rows, problems: parseProblems } = parse(text);
  const { problems, blocked } = check(rows, { final: flags.includes("--final") });
  const all = [...parseProblems, ...problems];
  if (command === "summary") {
    if (all.length) all.forEach((p) => console.error(`findings: ${p}`));
    const s = summarize(rows);
    console.log(flags.includes("--json") ? JSON.stringify(s, null, 2) : markdown(s));
    return all.length ? 1 : 0;
  }
  if (all.length) {
    all.forEach((p) => console.log(p));
    return 1;
  }
  if (blocked.length) {
    console.log(`BLOCKED: ${blocked.map((r) => `${r.id} (${r.severity}): ${r.note}`).join("; ")}`);
    return 3;
  }
  console.log(`ok: ${rows.length} rows`);
  return 0;
}

const invoked = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invoked) process.exit(main(process.argv.slice(2)));
