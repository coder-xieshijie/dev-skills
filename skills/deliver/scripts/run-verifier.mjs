#!/usr/bin/env node
// Start the deliver Skill's independent verification in a separate session of
// another model family, and leave a run record that check-delivery.mjs reads.
//
//   node run-verifier.mjs --cli <codex|claude|mcode> --checkout <dir> --head <sha>
//                         --inputs <inputs.md> --verify <verify.md> --report <report.md>
//                         [--model <provider/model>] [--add-dir <dir>]...
//                         [--brief <verifier-brief.md>]
//
// The verifier reads the fixed brief and the caller's inputs file and returns
// its report as the final message; this script writes that message to
// --report, so the report hash in the run record is what the verifier said.
// Next to the report it writes <report>.run.json and <report>.log.
//
// The model family is derived from the model ID (claude -> anthropic, gpt/o*
// -> openai, MiniMax -> minimax, gemini -> google), never from the provider
// name, so a gateway cannot pass a same-family model off as another family.
// An ID the script cannot place makes the run invalid.
//
// Exit 0: valid report, checkout untouched.
// Exit 1: the CLI call succeeded but the report or the run record is invalid
//         after one retry, or the verifier changed the checkout.
// Exit 2: usage error or the checkout is not at --head / not clean.
// Exit 3: the CLI is unavailable (missing, not logged in, or the call failed
//         twice). Try another family's CLI before stopping.
// Zero dependencies.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { familyOf } from "./model-family.mjs";

const USAGE =
  "usage: run-verifier.mjs --cli <codex|claude|mcode> --checkout <dir> --head <sha> " +
  "--inputs <inputs.md> --verify <verify.md> --report <report.md> [--model <provider/model>] " +
  "[--add-dir <dir>]... [--brief <path>]";

function fail(code, message) {
  console.error(`run-verifier: ${message}`);
  if (code === 2) console.error(USAGE);
  process.exit(code);
}

const args = { "add-dir": [] };
const argv = process.argv.slice(2);
const KEYS = ["cli", "checkout", "head", "inputs", "verify", "report", "model", "add-dir", "brief"];
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i].replace(/^--/, "");
  if (!argv[i].startsWith("--") || !KEYS.includes(key)) fail(2, `unknown argument ${argv[i]}`);
  if (i + 1 >= argv.length) fail(2, `missing value for --${key}`);
  const value = argv[(i += 1)];
  if (key === "add-dir") args[key].push(path.resolve(value));
  else args[key] = value;
}
for (const key of ["cli", "checkout", "head", "inputs", "verify", "report"])
  if (!args[key]) fail(2, `--${key} is required`);
if (!["codex", "claude", "mcode"].includes(args.cli)) fail(2, `unsupported --cli ${args.cli}`);
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

const scenarios = [...new Set(readFileSync(verifyPath, "utf8").match(/\bS\d{2,}\b/g) ?? [])].sort();
if (scenarios.length === 0) fail(2, `verify has no scenario IDs (S01, S02, ...): ${verifyPath}`);

const base = report.slice(0, -3);
const recordPath = `${base}.run.json`;
const logPath = `${base}.log`;
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

const prompt =
  `按 ${brief} 验证。本次输入见 ${inputs}。` +
  "把验证报告作为你的最终回复输出，调用方会把它原样保存为报告文件。";

// Run one attempt; return { text, model, provider, session, status, log }.
function attempt() {
  const tmp = mkdtempSync(path.join(tmpdir(), "run-verifier-"));
  const out = path.join(tmp, "last-message.md");
  let cmd;
  let cwd = checkout;
  if (args.cli === "codex") {
    cmd = ["codex", "exec", "-C", checkout, "-s", "workspace-write",
      "-c", "sandbox_workspace_write.network_access=true",
      ...args["add-dir"].flatMap((d) => ["--add-dir", d]), "-o", out];
    if (args.model) cmd.push("-m", args.model);
    cmd.push(prompt);
  } else if (args.cli === "claude") {
    cmd = ["claude", "-p", prompt, "--permission-mode", "bypassPermissions",
      "--output-format", "json", ...args["add-dir"].flatMap((d) => ["--add-dir", d])];
    if (args.model) cmd.push("--model", args.model);
  } else {
    cmd = ["mcode", "exec", "--cwd", checkout, "--permission", "full",
      "--output-format", "json", "-o", out];
    if (args.model) cmd.push("--model", args.model);
    cmd.push(prompt);
  }
  const run = spawnSync(cmd[0], cmd.slice(1), {
    cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28,
  });
  const log = `$ ${cmd.map((c) => (c === prompt ? JSON.stringify(c) : c)).join(" ")}\n` +
    `--- exit ${run.status}\n--- stdout\n${run.stdout ?? ""}\n--- stderr\n${run.stderr ?? ""}\n`;
  const result = { status: run.status, log, text: "", model: null, provider: null, session: null };
  const both = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  if (args.cli === "codex") {
    result.text = existsSync(out) ? readFileSync(out, "utf8") : "";
    result.model = both.match(/^model:\s*(\S+)\s*$/m)?.[1] ?? null;
    result.provider = both.match(/^provider:\s*(\S+)\s*$/m)?.[1] ?? null;
    result.session = both.match(/^session id:\s*(\S+)\s*$/m)?.[1] ?? null;
  } else {
    let json = null;
    try {
      json = JSON.parse(run.stdout);
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
  }
  return result;
}

// Report checks shared in spirit with check-delivery.mjs: head, model line on
// the same line, one complete row per verify scenario, and the closing
// sections, so a truncated report is caught.
function problems(text) {
  const found = [];
  const head = text.match(/^head:[ \t]*([0-9a-f]{40})[ \t]*$/m)?.[1];
  if (!head) found.push("no `head: <40-hex SHA>` line");
  else if (head !== args.head) found.push(`report head ${head} is not ${args.head}`);
  if (!/^验证模型[:：][ \t]*\S[^\n]*$/m.test(text)) found.push("no `验证模型：` line with a value");
  const rows = new Map();
  for (const m of text.matchAll(/^\|[ \t]*(S\d{2,})[ \t]*\|[ \t]*(PASS|FAIL|UNVERIFIED)[ \t]*\|([^|\n]*)\|([^|\n]*)\|[ \t]*$/gm))
    rows.set(m[1], { result: m[2], evidence: m[3].trim() });
  for (const id of scenarios) {
    const row = rows.get(id);
    if (!row) found.push(`${id} has no complete row (| ${id} | result | evidence | note |)`);
    else if (row.result !== "UNVERIFIED" && !row.evidence) found.push(`${id} has no evidence`);
  }
  for (const section of ["冒烟集与回归范围", "代码问题"])
    if (!text.includes(section)) found.push(`no \`${section}\` section (report may be truncated)`);
  return found;
}

const started = new Date().toISOString();
const logs = [];
let result;
let issues = [];
for (let round = 1; round <= 2; round += 1) {
  result = attempt();
  logs.push(`=== attempt ${round}\n${result.log}`);
  if (result.status !== 0) {
    issues = [`${args.cli} call failed (exit ${result.status})`];
    continue;
  }
  issues = result.text.trim() ? problems(result.text) : ["empty report"];
  if (!result.model) issues.push("could not read the model from the CLI output");
  else if (!familyOf(result.model)) issues.push(`cannot tell the model family of ${result.model}`);
  if (!result.session) issues.push("could not read the session id from the CLI output");
  if (issues.length === 0) break;
}
const ended = new Date().toISOString();
writeFileSync(logPath, logs.join("\n"));

const after = checkoutState();
const untouched = after.head === before.head && !after.dirty;
const callOk = result.status === 0;
if (callOk && result.text.trim()) writeFileSync(report, result.text);
const valid = callOk && issues.length === 0 && untouched;
const record = {
  cli: args.cli,
  provider: result.provider,
  family: familyOf(result.model),
  model: result.model,
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
  checkout_untouched: untouched,
  problems: untouched ? issues : [...issues, "verifier changed the checkout"],
  valid,
};
writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);

if (valid) {
  console.log(`run-verifier: OK (${record.family}/${record.model}, session ${record.session_id}) -> ${report}`);
  process.exit(0);
}
if (!callOk) fail(3, `${args.cli} call failed twice; see ${logPath}`);
fail(1, `invalid verification: ${record.problems.join("; ")}; see ${recordPath}`);
