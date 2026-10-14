// Cases for findings.mjs. Run: node --test skills/merge-gate/scripts/findings.test.mjs
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { COLUMNS, check, parse, summarize } from "./findings.mjs";

const SCRIPT = path.join(import.meta.dirname, "findings.mjs");
const dir = mkdtempSync(path.join(tmpdir(), "findings-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const HEADER = COLUMNS.join("\t");
const row = (o) => COLUMNS.map((c) => o[c] ?? "").join("\t");
const base = { source: "SA1", area: "runtime", title: "t", location: "a.ts:1", proposed: "P2" };
const ledger = (...rows) => [HEADER, ...rows.map((o) => row({ ...base, ...o }))].join("\n") + "\n";

function run(args, text) {
  const file = path.join(dir, `${Math.random().toString(36).slice(2)}.tsv`);
  writeFileSync(file, text);
  return spawnSync(process.execPath, [SCRIPT, ...args.map((a) => (a === "@" ? file : a))], { encoding: "utf8" });
}

test("a well-formed ledger passes check", () => {
  const r = run(["check", "@"], ledger(
    { id: "SA1-01", verdict: "CONFIRMED", severity: "P1", fix: "!12", status: "merged" },
    { id: "CX-01", verdict: "PENDING", status: "open" },
  ));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^ok: 2 rows/);
});

test("comments and blank lines are ignored", () => {
  const { rows, problems } = parse(`# note\n\n${HEADER}\n\n${row({ ...base, id: "A", verdict: "PENDING", status: "open" })}\n`);
  assert.deepEqual(problems, []);
  assert.equal(rows.length, 1);
});

test("a wrong header is reported", () => {
  const r = run(["check", "@"], "id\tsource\n");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /header must be/);
});

test("a row with the wrong number of cells is reported", () => {
  const r = run(["check", "@"], `${HEADER}\nA\tSA1\n`);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /2 cells, expected 12/);
});

test("duplicate ids, bad enums and missing fields are reported", () => {
  const { rows } = parse(ledger(
    { id: "A", verdict: "CONFIRMED", status: "merged" },
    { id: "A", verdict: "MAYBE", status: "done", severity: "P9" },
    { id: "B", verdict: "REJECTED", status: "open" },
    { id: "C", verdict: "CONFIRMED", severity: "P3", status: "deferred" },
  ));
  const text = check(rows).problems.join("\n");
  assert.match(text, /needs a severity/);
  assert.match(text, /needs the fixing sub-MR/);
  assert.match(text, /id also on line/);
  assert.match(text, /verdict must be one of/);
  assert.match(text, /status must be one of/);
  assert.match(text, /severity must be one of/);
  assert.match(text, /REJECTED finding has status rejected/);
  assert.match(text, /deferred needs a note/);
});

test("same_as must name a canonical row", () => {
  const { rows } = parse(ledger(
    { id: "A", verdict: "CONFIRMED", severity: "P2", fix: "!1", status: "merged" },
    { id: "B", same_as: "A", verdict: "CONFIRMED", status: "merged" },
    { id: "C", same_as: "B", verdict: "CONFIRMED", status: "merged" },
    { id: "D", same_as: "Z", verdict: "CONFIRMED", status: "merged" },
  ));
  const text = check(rows).problems.join("\n");
  assert.match(text, /\(C\): same_as B is itself a duplicate; name A/);
  assert.match(text, /\(D\): same_as Z is not an id/);
  assert.doesNotMatch(text, /\(B\)/);
});

test("--final fails on an unfixed confirmed P2 and on PENDING rows", () => {
  const r = run(["check", "@", "--final"], ledger(
    { id: "A", verdict: "CONFIRMED", severity: "P2", fix: "!3", status: "fixing" },
    { id: "B", verdict: "PENDING", status: "open" },
    { id: "C", verdict: "CONFIRMED", severity: "P3", status: "deferred", note: "follow-up" },
  ));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /\(A\): confirmed P2 must be merged or blocked, is fixing/);
  assert.match(r.stdout, /\(B\): still PENDING/);
  assert.doesNotMatch(r.stdout, /\(C\)/);
});

test("--final exits 3 and names blocked P0-P2 findings", () => {
  const r = run(["check", "@", "--final"], ledger(
    { id: "A", verdict: "CONFIRMED", severity: "P1", status: "blocked", note: "needs the IDL change in another repository" },
    { id: "B", verdict: "CONFIRMED", severity: "P2", fix: "!4", status: "merged" },
    { id: "C", verdict: "REJECTED", status: "rejected" },
  ));
  assert.equal(r.status, 3, r.stdout);
  assert.match(r.stdout, /^BLOCKED: A \(P1\): needs the IDL change/);
});

test("--final passes when every confirmed finding is closed", () => {
  const r = run(["check", "@", "--final"], ledger(
    { id: "A", verdict: "CONFIRMED", severity: "P1", fix: "!5", status: "merged" },
    { id: "A2", same_as: "A", verdict: "CONFIRMED", status: "merged" },
    { id: "B", verdict: "CONFIRMED", severity: "P3", status: "deferred", note: "follow-up" },
    { id: "C", verdict: "CANNOT_VERIFY", proposed: "P3", status: "deferred", note: "needs a device" },
  ));
  assert.equal(r.status, 0, r.stdout);
});

test("--final fails on an open P3 and an unresolved CANNOT_VERIFY", () => {
  const r = run(["check", "@", "--final"], ledger(
    { id: "A", verdict: "CONFIRMED", severity: "P3", status: "open" },
    { id: "B", verdict: "CANNOT_VERIFY", proposed: "P1", status: "open" },
    { id: "C", verdict: "CANNOT_VERIFY", proposed: "P1", status: "deferred", note: "n" },
  ));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /\(A\): confirmed P3 must be merged or deferred, is open/);
  assert.match(r.stdout, /\(B\): CANNOT_VERIFY with proposed P1 must be blocked, is open/);
  assert.match(r.stdout, /\(C\): CANNOT_VERIFY with proposed P1 must be blocked, is deferred/);
});

test("--final treats a blocked CANNOT_VERIFY as blocking", () => {
  const r = run(["check", "@", "--final"], ledger(
    { id: "A", verdict: "CANNOT_VERIFY", proposed: "P1", status: "blocked", note: "needs a staging account" },
  ));
  assert.equal(r.status, 3, r.stdout);
  assert.match(r.stdout, /BLOCKED: A \(P1\): needs a staging account/);
});

test("--final fails when a duplicate's verdict differs from the row it names", () => {
  const r = run(["check", "@", "--final"], ledger(
    { id: "A", verdict: "REJECTED", status: "rejected" },
    { id: "B", same_as: "A", verdict: "CONFIRMED", severity: "P1", status: "open" },
  ));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /\(B\): verdict CONFIRMED differs from A \(REJECTED\)/);
});

test("summary counts each issue once and splits by severity and status", () => {
  const { rows } = parse(ledger(
    { id: "A", verdict: "CONFIRMED", severity: "P1", fix: "!1", status: "merged" },
    { id: "A2", same_as: "A", verdict: "CONFIRMED", severity: "P2", status: "merged" },
    { id: "B", verdict: "CONFIRMED", severity: "P2", status: "blocked", note: "n" },
    { id: "C", verdict: "CONFIRMED", severity: "P3", status: "deferred", note: "n" },
    { id: "D", verdict: "CONFIRMED", severity: "P3", fix: "!2", status: "fixing" },
    { id: "E", verdict: "REJECTED", status: "rejected" },
    { id: "F", verdict: "PENDING", status: "open" },
  ));
  const s = summarize(rows);
  assert.equal(s.findings, 7);
  assert.equal(s.duplicates, 1);
  assert.equal(s.confirmed, 4);
  assert.equal(s.rejected, 1);
  assert.equal(s.pending, 1);
  assert.deepEqual(s.bySeverity.P1, { total: 1, merged: 1, blocked: 0, deferred: 0, open: 0 });
  assert.deepEqual(s.bySeverity.P2, { total: 1, merged: 0, blocked: 1, deferred: 0, open: 0 });
  assert.deepEqual(s.bySeverity.P3, { total: 2, merged: 0, blocked: 0, deferred: 1, open: 1 });
});

test("summary prints a Markdown table and JSON", () => {
  const text = ledger({ id: "A", verdict: "CONFIRMED", severity: "P2", fix: "!1", status: "merged" });
  const md = run(["summary", "@"], text);
  assert.equal(md.status, 0, md.stderr);
  assert.match(md.stdout, /\| P2 \| 1 \| 1 \| 0 \| 0 \| 0 \|/);
  assert.match(md.stdout, /\| Total \| 1 \| 1 \|/);
  const js = run(["summary", "@", "--json"], text);
  assert.equal(JSON.parse(js.stdout).bySeverity.P2.merged, 1);
});

test("usage errors exit 2", () => {
  assert.equal(run(["count", "@"], ledger()).status, 2);
  assert.equal(run(["check", "@", "--json"], ledger()).status, 2);
  assert.equal(spawnSync(process.execPath, [SCRIPT, "check", path.join(dir, "missing.tsv")]).status, 2);
});
