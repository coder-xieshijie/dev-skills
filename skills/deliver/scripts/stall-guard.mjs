#!/usr/bin/env node
// Runs a long command, such as an independent verification session, and stops
// it only when it stalls: no output from it and no change under any watched
// path for the idle limit. A run that keeps producing results is never cut
// off by the clock.
//
//   node stall-guard.mjs [--idle <limit>] [--watch <path> ...] -- <command> [args ...]
//
// <limit> is a number with s, m or h (no unit means minutes); default 60m.
// A watched path is a file or a directory; a directory counts as changed when
// any file under it is added, removed or modified. Watch the evidence
// directory, where the verifier appends a row to results.md per scenario.
//
// The command runs in its own process group, with stdin passed through and
// its stdout and stderr forwarded. On a stall the whole group gets SIGTERM,
// then SIGKILL after 10 seconds, and this script exits 124 with a line on
// stderr that starts with "stall-guard: stalled". Otherwise it exits with the
// command's exit code (128 + n when a signal n ended it). Exit 2 on usage
// errors. Zero dependencies.
import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const USAGE = "usage: stall-guard.mjs [--idle <limit, e.g. 60m>] [--watch <path> ...] -- <command> [args ...]";

function usage(message) {
  console.error(`stall-guard: ${message}\n${USAGE}`);
  process.exit(2);
}

const argv = process.argv.slice(2);
const split = argv.indexOf("--");
if (split === -1) usage("put -- before the command");
const command = argv.slice(split + 1);
if (!command.length) usage("no command after --");

let idleMs = 60 * 60 * 1000;
let idleLabel = "60m";
const watched = [];
for (let i = 0; i < split; i += 1) {
  const key = argv[i];
  if (key !== "--idle" && key !== "--watch") usage(`unknown argument ${key}`);
  if (i + 1 >= split) usage(`missing value for ${key}`);
  const value = argv[(i += 1)];
  if (key === "--watch") {
    watched.push(path.resolve(value));
    continue;
  }
  const match = /^(\d+(?:\.\d+)?)(s|m|h)?$/.exec(value);
  if (!match || Number(match[1]) <= 0) usage(`--idle takes a positive number with s, m or h, got ${value}`);
  idleMs = Number(match[1]) * { s: 1000, m: 60000, h: 3600000 }[match[2] ?? "m"];
  idleLabel = match[2] ? value : `${value}m`;
}

// A fingerprint of everything under the watched paths: path, size and mtime of
// each file. Missing paths count as empty, so creating one counts as a change.
function fingerprint() {
  const parts = [];
  const walk = (target, depth) => {
    let info;
    try {
      info = statSync(target);
    } catch {
      return;
    }
    if (info.isDirectory()) {
      if (depth > 6) return;
      let names = [];
      try {
        names = readdirSync(target).sort();
      } catch {
        return;
      }
      for (const name of names) walk(path.join(target, name), depth + 1);
    } else parts.push(`${target}\0${info.size}\0${info.mtimeMs}`);
  };
  for (const target of watched) walk(target, 0);
  return parts.join("\n");
}

const child = spawn(command[0], command.slice(1), {
  stdio: ["inherit", "pipe", "pipe"],
  detached: true,
});
let lastActivity = Date.now();
let lastPrint = fingerprint();
let stalled = false;

child.stdout.on("data", (chunk) => {
  lastActivity = Date.now();
  process.stdout.write(chunk);
});
child.stderr.on("data", (chunk) => {
  lastActivity = Date.now();
  process.stderr.write(chunk);
});

const killGroup = (signal) => {
  try {
    process.kill(-child.pid, signal);
  } catch {
    // The group is already gone.
  }
};

const pollMs = Math.max(100, Math.min(10000, idleMs / 6));
const timer = setInterval(() => {
  const print = fingerprint();
  if (print !== lastPrint) {
    lastPrint = print;
    lastActivity = Date.now();
  }
  if (!stalled && Date.now() - lastActivity >= idleMs) {
    stalled = true;
    const where = watched.length ? ` and no change under ${watched.join(", ")}` : "";
    console.error(`stall-guard: stalled: no output${where} for ${idleLabel}; stopping ${command[0]}`);
    killGroup("SIGTERM");
    setTimeout(() => killGroup("SIGKILL"), 10000).unref();
  }
}, pollMs);

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"])
  process.on(signal, () => killGroup(signal));

child.on("error", (error) => {
  clearInterval(timer);
  console.error(`stall-guard: could not start ${command[0]}: ${error.message}`);
  process.exit(127);
});

child.on("close", (code, signal) => {
  clearInterval(timer);
  if (stalled) process.exit(124);
  if (signal) {
    const numbers = { SIGHUP: 1, SIGINT: 2, SIGKILL: 9, SIGTERM: 15 };
    process.exit(128 + (numbers[signal] ?? 0));
  }
  process.exit(code ?? 1);
});
