#!/usr/bin/env node
// Start the deliver Skill's independent verification in a separate session of
// another model family, and leave a run record that check-delivery.mjs reads.
//
//   node run-verifier.mjs --cli <codex|claude|mcode> --checkout <dir> --head <sha>
//                         --inputs <inputs.md> --verify <verify.md> --report <report.md>
//                         [--model <provider/model>] [--effort <level>] [--add-dir <dir>]...
//                         [--needs-gui] [--unsandboxed] [--timeout <min>] [--stall <min>]
//                         [--brief <verifier-brief.md>]
//   node run-verifier.mjs --preflight --cli <codex|claude|mcode> [--model <provider/model>]
//                         [--effort <level>] [--needs-gui] [--unsandboxed] [--owner-family <family>]
//
// The verifier reads the fixed brief and the caller's inputs file and returns
// its report as the final message; this script writes that message to
// --report, so the report hash in the run record is what the verifier said.
// Next to the report it writes <report>.run.json and <report>.log. The log
// grows while the CLI runs, and <report>.status.json says what the run is
// doing and when it last wrote evidence.
//
// A run ends by itself: after --timeout minutes (default 90), or after
// --stall minutes (default 20) in which no file under the --add-dir
// directories changed. Only evidence counts as progress, not the CLI's own
// output. The run record names the terminal reason: completed, cli_failed,
// invalid_report, stalled, timed_out or checkout_changed.
//
// --preflight makes one short call with the same CLI, model, effort and
// sandbox, and checks that the CLI answers, reports its model and session,
// and that the model's family is known and differs from --owner-family. Run
// it when starting a delivery, so an unusable verifier shows up at once.
//
// --needs-gui says verify.md drives a desktop or other GUI entry. Codex runs
// its commands in a sandbox (workspace-write) that cannot launch such apps
// (Playwright: "Process failed to launch!", 2026-09-30), so codex with
// --needs-gui requires --unsandboxed, which switches it to
// danger-full-access, the same trust level as claude's bypassPermissions and
// mcode's --permission full. --effort sets the reasoning effort explicitly
// (codex model_reasoning_effort, claude --effort, mcode --effort).
//
// The model family is derived from the model ID (claude -> anthropic, gpt/o*
// -> openai, MiniMax -> minimax, gemini -> google), never from the provider
// name, so a gateway cannot pass a same-family model off as another family.
// An ID the script cannot place makes the run invalid.
//
// Exit 0: valid report (or preflight passed), checkout untouched.
// Exit 1: the CLI call succeeded but the report or the run record is invalid
//         after one retry, or the verifier changed the checkout.
// Exit 2: usage error or the checkout is not at --head / not clean.
// Exit 3: the CLI is unusable here: missing, not logged in, the model or
//         sandbox cannot serve the verification, the call failed twice, or
//         the run stalled or timed out. Try another family's CLI.
// Zero dependencies.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { familyOf } from "./model-family.mjs";
import { parseReport, parseVerify, reportProblems } from "./report-format.mjs";

const USAGE =
  "usage: run-verifier.mjs --cli <codex|claude|mcode> --checkout <dir> --head <sha> " +
  "--inputs <inputs.md> --verify <verify.md> --report <report.md> [--model <provider/model>] " +
  "[--effort <level>] [--add-dir <dir>]... [--needs-gui] [--unsandboxed] [--timeout <min>] [--stall <min>] [--brief <path>]\n" +
  "       run-verifier.mjs --preflight --cli <codex|claude|mcode> [--model <provider/model>] [--effort <level>] " +
  "[--needs-gui] [--unsandboxed] [--owner-family <family>]";

function fail(code, message) {
  console.error(`run-verifier: ${message}`);
  if (code === 2) console.error(USAGE);
  process.exit(code);
}

const FLAGS = ["preflight", "needs-gui", "unsandboxed"];
const KEYS = ["cli", "checkout", "head", "inputs", "verify", "report", "model", "effort", "add-dir", "brief",
  "timeout", "stall", "owner-family"];
const args = { "add-dir": [] };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i].replace(/^--/, "");
  if (!argv[i].startsWith("--")) fail(2, `unknown argument ${argv[i]}`);
  if (FLAGS.includes(key)) {
    args[key] = true;
    continue;
  }
  if (!KEYS.includes(key)) fail(2, `unknown argument ${argv[i]}`);
  if (i + 1 >= argv.length) fail(2, `missing value for --${key}`);
  const value = argv[(i += 1)];
  if (key === "add-dir") args[key].push(path.resolve(value));
  else args[key] = value;
}
if (!args.cli) fail(2, "--cli is required");
if (!["codex", "claude", "mcode"].includes(args.cli)) fail(2, `unsupported --cli ${args.cli}`);
if (args.effort && !/^[a-z]+$/.test(args.effort)) fail(2, `--effort must be a level name such as high: ${args.effort}`);
const minutes = (key, fallback) => {
  const value = args[key] === undefined ? fallback : Number(args[key]);
  if (!(value > 0)) fail(2, `--${key} must be a positive number of minutes`);
  return value;
};
const timeoutMs = minutes("timeout", 90) * 60_000;
const stallMs = minutes("stall", 20) * 60_000;
const sandbox = args.cli === "codex"
  ? (args.unsandboxed ? "danger-full-access" : "workspace-write")
  : args.cli === "claude" ? "none (bypassPermissions)" : "none (--permission full)";

if (args["needs-gui"] && args.cli === "codex" && !args.unsandboxed)
  fail(3, "codex's workspace-write sandbox cannot launch GUI apps (Playwright: Process failed to launch!); " +
    "add --unsandboxed, or use claude or mcode");

function onPath(cmd) {
  return spawnSync("sh", ["-c", `command -v ${cmd}`], { encoding: "utf8" }).status === 0;
}
if (!onPath(args.cli)) fail(3, `${args.cli} is not installed`);
if (args.cli === "claude") {
  const auth = spawnSync("claude", ["auth", "status"], { encoding: "utf8" });
  let loggedIn = false;
  try {
    loggedIn = JSON.parse(auth.stdout).loggedIn === true;
  } catch {}
  if (!loggedIn) fail(3, "claude is not logged in (claude auth status)");
}
if (args.cli === "codex") {
  const auth = spawnSync("codex", ["login", "status"], { encoding: "utf8" });
  if (auth.status !== 0) fail(3, "codex is not logged in (codex login status)");
}

// The command for one call. cwd is the checkout for a verification and a
// scratch directory, outside any git repository, for the preflight.
function command(prompt, cwd, out, addDirs, scratch = false) {
  let cmd;
  if (args.cli === "codex") {
    cmd = ["codex", "exec", "-C", cwd, "-s", sandbox];
    if (scratch) cmd.push("--skip-git-repo-check");
    if (sandbox === "workspace-write") cmd.push("-c", "sandbox_workspace_write.network_access=true");
    cmd.push(...addDirs.flatMap((d) => ["--add-dir", d]), "-o", out);
    if (args.model) cmd.push("-m", args.model);
    if (args.effort) cmd.push("-c", `model_reasoning_effort=${args.effort}`);
    cmd.push(prompt);
  } else if (args.cli === "claude") {
    cmd = ["claude", "-p", prompt, "--permission-mode", "bypassPermissions",
      "--output-format", "json", ...addDirs.flatMap((d) => ["--add-dir", d])];
    if (args.model) cmd.push("--model", args.model);
    if (args.effort) cmd.push("--effort", args.effort);
  } else {
    cmd = ["mcode", "exec", "--cwd", cwd, "--permission", "full", "--output-format", "json", "-o", out];
    if (args.model) cmd.push("--model", args.model);
    if (args.effort) cmd.push("--effort", args.effort);
    cmd.push(prompt);
  }
  return cmd;
}

// Read the final message, model, provider and session from a finished call.
function parseCall(stdout, stderr, out, status) {
  const result = { status, text: "", model: null, provider: null, session: null };
  const both = `${stdout}\n${stderr}`;
  if (args.cli === "codex") {
    result.text = existsSync(out) ? readFileSync(out, "utf8") : "";
    result.model = both.match(/^model:\s*(\S+)\s*$/m)?.[1] ?? null;
    result.provider = both.match(/^provider:\s*(\S+)\s*$/m)?.[1] ?? null;
    result.session = both.match(/^session id:\s*(\S+)\s*$/m)?.[1] ?? null;
    return result;
  }
  let json = null;
  try {
    json = JSON.parse(stdout);
  } catch {}
  if (args.cli === "claude" && json) {
    result.text = typeof json.result === "string" ? json.result : "";
    result.session = json.session_id ?? null;
    result.model = json.model ?? Object.keys(json.modelUsage ?? {})[0] ?? null;
    result.provider = "anthropic";
    if (json.is_error) result.status = result.status || 1;
  } else if (args.cli === "mcode" && json) {
    result.text = existsSync(out) ? readFileSync(out, "utf8") : (json.output ?? "");
    result.session = json.sessionId ?? null;
    result.model = json.model?.modelId ?? null;
    result.provider = json.model?.providerId ?? null;
    if (json.status !== "succeeded") result.status = result.status || 1;
  }
  return result;
}

// Newest modification time under the watched directories, ignoring the
// files this script writes itself.
function newestEvidence(dirs, own) {
  let newest = 0;
  const walk = (dir, depth) => {
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (own.has(file)) continue;
      try {
        const stat = statSync(file);
        if (stat.mtimeMs > newest) newest = stat.mtimeMs;
        if (entry.isDirectory() && depth < 8) walk(file, depth + 1);
      } catch {}
    }
  };
  for (const dir of dirs) walk(dir, 0);
  return newest;
}

// Run one call, streaming its output to logPath. Resolves with the parsed
// call plus terminal: "exited", "stalled" or "timed_out".
function run(cmd, cwd, out, { logPath, statusPath, watch, own, limitMs, stallAfterMs }) {
  return new Promise((resolve) => {
    const started = Date.now();
    let lastEvidence = Math.max(started, newestEvidence(watch, own));
    let stdout = "";
    let stderr = "";
    let terminal = "exited";
    const child = spawn(cmd[0], cmd.slice(1), { cwd, stdio: ["ignore", "pipe", "pipe"], detached: true });
    const log = (text) => logPath && appendFileSync(logPath, text);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      log(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      log(chunk);
    });
    const status = (state) =>
      statusPath &&
      writeFileSync(statusPath, `${JSON.stringify({
        state, pid: child.pid, cli: args.cli, started_at: new Date(started).toISOString(),
        last_evidence_at: new Date(lastEvidence).toISOString(), elapsed_s: Math.round((Date.now() - started) / 1000),
      }, null, 2)}\n`);
    const stop = (why) => {
      terminal = why;
      log(`\n--- run-verifier: stopping (${why})\n`);
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {}
      setTimeout(() => {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {}
      }, 10_000).unref();
    };
    const timer = setInterval(() => {
      const newest = newestEvidence(watch, own);
      if (newest > lastEvidence) lastEvidence = newest;
      status("running");
      if (Date.now() - started > limitMs) stop("timed_out");
      else if (stallAfterMs && Date.now() - lastEvidence > stallAfterMs) stop("stalled");
    }, Math.max(1_000, Math.min(30_000, limitMs / 4, stallAfterMs ? stallAfterMs / 4 : 30_000)));
    status("running");
    child.on("close", (code) => {
      clearInterval(timer);
      status(terminal === "exited" ? "finished" : terminal);
      resolve({ ...parseCall(stdout, stderr, out, code ?? 1), terminal });
    });
    child.on("error", () => {
      clearInterval(timer);
      resolve({ status: 1, text: "", model: null, provider: null, session: null, terminal: "exited" });
    });
  });
}

if (args.preflight) {
  for (const key of ["checkout", "head", "inputs", "verify", "report"])
    if (args[key]) fail(2, `--preflight takes no --${key}`);
  const scratch = mkdtempSync(path.join(tmpdir(), "run-verifier-preflight-"));
  const out = path.join(scratch, "last-message.md");
  const call = await run(command("Reply with the single word OK and nothing else.", scratch, out, [], true), scratch, out, {
    logPath: null, statusPath: null, watch: [], own: new Set(), limitMs: 5 * 60_000, stallAfterMs: 0,
  });
  const where = `${args.cli}${args.model ? ` --model ${args.model}` : ""}`;
  if (call.terminal !== "exited" || call.status !== 0)
    fail(3, `${where} did not answer (exit ${call.status}${call.terminal !== "exited" ? `, ${call.terminal}` : ""}); check the model reference and login`);
  if (!call.model) fail(3, `${where} answered but the model could not be read from its output`);
  const family = familyOf(call.model);
  if (!family) fail(3, `cannot tell the model family of ${call.model}`);
  if (!call.session) fail(3, `${where} answered but the session id could not be read from its output`);
  if (args["owner-family"] && family === args["owner-family"].toLowerCase())
    fail(3, `${call.model} is ${family}, the owner's own family; pick another family's model`);
  console.log(`run-verifier: preflight OK (${args.cli}, ${family}/${call.model}, sandbox ${sandbox}` +
    `${args.effort ? `, effort ${args.effort}` : ""}${args["needs-gui"] ? ", GUI allowed" : ""})`);
  process.exit(0);
}

for (const key of ["cli", "checkout", "head", "inputs", "verify", "report"])
  if (!args[key]) fail(2, `--${key} is required`);
if (!/^[0-9a-f]{40}$/.test(args.head)) fail(2, `--head must be a 40-hex SHA: ${args.head}`);

const here = path.dirname(fileURLToPath(import.meta.url));
const brief = path.resolve(args.brief ?? path.join(here, "../references/verifier-brief.md"));
const checkout = path.resolve(args.checkout);
const inputs = path.resolve(args.inputs);
const verifyPath = path.resolve(args.verify);
const report = path.resolve(args.report);
if (!report.endsWith(".md")) fail(2, "--report must end with .md");
for (const [name, file] of [["brief", brief], ["inputs", inputs], ["verify", verifyPath], ["checkout", checkout]])
  if (!existsSync(file)) fail(2, `${name} not found: ${file}`);

const verifyInfo = parseVerify(readFileSync(verifyPath, "utf8"));
if (verifyInfo.scenarios.length === 0) fail(2, `verify has no scenario IDs (S01, S02, ...): ${verifyPath}`);

const base = report.slice(0, -3);
const recordPath = `${base}.run.json`;
const logPath = `${base}.log`;
const statusPath = `${base}.status.json`;
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const git = (...a) => execFileSync("git", ["-C", checkout, ...a], { encoding: "utf8" }).trim();

function checkoutState() {
  try {
    return { head: git("rev-parse", "HEAD"), dirty: git("status", "--porcelain") !== "" };
  } catch {
    fail(2, `checkout is not a git repository: ${checkout}`);
  }
}
const before = checkoutState();
if (before.head !== args.head) fail(2, `checkout HEAD ${before.head} is not --head ${args.head}`);
if (before.dirty) fail(2, "checkout has uncommitted changes");

const prompt =
  `按 ${brief} 验证。本次输入见 ${inputs}。` +
  "把验证报告作为你的最终回复输出，调用方会把它原样保存为报告文件。";

// Report completeness: head, verdict, model line, one complete row per
// required scenario and requirement, the closing sections, and a verdict that
// agrees with the rows. Shared with check-delivery.mjs via report-format.mjs.
function problems(text) {
  return reportProblems(parseReport(text), verifyInfo, args.head);
}

const started = new Date().toISOString();
const deadline = Date.now() + timeoutMs;
const own = new Set([report, recordPath, logPath, statusPath]);
writeFileSync(logPath, "");
let result;
let issues = [];
let terminal = "completed";
for (let round = 1; round <= 2; round += 1) {
  const out = path.join(mkdtempSync(path.join(tmpdir(), "run-verifier-")), "last-message.md");
  const cmd = command(prompt, checkout, out, args["add-dir"]);
  appendFileSync(logPath, `=== attempt ${round}\n$ ${cmd.map((c) => (c === prompt ? JSON.stringify(c) : c)).join(" ")}\n`);
  result = await run(cmd, checkout, out, {
    logPath, statusPath, watch: args["add-dir"], own, limitMs: Math.max(0, deadline - Date.now()), stallAfterMs: stallMs,
  });
  appendFileSync(logPath, `\n--- exit ${result.status} (${result.terminal})\n`);
  if (result.terminal !== "exited") {
    terminal = result.terminal;
    issues = [`${args.cli} ${result.terminal === "stalled" ? `wrote no evidence for ${stallMs / 60_000} minutes` : `ran past ${timeoutMs / 60_000} minutes`}`];
    break;
  }
  if (result.status !== 0) {
    terminal = "cli_failed";
    issues = [`${args.cli} call failed (exit ${result.status})`];
    continue;
  }
  issues = result.text.trim() ? problems(result.text) : ["empty report"];
  if (!result.model) issues.push("could not read the model from the CLI output");
  else if (!familyOf(result.model)) issues.push(`cannot tell the model family of ${result.model}`);
  if (!result.session) issues.push("could not read the session id from the CLI output");
  terminal = issues.length ? "invalid_report" : "completed";
  if (issues.length === 0) break;
}
const ended = new Date().toISOString();

const after = checkoutState();
const untouched = after.head === before.head && !after.dirty;
if (!untouched) terminal = "checkout_changed";
const callOk = result.status === 0 && result.terminal === "exited";
if (callOk && result.text.trim()) writeFileSync(report, result.text);
const valid = callOk && issues.length === 0 && untouched;
const record = {
  cli: args.cli,
  provider: result.provider,
  family: familyOf(result.model),
  model: result.model,
  effort: args.effort ?? null,
  sandbox,
  session_id: result.session,
  head: args.head,
  checkout,
  brief,
  inputs,
  inputs_sha256: sha256(readFileSync(inputs)),
  verify: verifyPath,
  report: path.basename(report),
  report_sha256: callOk && result.text.trim() ? sha256(result.text) : null,
  started_at: started,
  ended_at: ended,
  exit_code: result.status,
  terminal_reason: terminal,
  checkout_untouched: untouched,
  problems: untouched ? issues : [...issues, "verifier changed the checkout"],
  valid,
};
writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);

if (valid) {
  console.log(`run-verifier: OK (${record.family}/${record.model}, session ${record.session_id}) -> ${report}`);
  process.exit(0);
}
if (terminal === "stalled" || terminal === "timed_out")
  fail(3, `${record.problems[0]}; stopped it (${terminal}). Try another family's CLI; see ${logPath}`);
if (!callOk) fail(3, `${args.cli} call failed twice; see ${logPath}`);
fail(1, `invalid verification: ${record.problems.join("; ")}; see ${recordPath}`);
