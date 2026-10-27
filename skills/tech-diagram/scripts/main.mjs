#!/usr/bin/env node
// Create a figure from the template, and move its main() in and out without hand-editing the HTML.
//
//   node main.mjs new <fig>.html --size WxH                 copy the template to <fig>.html with W and H set
//   node main.mjs extract <fig>.html                         print the figure's main() to stdout
//   node main.mjs inject <fig>.html <main.js | -> [--size WxH]  replace main() (from a file or stdin), and the size
//   node main.mjs inject <fig>.html --size WxH               change only the size
//
// The HTML is the only source of a figure: extract main() from it before each edit, edit the copy in a
// directory of your own (mktemp -d), and inject it back. Exits 1 with the reason when a file is not a
// figure made from the template or main.js does not hold a main() function.

import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const TEMPLATE = join(here, '../assets/diagram.html');

const MAIN_START = /^function main\(\) \{/m;
const MAIN_END = '\nmain();\nwindow.__renderDone';
const SIZE = /^const W = \d+, H = \d+;/m;

function bounds(html) {
  const start = html.search(MAIN_START);
  const end = start < 0 ? -1 : html.indexOf(MAIN_END, start);
  if (start < 0 || end < 0) throw new Error('no main() followed by "main();" and "window.__renderDone": not a figure made from the template');
  return { start, end };
}

export function extractMain(html) {
  const { start, end } = bounds(html);
  return html.slice(start, end).trimEnd() + '\n';
}

export function injectMain(html, main) {
  const src = main.trim();
  if (!/^function main\(\) \{[\s\S]*\}$/.test(src)) throw new Error('main.js must hold one function, starting with "function main() {" and ending with "}"');
  if (src.includes(MAIN_END)) throw new Error('main.js must not call main() or set window.__renderDone; the template does');
  const { start, end } = bounds(html);
  return html.slice(0, start) + src + '\n' + html.slice(end);
}

export function parseSize(text) {
  const m = /^(\d+)x(\d+)$/.exec(text || '');
  if (!m) throw new Error(`--size takes WxH in px, such as 1600x900, not "${text}"`);
  return { w: Number(m[1]), h: Number(m[2]) };
}

export function setSize(html, { w, h }) {
  if (!SIZE.test(html)) throw new Error('no "const W = …, H = …;" line: not a figure made from the template');
  return html.replace(SIZE, `const W = ${w}, H = ${h};`);
}

const USAGE = `usage:
  node main.mjs new <fig>.html --size WxH
  node main.mjs extract <fig>.html
  node main.mjs inject <fig>.html <main.js | -> [--size WxH]
  node main.mjs inject <fig>.html --size WxH`;

export function run(argv, { stdin = () => readFileSync(0, 'utf8') } = {}) {
  const args = [...argv];
  const i = args.indexOf('--size');
  const size = i >= 0 ? parseSize(args.splice(i, 2)[1]) : null;
  const [cmd, fig, src, ...rest] = args;
  if (!fig || rest.length) throw new Error(USAGE);
  if (cmd === 'new') {
    if (!size || src) throw new Error(USAGE);
    if (existsSync(fig)) throw new Error(`${fig} already exists; edit it with extract and inject`);
    writeFileSync(fig, setSize(readFileSync(TEMPLATE, 'utf8'), size));
    return `${fig} (${size.w}x${size.h})`;
  }
  if (cmd === 'extract') {
    if (src || size) throw new Error(USAGE);
    return extractMain(readFileSync(fig, 'utf8')).trimEnd();
  }
  if (cmd === 'inject') {
    if (!src && !size) throw new Error(USAGE);
    let html = readFileSync(fig, 'utf8');
    if (src) html = injectMain(html, src === '-' ? stdin() : readFileSync(src, 'utf8'));
    if (size) html = setSize(html, size);
    writeFileSync(fig, html);
    return `${fig}${src ? ': main() replaced' : ''}${size ? `${src ? ',' : ':'} size ${size.w}x${size.h}` : ''}`;
  }
  throw new Error(USAGE);
}

// Run as a CLI also when called through a symlink (the Skill is usually installed as one)
const invoked = process.argv[1] && existsSync(process.argv[1]) ? realpathSync(process.argv[1]) : '';
if (fileURLToPath(import.meta.url) === invoked) {
  try {
    console.log(run(process.argv.slice(2)));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
