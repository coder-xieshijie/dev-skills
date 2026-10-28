// Renders the template and a deliberately broken diagram with Chrome. Skipped when Chrome is not found.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VENDORED, findChrome, loadFailure, render } from './render.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(here, '../assets/diagram.html'), 'utf8');
const withMain = (main) =>
  template.slice(0, template.indexOf('function main() {')) + main + '\n' + template.slice(template.indexOf('main();\nwindow.__renderDone'));

const BROKEN = `function main() {
  node(120, 100, 220, 120, C.user, 'Client', 'web');
  node(700, 100, 220, 120, C.agent, 'Service', 'core');
  node(400, 115, 160, 90, C.memory, 'Cache', 'redis');
  arrow(340, 160, 698, 160);
  plain({ text: 'first label', x: 120, y: 300, w: 200, size: 18 });
  plain({ text: 'second label', x: 140, y: 305, w: 200, size: 18 });
  plain({ text: 'Done ✅', x: 1000, y: 300, w: 'fit', size: 18 });
  plain({ text: 'off the edge', x: 1500, y: 300, w: 200, size: 18 });
  plain({ text: 'sends   <task-report>', x: 120, y: 400, w: 'fit', size: 18 });
}`;

// Label markup the helpers allow, and a literal '<' written as an entity
const MARKUP = `function main() {
  node(120, 100, 300, 120, C.agent, 'List&lt;T&gt; &amp; <i>more</i>', 'H<sub>2</sub>O · x<sup>2</sup>');
  plain({ text: pair('&lt;task-report&gt;', '<b>report</b>'), x: 600, y: 120, w: 'fit', size: 18 });
}`;

// Warnings the page geometry must produce, and the label list
const WARNED = `function main() {
  kind('flow');
  node(120, 100, 220, 120, C.user, 'Client', 'web');
  node(700, 300, 220, 120, C.agent, 'Service', 'core');
  arrow(340, 160, 698, 360);
  plain({ text: '覆盖范围: 第 1 轮', x: 120, y: 240, w: 'fit', size: 18 });
  plain({ text: 'tiny', x: 120, y: 420, w: 'fit', size: 7 });
}`;

// The layout helpers, with in-page assertions: a failed one throws, and render() rejects with its message
const HELPERS = `function main() {
  kind('flow');
  const eq = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(what + ': ' + JSON.stringify(a)); };
  const cell = grid(80, 120, 3, 2, 240, 110, 160, 120);
  eq(cell(1, 1), { x: 480, y: 350, w: 240, h: 110 }, 'grid cell');
  eq(cell(0, 0, 2), { x: 80, y: 120, w: 640, h: 110 }, 'grid span');
  const a = node(80, 120, 240, 110, C.user, 'Client');
  eq([a.right(), a.bottom(0.25)], [[320, 175], [140, 230]], 'node anchors');
  const b = node(480, 150, 240, 110, C.agent, 'Service');
  eq(link(a, b, { label: '① call' }), [[320, 190], [477, 190]], 'straight link through the overlap');
  const c = node(880, 350, 240, 110, C.memory, 'Store');
  eq(link(b, c, { from: 'right', to: 'left', label: '② write' }).length, 4, 'Z link');
  const e = node(80, 350, 240, 110, C.external, 'Other');
  eq(link(b, e, { from: 'bottom', to: 'top', fromAt: 0.2, toAt: 0.8, label: 'down' }), [[528, 260], [528, 303.5], [272, 303.5], [272, 347]], 'vertical Z');
  const d = decision(400, 600, 'Ready?');
  eq(d.top(0), [323.2, 552], 'hexagon top clamps to the flat edge');
  const yes = node(700, 560, 200, 80, C.agent, 'Commit');
  const no = node(300, 720, 200, 80, C.error, 'Wait');
  eq(branch(d, yes, 'yes'), [[520, 600], [697, 600]], 'branch from the point of the hexagon');
  branch(d, no, 'no', { from: 'bottom', to: 'top', degraded: true });
  const sx = scaleBar(980, 620, 400, 40, [{ value: 30, color: C.memory, label: 'used' }], { max: 100, rest: 'free', marks: [{ at: 80, label: 'hard', color: C.error }] });
  eq(sx(50), 1180, 'scale');
  lifeline(1100, 120, 330, C.user, 'User');
  fragment(1000, 1240, 220, 320, 'opt', 'idle');
}`;

// No host resolves: the CDN, Google Fonts and every other server are unreachable
const OFFLINE = ['--host-resolver-rules=MAP * ~NOTFOUND'];

test('the vendored rough.js matches the integrity hash the template names', () => {
  for (const [url, file] of Object.entries(VENDORED)) {
    const hash = 'sha384-' + createHash('sha384').update(readFileSync(file)).digest('base64');
    assert.ok(template.includes(`src="${url}"`), `the template no longer loads ${url}`);
    assert.ok(template.includes(`integrity="${hash}"`), `${file} does not match the template's integrity hash`);
  }
});

test('loadFailure names exceptions and failed requests before the timeout', () => {
  const none = { exceptions: [], failedRequests: [] };
  assert.match(loadFailure(none, 20000, true), /not set within 20 s and the page reported no error/);
  assert.match(loadFailure(none, 20000, false), /no \.stage element/);
  assert.equal(loadFailure({ exceptions: ['ReferenceError: rough is not defined (fig.html:57)'],
                             failedRequests: ['net::ERR_TIMED_OUT https://cdn.example/rough.js'] }, 20000, true),
    'the page threw: ReferenceError: rough is not defined (fig.html:57); requests failed: net::ERR_TIMED_OUT https://cdn.example/rough.js');
});

test('render: template is clean, broken diagram is reported', { skip: !findChrome() && 'Chrome not found' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tech-diagram-test-'));
  try {
    writeFileSync(join(dir, 'clean.html'), template);
    const clean = await render(join(dir, 'clean.html'), { scale: 1 });
    assert.ok(existsSync(clean.png));
    assert.deepEqual(clean.size, { w: 1560, h: 460, scale: 1 });
    assert.deepEqual(clean.issues.filter((i) => i.type !== 'font'), []);   // fonts depend on the machine

    writeFileSync(join(dir, 'broken.html'), withMain(BROKEN));
    const broken = await render(join(dir, 'broken.html'), { scale: 1 });
    const types = new Set(broken.issues.map((i) => i.type));
    for (const t of ['text-overlap', 'line-through-text', 'arrow-through-box', 'off-canvas', 'emoji', 'html-tag']) {
      assert.ok(types.has(t), `expected a ${t} issue, got ${[...types].join(', ')}`);
    }
    assert.match(broken.issues.find((i) => i.type === 'html-tag').message, /^"sends" at \(\d+,\d+\) contains <task-report>/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI runs when called through a symlinked Skill directory', { skip: !findChrome() && 'Chrome not found' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tech-diagram-link-'));
  try {
    symlinkSync(join(here, '..'), join(dir, 'skill'));
    writeFileSync(join(dir, 'fig.html'), template);
    const r = spawnSync(process.execPath, [join(dir, 'skill/scripts/render.mjs'), join(dir, 'fig.html'), '--scale', '1'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /layout check: no issues/);
    assert.ok(existsSync(join(dir, 'fig.png')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('renders with the CDN unreachable, and allowed markup is not reported', { skip: !findChrome() && 'Chrome not found' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tech-diagram-offline-'));
  try {
    writeFileSync(join(dir, 'fig.html'), withMain(MARKUP));
    const r = await render(join(dir, 'fig.html'), { scale: 1, chromeArgs: OFFLINE });
    assert.deepEqual(r.issues.filter((i) => i.type !== 'font'), []);   // offline, CJK may fall back to any local font
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI exits 2 with the exception when main() throws, without waiting for the timeout', { skip: !findChrome() && 'Chrome not found' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tech-diagram-throw-'));
  try {
    writeFileSync(join(dir, 'fig.html'), withMain(`function main() {\n  node(120, 100, 220, 120, C.user, 'Client');\n  drawLater();\n}`));
    const started = Date.now();
    const r = spawnSync(process.execPath, [join(here, 'render.mjs'), join(dir, 'fig.html'), '--scale', '1'], { encoding: 'utf8' });
    assert.equal(r.status, 2, r.stdout);
    assert.match(r.stderr, /render failed: the page threw: ReferenceError: drawLater is not defined \(fig\.html:\d+\)/);
    assert.ok(Date.now() - started < 15000, `took ${Date.now() - started} ms`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a script that does not load is named in the error, after one retry', { skip: !findChrome() && 'Chrome not found' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tech-diagram-net-'));
  try {
    const html = withMain('function main() { extraLib.draw(); }')
      .replace('</head>', '<script src="https://cdn.example.invalid/extra-lib.js"></script>\n</head>');
    writeFileSync(join(dir, 'fig.html'), html);
    await assert.rejects(render(join(dir, 'fig.html'), { scale: 1, chromeArgs: OFFLINE }), (e) => {
      assert.match(e.message, /the page threw: ReferenceError: extraLib is not defined/);
      assert.match(e.message, /requests failed: .*net::ERR_\w+ https:\/\/cdn\.example\.invalid\/extra-lib\.js/);
      assert.match(e.message, /\(also on a retry\)$/);
      return true;
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('render reports warnings without failing, and lists the labels', { skip: !findChrome() && 'Chrome not found' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tech-diagram-warn-'));
  try {
    writeFileSync(join(dir, 'fig.html'), withMain(WARNED));
    const r = await render(join(dir, 'fig.html'), { scale: 1 });
    assert.deepEqual(r.issues.filter((i) => i.type !== 'font'), []);
    assert.deepEqual(r.warnings.map((w) => w.type).sort(), ['cjk-punct', 'diagonal', 'margin', 'small-text']);
    assert.match(r.warnings.find((w) => w.type === 'small-text').message, /"tiny" 7px/);
    assert.deepEqual(r.labels.map((l) => l.text), ['Client web', '覆盖范围: 第 1 轮', 'Service core', 'tiny']);
    const cli = spawnSync(process.execPath, [join(here, 'render.mjs'), join(dir, 'fig.html'), '--scale', '1', '--labels'], { encoding: 'utf8' });
    assert.equal(cli.status, 0, cli.stdout);
    assert.match(cli.stdout, /warnings: 4 \(they do not fail the check\)\n- \[diagonal\]/);
    assert.match(cli.stdout, /labels \(x, y, w x h, text\):\n\d+\t\d+\t\d+x\d+\tClient web\n/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('layout helpers return shapes and right-angle links, and draw a clean figure', { skip: !findChrome() && 'Chrome not found' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tech-diagram-helpers-'));
  try {
    writeFileSync(join(dir, 'fig.html'), withMain(HELPERS).replace('const W = 1560, H = 460;', 'const W = 1460, H = 860;'));
    const r = await render(join(dir, 'fig.html'), { scale: 1 });
    assert.deepEqual(r.issues.filter((i) => i.type !== 'font'), []);
    assert.deepEqual(r.warnings.filter((w) => w.type !== 'margin'), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
