// Cases for check-delivery.mjs. Run: node --test skills/deliver/scripts/check-delivery.test.mjs
// Each case builds a throwaway git repository: a base commit, a handoff commit
// with the Frozen-Spec and Frozen-Verify trailers, then the owner's commits.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import assert from "node:assert/strict";

const SCRIPT = path.join(import.meta.dirname, "check-delivery.mjs");
const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};
const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const REQ = "docs/specs/feature";

function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), "check-delivery-"));
  dirs.push(dir);
  const git = (...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", env: ENV }).trim();
  const write = (file, text) => {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), text);
  };
  const commit = (message, files) => {
    for (const [file, text] of Object.entries(files)) write(file, text);
    git("add", "-A");
    git("commit", "-q", "-m", message);
    return git("rev-parse", "HEAD");
  };
  const handoff = (spec, verify, extra = "") => {
    commit(
      `handoff\n\nFrozen-Spec: ${REQ}/spec.md sha256=${sha256(spec)}\nFrozen-Verify: ${REQ}/verify.md sha256=${sha256(verify)}${extra}`,
      { [`${REQ}/spec.md`]: spec, [`${REQ}/verify.md`]: verify },
    );
  };
  git("init", "-q", "-b", "main");
  commit("base", { "src/app.ts": "export const a = 1;\n" });
  git("branch", "base");
  git("switch", "-q", "-c", "feature");
  return { dir, git, write, commit, handoff };
}

function check(r, ...args) {
  // Git's default quotePath, so non-ASCII paths come out quoted unless read with -z.
  const env = { ...process.env, GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "core.quotePath", GIT_CONFIG_VALUE_0: "true" };
  const result = spawnSync("node", [SCRIPT, "--repo", r.dir, ...args], { encoding: "utf8", env });
  return { code: result.status, out: result.stdout + result.stderr };
}

const report = (head, { verdict = "PASS", model = "gpt-6.1-sol" } = {}) =>
  `head: ${head}\n验证模型：${model}\nverdict: ${verdict}\n\n| 项 | 结果 | 证据 | 说明 |\n|---|---|---|---|\n| S01 | PASS | evidence/s01.txt | |\n`;

// A delivered branch: handoff, code, plan, and a report for the head.
function delivered(reportOptions) {
  const r = repo();
  r.handoff("spec v1\n", "verify v1\n");
  r.commit("code", {
    "src/app.ts": "export const a = 2;\n",
    "packages/x/package.json": "{}\n",
    [`${REQ}/plan.md`]: "- owner: claude-opus-5-5\n",
  });
  const head = r.git("rev-parse", "HEAD");
  r.write(`${REQ}/evidence/verification-a.md`, report(head, reportOptions));
  return { ...r, head, plan: path.join(r.dir, REQ, "plan.md"), report: path.join(r.dir, REQ, "evidence/verification-a.md") };
}
const full = (r, ...more) => check(r, "--base", "base", "--head", r.git("rev-parse", "HEAD"), "--plan", r.plan, "--report", r.report, ...more);

test("frozen: files match the handoff", () => {
  const r = repo();
  r.handoff("spec\n", "verify\n");
  const { code, out } = check(r, "--base", "base", "--frozen");
  assert.equal(code, 0, out);
});

test("frozen: a later commit changed verify", () => {
  const r = repo();
  r.handoff("spec\n", "verify\n");
  r.commit("edit", { [`${REQ}/verify.md`]: "verify, looser\n" });
  const { code, out } = check(r, "--base", "base", "--frozen");
  assert.equal(code, 1);
  assert.match(out, /verify .* is not the version confirmed/);
  assert.match(out, /git checkout [0-9a-f]{12} -- docs\/specs\/feature\/verify.md/);
});

test("frozen: uncommitted change in the worktree", () => {
  const r = repo();
  r.handoff("spec\n", "verify\n");
  r.write(`${REQ}/spec.md`, "spec edited\n");
  const { code, out } = check(r, "--base", "base", "--frozen");
  assert.equal(code, 1);
  assert.match(out, /spec .* has uncommitted changes/);
});

test("frozen: no handoff commit", () => {
  const r = repo();
  r.commit("no trailers", { [`${REQ}/spec.md`]: "s\n", [`${REQ}/verify.md`]: "v\n" });
  const { code, out } = check(r, "--base", "base", "--frozen");
  assert.equal(code, 1);
  assert.match(out, /no handoff commit/);
});

test("frozen: a handoff with one trailer only", () => {
  const r = repo();
  r.commit(`half\n\nFrozen-Spec: ${REQ}/spec.md sha256=${sha256("s\n")}`, { [`${REQ}/spec.md`]: "s\n" });
  const { code, out } = check(r, "--base", "base", "--frozen");
  assert.equal(code, 1);
  assert.match(out, /verify trailer is missing/);
});

test("frozen: a handoff on the target branch does not count", () => {
  const r = repo();
  r.git("switch", "-q", "base");
  r.handoff("spec\n", "verify\n");
  r.git("switch", "-q", "feature");
  r.git("reset", "-q", "--hard", "base");
  r.git("branch", "-f", "base", "HEAD");
  r.commit("code", { "src/app.ts": "x\n" });
  const { code, out } = check(r, "--base", "base", "--frozen");
  assert.equal(code, 1);
  assert.match(out, /no handoff commit/);
});

test("frozen: a newer handoff replaces the first", () => {
  const r = repo();
  r.handoff("spec v1\n", "verify v1\n");
  r.handoff("spec v2\n", "verify v2\n");
  const { code, out } = check(r, "--base", "base", "--frozen");
  assert.equal(code, 0, out);
});

test("frozen: local paths with the confirmed hashes", () => {
  const r = repo();
  r.write("local/spec.md", "s\n");
  r.write("local/verify.md", "v\n");
  const spec = path.join(r.dir, "local/spec.md");
  const verify = path.join(r.dir, "local/verify.md");
  assert.equal(check(r, "--frozen", "--spec", `${spec}@${sha256("s\n")}`, "--verify", `${verify}@${sha256("v\n")}`).code, 0);
  const { code, out } = check(r, "--frozen", "--spec", `${spec}@${sha256("other\n")}`, "--verify", `${verify}@${sha256("v\n")}`);
  assert.equal(code, 1);
  assert.match(out, /spec is not the version the user confirmed/);
});

test("full: report for the MR head passes", () => {
  const r = delivered();
  const { code, out } = check(r, "--base", "base", "--head", r.head, "--plan", r.plan, "--report", r.report);
  assert.equal(code, 0, out);
  assert.match(out, /verifier openai, owner anthropic/);
});

test("full: only plan, evidence, docs and tests changed after the report", () => {
  const r = delivered();
  r.commit("after", {
    [`${REQ}/plan.md`]: "- owner: claude-opus-5-5\n- done\n",
    [`${REQ}/evidence/shot.png`]: "png",
    "README.md": "readme\n",
    "docs/说明.md": "中文路径\n",
    "src/app.test.ts": "test\n",
    "packages/x/tests/a.ts": "test\n",
  });
  const { code, out } = full(r);
  assert.equal(code, 0, out);
  assert.match(out, /only docs, tests, plan or evidence changed/);
});

test("full: code changed after the report", () => {
  const r = delivered();
  r.commit("fix", { "src/app.ts": "export const a = 3;\n" });
  const { code, out } = full(r);
  assert.equal(code, 1);
  assert.match(out, /code changed since \(src\/app.ts\)/);
});

test("full: a directory named tests inside the source tree is code", () => {
  const r = delivered();
  r.commit("page", { "src/app/tests/page.tsx": "export default 1;\n" });
  const { code, out } = full(r);
  assert.equal(code, 1);
  assert.match(out, /code changed since \(src\/app\/tests\/page.tsx\)/);
});

test("full: a report made before the user re-confirmed spec and verify", () => {
  const r = delivered();
  r.handoff("spec v2\n", "verify v2\n");
  const { code, out } = full(r);
  assert.equal(code, 1);
  assert.match(out, /does not contain the latest handoff/);
});

test("full: report head is not an ancestor of the MR head", () => {
  const r = delivered();
  r.git("commit", "-q", "--amend", "-m", "rewritten");
  const { code, out } = full(r);
  assert.equal(code, 1);
  assert.match(out, /not an ancestor/);
});

test("full: verdict is not PASS", () => {
  const r = delivered({ verdict: "FAIL" });
  const { code, out } = full(r);
  assert.equal(code, 1);
  assert.match(out, /verdict is FAIL/);
});

test("full: verifier of the owner's family", () => {
  const r = delivered({ model: "claude-sonnet-5-5" });
  const { code, out } = full(r);
  assert.equal(code, 1);
  assert.match(out, /same family as the owner/);
});

test("full: verifier line names no model", () => {
  const r = delivered({ model: "the other one" });
  const { code, out } = full(r);
  assert.equal(code, 1);
  assert.match(out, /names no model ID/);
});

test("full: spec changed after the handoff fails even with a good report", () => {
  const r = delivered();
  r.commit("edit spec", { [`${REQ}/spec.md`]: "spec v1, edited\n" });
  const { code, out } = full(r);
  assert.equal(code, 1);
  assert.match(out, /spec .* is not the version confirmed/);
});

test("full: several reports, each must pass", () => {
  const r = delivered();
  const second = path.join(r.dir, REQ, "evidence/verification-b.md");
  r.write(`${REQ}/evidence/verification-b.md`, report(r.head, { model: "mcode minimax-m3" }));
  assert.equal(full(r, "--report", second).code, 0);
  r.write(`${REQ}/evidence/verification-b.md`, report(r.head, { verdict: "UNVERIFIED" }));
  const { code, out } = full(r, "--report", second);
  assert.equal(code, 1);
  assert.match(out, /verification-b.md: verdict is UNVERIFIED/);
});

test("usage: full check needs --head, --plan and --report", () => {
  const r = repo();
  assert.equal(check(r, "--base", "base").code, 2);
  assert.equal(check(r, "--base", "base", "--head", "HEAD", "--plan", "x.md").code, 2);
});
