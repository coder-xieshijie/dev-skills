// Cases for ci-watch.mjs. Run: node --test skills/deliver/scripts/ci-watch.test.mjs
// Each case puts a fake `glab` first on PATH. It answers `glab api` from a
// fixture of rounds; every MR-pipelines call moves to the next round, so a
// case can script a pipeline that runs, then fails or passes.
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import assert from "node:assert/strict";

const SCRIPT = path.join(import.meta.dirname, "ci-watch.mjs");
const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const FAKE_GLAB = `#!/usr/bin/env node
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync(process.env.FAKE_GLAB_FIXTURE, "utf8"));
const counter = process.env.FAKE_GLAB_FIXTURE + ".round";
let round = fs.existsSync(counter) ? Number(fs.readFileSync(counter, "utf8")) : -1;
const endpoint = process.argv[3];
if (/merge_requests\\/\\d+\\/pipelines/.test(endpoint)) fs.writeFileSync(counter, String((round += 1)));
const state = fixture.rounds[Math.min(Math.max(round, 0), fixture.rounds.length - 1)];
let m;
let out;
if (/merge_requests\\/\\d+\\/pipelines/.test(endpoint)) out = state.mrPipelines;
else if ((m = /repository\\/commits\\/(\\w+)/.exec(endpoint))) out = { parent_ids: fixture.parents[m[1]] ?? [] };
else if ((m = /pipelines\\/(\\d+)\\/jobs/.exec(endpoint))) out = state.jobs[m[1]] ?? [];
else if ((m = /pipelines\\/(\\d+)$/.exec(endpoint))) out = { id: Number(m[1]), web_url: "https://ci/p/" + m[1], ...state.pipelines[m[1]] };
else { console.error("unexpected endpoint " + endpoint); process.exit(1); }
console.log(JSON.stringify(out));
`;

function setup(makeFixture) {
  const dir = mkdtempSync(path.join(tmpdir(), "ci-watch-"));
  dirs.push(dir);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com" };
  const git = (...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", env }).trim();
  git("init", "-q", "-b", "main");
  git("commit", "-q", "--allow-empty", "-m", "head");
  const head = git("rev-parse", "HEAD");
  writeFileSync(path.join(dir, "glab"), FAKE_GLAB);
  chmodSync(path.join(dir, "glab"), 0o755);
  const fixture = path.join(dir, "fixture.json");
  writeFileSync(fixture, JSON.stringify(makeFixture(head)));
  const watch = (...extra) => {
    const r = spawnSync(process.execPath, [SCRIPT, "--repo", dir, "--mr", "7", "--head", "HEAD", "--interval", "0.05s", ...extra], {
      encoding: "utf8",
      timeout: 30000,
      env: { ...process.env, PATH: `${dir}${path.delimiter}${process.env.PATH}`, FAKE_GLAB_FIXTURE: fixture },
    });
    return { code: r.status, out: r.stdout + r.stderr };
  };
  return { head, watch };
}

const MERGED = "f".repeat(40);
const OTHER = "e".repeat(40);
const job = (name, status, extra = {}) => ({ id: name.length, name, status, allow_failure: false, ...extra });

test("passes on a merged-result pipeline whose parents include the head", () => {
  const { watch } = setup((head) => ({
    parents: { [MERGED]: ["a".repeat(40), head] },
    rounds: [
      { mrPipelines: [{ id: 1, sha: MERGED }], pipelines: { 1: { status: "running" } }, jobs: { 1: [job("lint", "success"), job("unit", "running")] } },
      { mrPipelines: [{ id: 1, sha: MERGED }], pipelines: { 1: { status: "success" } }, jobs: { 1: [job("lint", "success"), job("unit", "success")] } },
    ],
  }));
  const { code, out } = watch();
  assert.equal(code, 0, out);
  assert.match(out, /pipeline 1 running, 1\/2 jobs done/);
  assert.match(out, /PASSED pipeline 1/);
});

test("returns at the first failed job while the pipeline still runs", () => {
  const { watch } = setup((head) => ({
    parents: {},
    rounds: [
      {
        mrPipelines: [{ id: 2, sha: head }],
        pipelines: { 2: { status: "running" } },
        jobs: { 2: [job("sensitive-keyword", "failed"), job("unit", "running")] },
      },
    ],
  }));
  const { code, out } = watch();
  assert.equal(code, 1, out);
  assert.match(out, /FAILED pipeline 2 \(running\)/);
  assert.match(out, /sensitive-keyword failed/);
});

test("watches the head's pipeline, not a newer one for another head", () => {
  const { watch } = setup((head) => ({
    parents: { [OTHER]: ["a".repeat(40), "b".repeat(40)] },
    rounds: [
      {
        mrPipelines: [{ id: 4, sha: OTHER }, { id: 3, sha: head }],
        pipelines: { 3: { status: "failed" }, 4: { status: "running" } },
        jobs: { 3: [job("unit", "failed")], 4: [job("unit", "running")] },
      },
    ],
  }));
  const { code, out } = watch();
  assert.equal(code, 1, out);
  assert.match(out, /FAILED pipeline 3/);
});

test("a failed job that is allowed to fail does not end the wait", () => {
  const { watch } = setup((head) => ({
    parents: {},
    rounds: [
      { mrPipelines: [{ id: 5, sha: head }], pipelines: { 5: { status: "running" } }, jobs: { 5: [job("advisory", "failed", { allow_failure: true }), job("unit", "running")] } },
      { mrPipelines: [{ id: 5, sha: head }], pipelines: { 5: { status: "success" } }, jobs: { 5: [job("advisory", "failed", { allow_failure: true }), job("unit", "success")] } },
    ],
  }));
  const { code, out } = watch();
  assert.equal(code, 0, out);
});

test("a canceled pipeline counts as failed", () => {
  const { watch } = setup((head) => ({
    parents: {},
    rounds: [{ mrPipelines: [{ id: 6, sha: head }], pipelines: { 6: { status: "canceled" } }, jobs: { 6: [job("unit", "canceled")] } }],
  }));
  const { code, out } = watch();
  assert.equal(code, 1, out);
  assert.match(out, /pipeline 6 canceled/);
});

test("times out with exit 3 when no pipeline covers the head", () => {
  const { watch } = setup(() => ({ parents: {}, rounds: [{ mrPipelines: [], pipelines: {}, jobs: {} }] }));
  const { code, out } = watch("--timeout", "0.3s");
  assert.equal(code, 3, out);
  assert.match(out, /no pipeline yet/);
  assert.match(out, /timed out/);
});

test("usage error when the head is not a commit", () => {
  const { watch } = setup(() => ({ parents: {}, rounds: [{ mrPipelines: [], pipelines: {}, jobs: {} }] }));
  const r = spawnSync(process.execPath, [SCRIPT, "--repo", tmpdir(), "--mr", "7", "--head", "nope"], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /is not a commit/);
  assert.equal(watch("--interval", "fast").code, 2);
});
