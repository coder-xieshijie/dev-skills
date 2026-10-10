// Cases for stall-guard.mjs. Run: node --test skills/deliver/scripts/stall-guard.test.mjs
// Each case runs a short node child under the guard with an idle limit of
// about a second.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import assert from "node:assert/strict";

const SCRIPT = path.join(import.meta.dirname, "stall-guard.mjs");
const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const guard = (args, child) =>
  spawnSync(process.execPath, [SCRIPT, ...args, "--", process.execPath, "-e", child], {
    encoding: "utf8",
    timeout: 30000,
  });

test("passes the command's output and exit code through", () => {
  const r = guard(["--idle", "5s"], "console.log('out'); console.error('err'); process.exit(3)");
  assert.equal(r.status, 3);
  assert.equal(r.stdout, "out\n");
  assert.equal(r.stderr, "err\n");
});

test("stops a command that is silent for the idle limit, with exit 124", () => {
  const started = Date.now();
  const r = guard(["--idle", "1s"], "setTimeout(() => {}, 20000)");
  assert.equal(r.status, 124);
  assert.match(r.stderr, /^stall-guard: stalled: no output for 1s/m);
  assert.ok(Date.now() - started < 15000, "stopped long before the child would have ended");
});

test("keeps a command that keeps printing, past the idle limit", () => {
  const r = guard(
    ["--idle", "1s"],
    "let n = 0; const t = setInterval(() => { console.log(n); if (++n === 8) { clearInterval(t); } }, 300)",
  );
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim().split("\n").length, 8);
});

test("keeps a silent command whose watched directory keeps changing", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "stall-guard-"));
  dirs.push(dir);
  const file = JSON.stringify(path.join(dir, "results.md"));
  const r = guard(
    ["--idle", "1s", "--watch", dir],
    `const fs = require('fs'); let n = 0; const t = setInterval(() => { fs.appendFileSync(${file}, n + '\\n'); if (++n === 8) clearInterval(t); }, 300)`,
  );
  assert.equal(r.status, 0, r.stderr);
});

test("stops a silent command whose watched path does not change", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "stall-guard-"));
  dirs.push(dir);
  const r = guard(["--idle", "1s", "--watch", dir], "setTimeout(() => {}, 20000)");
  assert.equal(r.status, 124);
  assert.match(r.stderr, new RegExp(`no change under ${dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("rejects bad usage with exit 2", () => {
  const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
  assert.equal(run(["node", "-e", "1"]).status, 2);
  assert.equal(run(["--"]).status, 2);
  assert.equal(run(["--idle", "soon", "--", "node", "-e", "1"]).status, 2);
  assert.equal(run(["--wait", "1", "--", "node", "-e", "1"]).status, 2);
});
