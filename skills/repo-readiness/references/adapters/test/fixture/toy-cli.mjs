// A tiny notes CLI for the CLI adapter's tests. It keeps its notes where many CLIs keep state: under
// HOME (~/.toy-cli), so a run that inherited the user's HOME would write there.
//   add <title>       stores a note (BUG=1: says it did, stores nothing); prints { id }
//   list              prints { notes }
//   add --from <file> stores a note whose title is the file's content
//   serve             starts a detached worker in its own session, records its pid in
//                     ~/.toy-cli/workers/<n>.json and exits: what `down` has to find and stop
//   linger            leaves a child in the command's process group (holding stdout open) and exits
//   env <NAME>        prints { value } of one environment variable
//   text              prints plain text, not JSON
//   fail              prints an error to stderr and exits 3

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = path.join(os.homedir(), '.toy-cli');
mkdirSync(path.join(home, 'workers'), { recursive: true });
const file = path.join(home, 'notes.json');
const load = () => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : []);
const print = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);
const [command, ...args] = process.argv.slice(2);
const forever = 'setInterval(() => {}, 1000)';

if (command === 'add') {
  const title = args[0] === '--from' ? readFileSync(args[1], 'utf8').trim() : args[0];
  const id = `n${Date.now()}`;
  if (process.env.BUG !== '1') writeFileSync(file, JSON.stringify([...load(), { id, title }]));
  print({ id });
} else if (command === 'list') {
  print({ notes: load() });
} else if (command === 'serve') {
  const worker = spawn(process.execPath, ['-e', forever], { detached: true, stdio: 'ignore' });
  worker.unref();
  const n = readdirSync(path.join(home, 'workers')).length + 1;
  writeFileSync(path.join(home, 'workers', `${n}.json`), JSON.stringify({ worker: { pid: worker.pid } }));
  print({ worker: worker.pid });
} else if (command === 'linger') {
  const child = spawn(process.execPath, ['-e', forever], { stdio: ['ignore', 'inherit', 'ignore'] });
  child.unref();
  print({ child: child.pid });
} else if (command === 'env') {
  print({ value: process.env[args[0]] ?? null });
} else if (command === 'text') {
  process.stdout.write('plain text\n');
} else if (command === 'fail') {
  process.stderr.write('AUTH LOST\n');
  process.exitCode = 3;
} else {
  process.stderr.write(`unknown command ${command}\n`);
  process.exitCode = 2;
}
