import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDocFigures } from './doc-figures.mjs';
import { TEMPLATE, injectMain } from './main.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(TEMPLATE, 'utf8');
const figHtml = (note) => injectMain(template, `function main() {\n  kind('overview');\n  plain({ text: '${note}', x: 70, y: 300, w: 'fit' });\n}`);

// A document directory: files maps a relative path to its content
function withDoc(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'tech-diagram-doc-'));
  try {
    for (const [p, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), body);
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('figures numbered in reading order with matching references pass', () => {
  withDoc({
    'doc.md': '# Design\n\nFigure 1 answers what the parts are.\n\n![Figure 1 Overview](diagrams/01-overview.png)\n\n' +
      'As Figure 2 shows, a turn is short.\n\n![Figure 2 One turn](diagrams/02-turn.png)\n\n```\n![not a figure](x.png) Figure 9\n```\n',
    'diagrams/01-overview.png': '', 'diagrams/01-overview.html': figHtml('see Figure 2'),
    'diagrams/02-turn.png': '', 'diagrams/02-turn.html': figHtml('back to Figure 1'),
  }, (dir) => {
    const r = checkDocFigures(join(dir, 'doc.md'));
    assert.deepEqual(r.figures.map((f) => [f.n, f.src, f.caption]), [[1, 'diagrams/01-overview.png', 1], [2, 'diagrams/02-turn.png', 2]]);
    assert.deepEqual(r.issues, []);
    assert.deepEqual(r.renames, []);
  });
});

test('a moved figure: renames by reading order, captions and references that point at the old numbers', () => {
  // The overview moved to the front; files and captions still carry the old numbers
  withDoc({
    'doc.md': '# Design\n\n![图 2 总览](diagrams/02-overview.png)\n\n正文见图 1 和图 3。\n\n' +
      '<img src="diagrams/01-turn.png" alt="一轮">\n\n*图 1 一轮的来回*\n',
    'diagrams/02-overview.png': '', 'diagrams/02-overview.html': figHtml('展开见图 1'),
    'diagrams/01-turn.png': '', 'diagrams/01-turn.html': figHtml('no reference'),
  }, (dir) => {
    const r = checkDocFigures(join(dir, 'doc.md'));
    assert.deepEqual(r.figures.map((f) => [f.n, f.src, f.caption]), [[1, 'diagrams/02-overview.png', 2], [2, 'diagrams/01-turn.png', 1]]);
    assert.deepEqual(r.renames, [
      { from: 'diagrams/02-overview.png', to: 'diagrams/01-overview.png', html: true },
      { from: 'diagrams/01-turn.png', to: 'diagrams/02-turn.png', html: true },
    ]);
    assert.deepEqual(r.issues.slice(0, 2), [
      'line 3: the caption of diagrams/02-overview.png says 2, but it is figure 1 in reading order',
      'line 9: the caption of diagrams/01-turn.png says 1, but it is figure 2 in reading order',
    ]);
    assert.ok(r.issues.includes('line 5: "图 1" points at diagrams/01-turn.png, which is now figure 2; write "图 2"'));
    assert.ok(r.issues.includes('line 5: "图 3" points at no figure (the document has 2)'));
    assert.ok(r.issues.some((i) => /^diagrams\/02-overview\.html:\d+: "图 1" points at diagrams\/01-turn\.png, which is now figure 2; write "图 2", then re-render 02-overview\.html$/.test(i)));
  });
});

test('without captions, N means the N-th figure; unnumbered files get a prefix; missing files are reported', () => {
  withDoc({
    'doc.md': '![](overview.png)\n\nSee Figure 2 and Figure 4.\n\n![](figures/3_flow.png)\n\n![](https://example.com/remote.png)\n',
    'overview.png': '',
  }, (dir) => {
    const r = checkDocFigures(join(dir, 'doc.md'));
    assert.equal(r.figures.length, 2);
    assert.deepEqual(r.renames, [
      { from: 'overview.png', to: '01-overview.png', html: false },
      { from: 'figures/3_flow.png', to: 'figures/02_flow.png', html: false },
    ]);
    assert.deepEqual(r.issues, ['line 5: figures/3_flow.png does not exist', 'line 3: "Figure 4" points at no figure (the document has 2)']);
  });
});

test('CLI exits 1 with the report, 0 when everything agrees', () => {
  withDoc({ 'doc.md': '![图 1 总览](a/01-x.png)\n', 'a/01-x.png': '' }, (dir) => {
    const ok = spawnSync(process.execPath, [join(here, 'doc-figures.mjs'), join(dir, 'doc.md')], { encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /figures in reading order: 1\n  1  line 1  a\/01-x\.png  caption 1  \(no \.html next to it\)\nnumbering and references agree/);
  });
  withDoc({ 'doc.md': '![](a/02-x.png)\n', 'a/02-x.png': '' }, (dir) => {
    const bad = spawnSync(process.execPath, [join(here, 'doc-figures.mjs'), join(dir, 'doc.md')], { encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /a\/02-x\.png → a\/01-x\.png/);
  });
});
