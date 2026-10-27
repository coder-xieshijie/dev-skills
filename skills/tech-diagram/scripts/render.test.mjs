// Renders the template and a deliberately broken diagram with Chrome. Skipped when Chrome is not found.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, render } from './render.mjs';

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
}`;

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
    for (const t of ['text-overlap', 'line-through-text', 'arrow-through-box', 'off-canvas', 'emoji']) {
      assert.ok(types.has(t), `expected a ${t} issue, got ${[...types].join(', ')}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
