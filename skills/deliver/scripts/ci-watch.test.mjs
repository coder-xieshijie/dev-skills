// Cases for ci-watch.mjs. Run: node --test skills/deliver/scripts/ci-watch.test.mjs
// Each case puts a fake `glab` first on PATH. It answers `glab api` from a
// fixture of rounds; every MR-pipelines call moves to the next round, so a
// case can script a pipeline that runs, then fails or passes. MR notes come from
// the fixture's notes. A job's log comes from the round's logs, followed by
// logPad bytes of padding, and is answered like GitLab does: with a weak ETag
// (none when noEtag is set), and 304 to an If-None-Match that matches. The fake
// appends every endpoint it is asked for to <fixture>.calls, and the line
// "log body sent" once a whole log body has been written.
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const calls = process.env.FAKE_GLAB_FIXTURE + ".calls";
let round = fs.existsSync(counter) ? Number(fs.readFileSync(counter, "utf8")) : -1;
const endpoint = process.argv[process.argv.length - 1];
fs.appendFileSync(calls, process.argv.slice(2).join(" ") + "\\n");
if (/merge_requests\\/\\d+\\/pipelines/.test(endpoint)) fs.writeFileSync(counter, String((round += 1)));
const state = fixture.rounds[Math.min(Math.max(round, 0), fixture.rounds.length - 1)];
let m;
let out;
if ((m = /jobs\\/(\\d+)\\/trace$/.exec(endpoint))) {
  const body = ((state.logs ?? {})[m[1]] ?? "") + "x".repeat(fixture.logPad ?? 0);
  const etag = 'W/"' + require("crypto").createHash("md5").update(body).digest("hex") + '"';
  const asked = process.argv.find((a) => a.startsWith("If-None-Match: "));
  if (!fixture.noEtag && asked === "If-None-Match: " + etag) {
    process.stdout.write("HTTP/2.0 304 Not Modified\\nEtag: " + etag + "\\r\\n\\r\\n");
    process.exitCode = 1;
  } else {
    process.stdout.write("HTTP/2.0 200 OK\\nContent-Type: text/plain\\r\\n" + (fixture.noEtag ? "" : "Etag: " + etag + "\\r\\n") + "\\r\\n");
    process.stdout.write(body, () => fs.appendFileSync(calls, "log body sent\\n"));
  }
  return;
}
if (/merge_requests\\/\\d+\\/pipelines/.test(endpoint)) out = state.mrPipelines;
else if (/merge_requests\\/\\d+\\/notes/.test(endpoint)) out = fixture.notes ?? [];
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
  const calls = () => {
    try {
      return readFileSync(`${fixture}.calls`, "utf8");
    } catch {
      return "";
    }
  };
  return { head, watch, calls, reset: () => rmSync(`${fixture}.calls`, { force: true }) };
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

test("lists the comments posted on the MR since the pipeline started", () => {
  const { watch } = setup((head) => ({
    parents: {},
    notes: [
      { id: 10, system: false, created_at: "2026-10-17T13:00:00.000Z", author: { username: "alice" }, body: "before the push" },
      { id: 11, system: true, created_at: "2026-10-17T13:40:00.000Z", author: { username: "bot" }, body: "added 1 commit" },
      { id: 12, system: false, created_at: "2026-10-17T13:44:00.000Z", author: { username: "review-bot" }, resolvable: true, resolved: false, body: "<!-- marker -->\n# Review: findings\nP1 replay is not deduplicated" },
    ],
    rounds: [
      { mrPipelines: [{ id: 8, sha: head }], pipelines: { 8: { status: "success", created_at: "2026-10-17T13:35:00.000Z" } }, jobs: { 8: [job("unit", "success")] } },
    ],
  }));
  const { code, out } = watch();
  assert.equal(code, 0, out);
  assert.match(out, /1 comment\(s\) on the MR since 2026-10-17T13:35:00.000Z/);
  assert.match(out, /note 12 by review-bot at 2026-10-17T13:44:00.000Z \(unresolved\): # Review: findings/);
  assert.doesNotMatch(out, /note 10|note 11/);
});

test("says so when no comment was posted since the pipeline started", () => {
  const { watch } = setup((head) => ({
    parents: {},
    rounds: [{ mrPipelines: [{ id: 9, sha: head }], pipelines: { 9: { status: "failed", created_at: "2026-10-17T13:35:00.000Z" } }, jobs: { 9: [job("unit", "failed")] } }],
  }));
  const { code, out } = watch();
  assert.equal(code, 1, out);
  assert.match(out, /no comments on the MR since 2026-10-17T13:35:00.000Z/);
});

const running = (id, name) => ({ id, name, status: "running", allow_failure: false, web_url: `https://ci/j/${id}` });

test("returns 4 when a running job's log stops growing, without downloading the log", () => {
  const { watch, calls } = setup((head) => ({
    parents: {},
    logPad: 16 * 1024 * 1024,
    rounds: [{ mrPipelines: [{ id: 10, sha: head }], pipelines: { 10: { status: "running" } }, jobs: { 10: [job("lint", "success"), running(42, "e2e")] }, logs: { 42: "step 1\n" } }],
  }));
  const { code, out } = watch("--stall", "0.4s");
  assert.equal(code, 4, out);
  assert.match(out, /STALLED pipeline 10 \(running\) for \w+: a running job's log has not grown for 0\.4s https:\/\/ci\/p\/10/);
  assert.match(out, /job 42 e2e stalled: log unchanged for \d+s, since \d{4}-\d\d-\d\dT[\d:.]+Z https:\/\/ci\/j\/42/);
  assert.doesNotMatch(out, /job \d+ lint stalled/);
  assert.match(calls(), /--header If-None-Match: W\/"\w+" projects\/:id\/jobs\/42\/trace/);
  assert.doesNotMatch(calls(), /log body sent/);
});

test("a running job whose log keeps growing does not end the wait", () => {
  const { watch } = setup((head) => {
    const growing = Array.from({ length: 8 }, (_, i) => ({
      mrPipelines: [{ id: 11, sha: head }],
      pipelines: { 11: { status: "running" } },
      jobs: { 11: [running(43, "build")] },
      logs: { 43: "line\n".repeat(i + 1) },
    }));
    return { parents: {}, rounds: [...growing, { mrPipelines: [{ id: 11, sha: head }], pipelines: { 11: { status: "success" } }, jobs: { 11: [job("build", "success")] } }] };
  });
  const { code, out } = watch("--stall", "0.3s");
  assert.equal(code, 0, out);
  assert.doesNotMatch(out, /STALLED/);
  assert.match(out, /PASSED pipeline 11/);
});

test("compares the log's length when the server sends no ETag", () => {
  const { watch, calls } = setup((head) => ({
    parents: {},
    noEtag: true,
    rounds: [{ mrPipelines: [{ id: 12, sha: head }], pipelines: { 12: { status: "running" } }, jobs: { 12: [running(44, "deploy-preview")] }, logs: { 44: "waiting\n" } }],
  }));
  const { code, out } = watch("--stall", "0.3s");
  assert.equal(code, 4, out);
  assert.match(out, /job 44 deploy-preview stalled/);
  assert.match(calls(), /log body sent/);
  assert.doesNotMatch(calls(), /If-None-Match/);
});

test("--stall takes a time like --timeout, minutes when it has no unit", () => {
  const { watch } = setup((head) => ({
    parents: {},
    rounds: [{ mrPipelines: [{ id: 13, sha: head }], pipelines: { 13: { status: "running" } }, jobs: { 13: [running(45, "e2e")] }, logs: { 45: "step 1\n" } }],
  }));
  for (const bad of ["fast", "0", "-1m", "on"]) {
    const { code, out } = watch("--stall", bad);
    assert.equal(code, 2, out);
    assert.match(out, /--stall takes a positive number with s, m or h, or off/);
  }
  const { code, out } = watch("--stall", "1", "--timeout", "2s");
  assert.equal(code, 3, out);
  assert.match(out, /timed out/);
});

test("the stall check is on by default, and --stall off turns it off", () => {
  const { watch, calls, reset } = setup((head) => ({
    parents: {},
    rounds: [{ mrPipelines: [{ id: 14, sha: head }], pipelines: { 14: { status: "running" } }, jobs: { 14: [running(46, "e2e")] }, logs: { 46: "step 1\n" } }],
  }));
  assert.equal(watch("--timeout", "0.3s").code, 3);
  assert.match(calls(), /jobs\/46\/trace/);
  reset();
  const { code, out } = watch("--stall", "off", "--timeout", "0.3s");
  assert.equal(code, 3, out);
  assert.doesNotMatch(calls(), /trace/);
});
