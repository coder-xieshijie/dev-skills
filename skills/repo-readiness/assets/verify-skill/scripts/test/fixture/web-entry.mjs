// A stand-in for a UI entry in the scripts' own tests: the notes stand-in plus a capture, so look
// criteria can be exercised. A real UI adapter drives a browser, desktop app or terminal instead.

import { copyFileSync } from 'node:fs';
import path from 'node:path';

export { up, doctor, down, tools, sideEffect } from './notes-entry.mjs';

export async function capture(instance, name, { runDir }) {
  const file = path.join(runDir, `${name}.txt`);
  copyFileSync(path.join(instance.dataDir, 'notes.json'), file);
  return file;
}
