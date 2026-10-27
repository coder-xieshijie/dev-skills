import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATE, extractMain, injectMain, parseSize, run, setSize } from './main.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(TEMPLATE, 'utf8');
const MAIN = `function main() {
  kind('flow');
  node(120, 100, 220, 120, C.user, 'Client');
}`;

test('extract returns main() from the template, inject puts it back unchanged', () => {
  const main = extractMain(template);
  assert.match(main, /^function main\(\) \{\n  \/\/ Sources:/);
  assert.match(main, /\n\}\n$/);
  assert.equal(injectMain(template, main), template);
});

test('inject replaces main() and keeps the call after it', () => {
  const html = injectMain(template, `\n${MAIN}\n\n`);
  assert.equal(extractMain(html), MAIN + '\n');
  assert.match(html, /'Client'\);\n\}\n\nmain\(\);\nwindow\.__renderDone = true;/);
  assert.equal(html.match(/function main\(\)/g).length, 1);
});

test('inject refuses what is not one main() function, and files not made from the template', () => {
  assert.throws(() => injectMain(template, 'node(1, 2, 3, 4, C.user, "x");'), /must hold one function/);
  assert.throws(() => injectMain(template, MAIN + '\nmain();\nwindow.__renderDone = true;'), /must hold one function|must not call/);
  assert.throws(() => extractMain('<html><script>draw()</script></html>'), /not a figure made from the template/);
});

test('size', () => {
  assert.deepEqual(parseSize('1600x900'), { w: 1600, h: 900 });
  assert.throws(() => parseSize('1600*900'), /WxH/);
  assert.match(setSize(template, { w: 2400, h: 1400 }), /^const W = 2400, H = 1400;$/m);
  assert.throws(() => setSize('<html></html>', { w: 1, h: 1 }), /no "const W/);
});

test('CLI: new, extract, inject from a file and from stdin, size only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tech-diagram-main-'));
  try {
    const fig = join(dir, 'fig.html');
    assert.equal(run(['new', fig, '--size', '1800x900']), `${fig} (1800x900)`);
    assert.match(readFileSync(fig, 'utf8'), /^const W = 1800, H = 900;$/m);
    assert.throws(() => run(['new', fig, '--size', '1800x900']), /already exists/);

    writeFileSync(join(dir, 'main.js'), MAIN);
    assert.equal(run(['inject', fig, join(dir, 'main.js'), '--size', '1700x800']), `${fig}: main() replaced, size 1700x800`);
    assert.equal(run(['extract', fig]), MAIN);
    assert.equal(run(['inject', fig, '-'], { stdin: () => MAIN.replace('Client', 'Browser') }), `${fig}: main() replaced`);
    assert.match(run(['extract', fig]), /'Browser'/);
    assert.equal(run(['inject', fig, '--size', '1600x700']), `${fig}: size 1600x700`);
    assert.match(readFileSync(fig, 'utf8'), /^const W = 1600, H = 700;$/m);
    assert.throws(() => run(['inject', fig]), /usage/);

    const cli = spawnSync(process.execPath, [join(here, 'main.mjs'), 'extract', fig], { encoding: 'utf8' });
    assert.equal(cli.status, 0, cli.stderr);
    assert.match(cli.stdout, /'Browser'/);
    const bad = spawnSync(process.execPath, [join(here, 'main.mjs'), 'extract', join(dir, 'main.js')], { encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /not a figure made from the template/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
