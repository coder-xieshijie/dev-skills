#!/usr/bin/env node
// Waits for the GitLab CI pipeline of one MR head and returns as soon as the
// result is known: the first failed job, or the pipeline passing.
//
//   node ci-watch.mjs --repo <worktree> --mr <iid> --head <SHA> [--interval <time>] [--timeout <time>]
//
// <time> is a number with s, m or h (no unit means seconds for --interval,
// minutes for --timeout); defaults 60s and 90m. It calls `glab api` in --repo,
// so glab resolves the project from that checkout's remote.
//
// The pipeline is the newest one of the MR that ran on --head itself or on a
// merged-result commit whose parents include --head. Pipelines of other heads,
// such as one started by a later push, are ignored. A failed job that is not
// allow_failure ends the wait while the rest of the pipeline is still running.
//
// Exit 0 when the pipeline passed, 1 when a job failed or the pipeline was
// canceled or skipped, 3 on timeout or when the pipeline stops for a person
// (manual or scheduled jobs), 2 on usage errors. Zero dependencies.
import { execFileSync } from "node:child_process";

const USAGE = "usage: ci-watch.mjs --repo <worktree> --mr <iid> --head <SHA> [--interval 60s] [--timeout 90m]";

function usage(message) {
  console.error(`ci-watch: ${message}\n${USAGE}`);
  process.exit(2);
}

function duration(value, key, defaultUnit) {
  const match = /^(\d+(?:\.\d+)?)(s|m|h)?$/.exec(value);
  if (!match || Number(match[1]) <= 0) usage(`${key} takes a positive number with s, m or h, got ${value}`);
  return Number(match[1]) * { s: 1000, m: 60000, h: 3600000 }[match[2] ?? defaultUnit];
}

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i];
  if (!["--repo", "--mr", "--head", "--interval", "--timeout"].includes(key)) usage(`unknown argument ${key}`);
  if (i + 1 >= argv.length) usage(`missing value for ${key}`);
  args[key.slice(2)] = argv[(i += 1)];
}
if (!args.repo) usage("--repo is required");
if (!/^\d+$/.test(args.mr ?? "")) usage("--mr takes the MR number (iid)");
if (!args.head) usage("--head is required: the MR head the pipeline must cover");
const intervalMs = duration(args.interval ?? "60s", "--interval", "s");
const timeoutMs = duration(args.timeout ?? "90m", "--timeout", "m");

let head;
try {
  head = execFileSync("git", ["-C", args.repo, "rev-parse", "--verify", `${args.head}^{commit}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
} catch {
  usage(`--head ${args.head} is not a commit in ${args.repo}; fetch it first`);
}

const api = (endpoint) =>
  JSON.parse(
    execFileSync("glab", ["api", endpoint], {
      cwd: args.repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    }),
  );
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const short = (sha) => sha.slice(0, 12);

const parents = new Map();
function covers(pipeline) {
  if (pipeline.sha === head) return true;
  if (!parents.has(pipeline.sha)) parents.set(pipeline.sha, api(`projects/:id/repository/commits/${pipeline.sha}`).parent_ids ?? []);
  return parents.get(pipeline.sha).includes(head);
}

function jobsOf(id) {
  const jobs = [];
  for (let page = 1; ; page += 1) {
    const batch = api(`projects/:id/pipelines/${id}/jobs?per_page=100&page=${page}`);
    jobs.push(...batch);
    if (batch.length < 100) return jobs;
  }
}

const ENDED_FOR_A_PERSON = ["manual", "scheduled"];
const FAILED = ["failed", "canceled", "skipped"];
const deadline = Date.now() + timeoutMs;
let lastLine = "";
let apiErrors = 0;
const say = (line) => {
  if (line !== lastLine) console.log(line);
  lastLine = line;
};

while (true) {
  try {
    const pipelines = api(`projects/:id/merge_requests/${args.mr}/pipelines?per_page=20`);
    const match = pipelines.find(covers);
    if (!match) say(`ci-watch: no pipeline yet for ${short(head)}`);
    else {
      const pipeline = api(`projects/:id/pipelines/${match.id}`);
      const jobs = jobsOf(match.id);
      const failed = jobs.filter((j) => j.status === "failed" && !j.allow_failure);
      if (failed.length) {
        console.log(`ci-watch: FAILED pipeline ${pipeline.id} (${pipeline.status}) for ${short(head)} ${pipeline.web_url ?? ""}`.trimEnd());
        for (const j of failed) console.log(`  job ${j.id} ${j.name} failed ${j.web_url ?? ""}`.trimEnd());
        process.exit(1);
      }
      if (pipeline.status === "success") {
        console.log(`ci-watch: PASSED pipeline ${pipeline.id} for ${short(head)} ${pipeline.web_url ?? ""}`.trimEnd());
        process.exit(0);
      }
      if (FAILED.includes(pipeline.status)) {
        console.log(`ci-watch: pipeline ${pipeline.id} ${pipeline.status} for ${short(head)} ${pipeline.web_url ?? ""}`.trimEnd());
        process.exit(1);
      }
      if (ENDED_FOR_A_PERSON.includes(pipeline.status)) {
        console.log(`ci-watch: pipeline ${pipeline.id} is ${pipeline.status}: it waits for a person ${pipeline.web_url ?? ""}`.trimEnd());
        process.exit(3);
      }
      const done = jobs.filter((j) => ["success", "failed", "canceled", "skipped", "manual"].includes(j.status)).length;
      say(`ci-watch: pipeline ${pipeline.id} ${pipeline.status}, ${done}/${jobs.length} jobs done`);
    }
    apiErrors = 0;
  } catch (error) {
    apiErrors += 1;
    const detail = String(error.stderr || error.message).trim().split("\n")[0];
    console.error(`ci-watch: glab call failed (${apiErrors} in a row): ${detail}`);
  }
  if (Date.now() + intervalMs > deadline) {
    console.log(`ci-watch: timed out after ${args.timeout ?? "90m"} waiting for ${short(head)}`);
    process.exit(3);
  }
  await sleep(intervalMs);
}
