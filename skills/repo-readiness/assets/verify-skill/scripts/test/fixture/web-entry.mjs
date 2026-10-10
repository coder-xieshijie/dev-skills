// A stand-in for a UI entry in the scripts' own tests: the HTTP adapter plus a capture, so look
// criteria can be exercised. A real UI adapter drives a browser, desktop app or terminal instead.

import { writeFileSync } from 'node:fs';
import path from 'node:path';

export { up, doctor, down, tools, sideEffect } from '../../entries/http-service.mjs';

export async function capture(instance, name, { runDir }) {
  const file = path.join(runDir, `${name}.txt`);
  const notes = await fetch(`${instance.url}/notes`).then((response) => response.text());
  writeFileSync(file, notes);
  return file;
}
