#!/usr/bin/env node
// Waits for the GitLab CI pipeline of one MR head and returns as soon as the
// result is known: the first failed job, a running job whose log has stopped
// growing, or the pipeline passing.
//
//   node ci-watch.mjs --repo <worktree> --mr <iid> --head <SHA> [--interval <time>] [--timeout <time>] [--stall <time>|off]
//
// <time> is a number with s, m or h (no unit means seconds for --interval,
// minutes for --timeout and --stall); defaults 60s, 90m and 15m. It calls
// `glab api` in --repo, so glab resolves the project from that checkout's remote.
//
// The pipeline is the newest one of the MR that ran on --head itself or on a
// merged-result commit whose parents include --head. Pipelines of other heads,
// such as one started by a later push, are ignored. A failed job that is not
// allow_failure ends the wait while the rest of the pipeline is still running.
//
// A running job has stalled when its log has not grown for the --stall time;
// `--stall off` turns this check off. GitLab can take in a runner's log in
// batches about a minute apart while no one has the job page open, so keep
// the time well above a minute. The watch reads the log of each running job
// at most once per fifth of that time, as a request conditional on the ETag
// of the previous read: an unchanged log costs a 304, and for a changed one
// glab is stopped once the headers are in, so a large log is not downloaded.
// Only when the server sends no ETag is the log's length compared instead,
// which reads the whole log. The stall is measured from the read that last
// saw a change to the latest read, so it never exceeds how long the log has
// really been still.
//
// When it returns after finding the pipeline, it also lists the comments posted
// on the MR since that pipeline was created (system notes left out), so that an
// automated review that reports on the MR is read together with CI.
//
// Exit 0 when the pipeline passed, 1 when a job failed or the pipeline was
// canceled or skipped, 4 when a running job stalled (each stalled job is
// listed with its id, name, how long its log has been still and its web URL),
// 3 on timeout or when the pipeline stops for a person (manual or scheduled
// jobs), 2 on usage errors. Zero dependencies.
import { execFileSync, spawn } from "node:child_process";

const USAGE = "usage: ci-watch.mjs --repo <worktree> --mr <iid> --head <SHA> [--interval 60s] [--timeout 90m] [--stall 15m|off]";

function usage(message) {
  console.error(`ci-watch: ${message}\n${USAGE}`);
  process.exit(2);
}

function duration(value, key, defaultUnit) {
  const match = /^(\d+(?:\.\d+)?)(s|m|h)?$/.exec(value);
  if (!match || Number(match[1]) <= 0) usage(`${key} takes a positive number with s, m or h${key === "--stall" ? ", or off" : ""}, got ${value}`);
  return Number(match[1]) * { s: 1000, m: 60000, h: 3600000 }[match[2] ?? defaultUnit];
}

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i];
  if (!["--repo", "--mr", "--head", "--interval", "--timeout", "--stall"].includes(key)) usage(`unknown argument ${key}`);
  if (i + 1 >= argv.length) usage(`missing value for ${key}`);
  args[key.slice(2)] = argv[(i += 1)];
}
if (!args.repo) usage("--repo is required");
if (!/^\d+$/.test(args.mr ?? "")) usage("--mr takes the MR number (iid)");
if (!args.head) usage("--head is required: the MR head the pipeline must cover");
const intervalMs = duration(args.interval ?? "60s", "--interval", "s");
const timeoutMs = duration(args.timeout ?? "90m", "--timeout", "m");
const stall = args.stall ?? "15m";
const stallMs = stall === "off" ? 0 : duration(stall, "--stall", "m");

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

function listComments(since) {
  try {
    const notes = [];
    for (let page = 1; ; page += 1) {
      const batch = api(`projects/:id/merge_requests/${args.mr}/notes?sort=asc&order_by=created_at&per_page=100&page=${page}`);
      notes.push(...batch);
      if (batch.length < 100) break;
    }
    const from = Date.parse(since);
    const recent = notes.filter((n) => !n.system && !(Date.parse(n.created_at) < from));
    if (!recent.length) {
      console.log(`ci-watch: no comments on the MR since ${since}`);
      return;
    }
    console.log(`ci-watch: ${recent.length} comment(s) on the MR since ${since}:`);
    for (const n of recent) {
      const first = String(n.body ?? "").split("\n").find((line) => line.trim() && !line.trim().startsWith("<!--")) ?? "";
      const state = n.resolvable ? (n.resolved ? " (resolved)" : " (unresolved)") : "";
      console.log(`  note ${n.id} by ${n.author?.username ?? "unknown"} at ${n.created_at}${state}: ${first.trim().slice(0, 160)}`);
    }
  } catch (error) {
    const detail = String(error.stderr || error.message).trim().split("\n")[0];
    console.error(`ci-watch: could not read the MR comments: ${detail}`);
  }
}

// Reads one job's log with `glab api --include`, conditional on the ETag of
// the previous read when there is one. Resolves to { unchanged: true } on 304;
// otherwise to { etag, mark }, where mark identifies this version of the log:
// its ETag, or its length when the server sends no ETag.
function readLog(jobId, etag) {
  const glabArgs = ["api", "--include", ...(etag ? ["--header", `If-None-Match: ${etag}`] : []), `projects/:id/jobs/${jobId}/trace`];
  return new Promise((resolve, reject) => {
    const child = spawn("glab", glabArgs, { cwd: args.repo, stdio: ["ignore", "pipe", "pipe"] });
    let headers = "";
    let status;
    let bytes = 0;
    let stderr = "";
    let settled = false;
    const settle = (done, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      done(value);
    };
    const timer = setTimeout(() => settle(reject, new Error("no answer within 2 minutes")), 120000);
    child.on("error", (error) => settle(reject, error));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.stdout.on("data", (chunk) => {
      if (status !== undefined) return void (bytes += chunk.length);
      headers += chunk.toString("latin1");
      const end = /\r?\n\r?\n/.exec(headers);
      if (!end) return;
      const lines = headers.slice(0, end.index).split(/\r?\n/);
      status = Number(/^HTTP\/\S+ (\d{3})/.exec(lines[0])?.[1]);
      bytes = headers.length - end.index - end[0].length;
      const tag = lines.find((line) => /^etag:/i.test(line))?.slice(5).trim();
      if (status === 304) settle(resolve, { unchanged: true });
      else if (status !== 200) settle(reject, new Error(lines[0]));
      else if (tag) settle(resolve, { etag: tag, mark: tag });
    });
    child.on("close", () => {
      if (status === 200) settle(resolve, { mark: `${bytes} bytes` });
      else settle(reject, new Error(stderr.trim().split("\n")[0] || "no response"));
    });
  });
}

const logs = new Map();
const logErrors = new Map();
async function stalledJobs(jobs) {
  const running = jobs.filter((j) => j.status === "running");
  for (const id of logs.keys()) if (!running.some((j) => j.id === id)) logs.delete(id);
  const due = running.filter((j) => !(logs.get(j.id)?.readAt > Date.now() - stallMs / 5));
  await Promise.all(
    due.map(async (j) => {
      const at = Date.now();
      try {
        const read = await readLog(j.id, logs.get(j.id)?.etag);
        if (!logs.has(j.id)) logs.set(j.id, { changedAt: at });
        const log = logs.get(j.id);
        if (!read.unchanged && read.mark !== log.mark) Object.assign(log, { etag: read.etag, mark: read.mark, changedAt: at });
        log.readAt = at;
        logErrors.delete(j.id);
      } catch (error) {
        const detail = String(error.message).trim().split("\n")[0];
        if (logErrors.get(j.id) !== detail) console.error(`ci-watch: could not read the log of job ${j.id} ${j.name}: ${detail}`);
        logErrors.set(j.id, detail);
      }
    }),
  );
  return running
    .map((j) => ({ job: j, log: logs.get(j.id) }))
    .filter(({ log }) => log?.readAt !== undefined && log.readAt - log.changedAt >= stallMs);
}

function took(ms) {
  const s = Math.round(ms / 1000);
  if (s >= 3600) return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`;
  return s >= 60 ? `${Math.floor(s / 60)}m${s % 60}s` : `${s}s`;
}

let seenPipeline;
function finish(code) {
  if (seenPipeline?.created_at) listComments(seenPipeline.created_at);
  process.exit(code);
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
      seenPipeline = pipeline;
      const jobs = jobsOf(match.id);
      const failed = jobs.filter((j) => j.status === "failed" && !j.allow_failure);
      if (failed.length) {
        console.log(`ci-watch: FAILED pipeline ${pipeline.id} (${pipeline.status}) for ${short(head)} ${pipeline.web_url ?? ""}`.trimEnd());
        for (const j of failed) console.log(`  job ${j.id} ${j.name} failed ${j.web_url ?? ""}`.trimEnd());
        finish(1);
      }
      if (pipeline.status === "success") {
        console.log(`ci-watch: PASSED pipeline ${pipeline.id} for ${short(head)} ${pipeline.web_url ?? ""}`.trimEnd());
        finish(0);
      }
      if (FAILED.includes(pipeline.status)) {
        console.log(`ci-watch: pipeline ${pipeline.id} ${pipeline.status} for ${short(head)} ${pipeline.web_url ?? ""}`.trimEnd());
        finish(1);
      }
      if (ENDED_FOR_A_PERSON.includes(pipeline.status)) {
        console.log(`ci-watch: pipeline ${pipeline.id} is ${pipeline.status}: it waits for a person ${pipeline.web_url ?? ""}`.trimEnd());
        finish(3);
      }
      const stalled = stallMs ? await stalledJobs(jobs) : [];
      if (stalled.length) {
        console.log(`ci-watch: STALLED pipeline ${pipeline.id} (${pipeline.status}) for ${short(head)}: a running job's log has not grown for ${stall} ${pipeline.web_url ?? ""}`.trimEnd());
        for (const { job: j, log } of stalled)
          console.log(`  job ${j.id} ${j.name} stalled: log unchanged for ${took(log.readAt - log.changedAt)}, since ${new Date(log.changedAt).toISOString()} ${j.web_url ?? ""}`.trimEnd());
        finish(4);
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
    finish(3);
  }
  await sleep(intervalMs);
}
