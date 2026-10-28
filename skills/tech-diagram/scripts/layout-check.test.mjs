import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLayout, checkWarnings, crossPoint, segmentHitsRect, intersectArea, contains } from './layout-check.mjs';

const stage = { w: 1000, h: 600 };
const types = (geom) => checkLayout({ stage, ...geom }).map((i) => i.type);

test('geometry primitives', () => {
  const r = { x: 10, y: 10, w: 100, h: 50 };
  assert.equal(segmentHitsRect({ x1: 0, y1: 30, x2: 200, y2: 30 }, r), true);
  assert.equal(segmentHitsRect({ x1: 0, y1: 0, x2: 200, y2: 0 }, r), false);
  assert.equal(segmentHitsRect({ x1: 50, y1: 30, x2: 60, y2: 35 }, r), true);   // fully inside
  assert.equal(segmentHitsRect({ x1: 0, y1: 100, x2: 100, y2: 70 }, r), false);
  assert.equal(intersectArea(r, { x: 100, y: 50, w: 50, h: 50 }), 100);
  assert.equal(contains(r, { x: 9, y: 10, w: 20, h: 20 }, 2), true);
  assert.equal(contains(r, { x: 5, y: 10, w: 20, h: 20 }, 2), false);
});

test('a clean diagram has no issues', () => {
  const geom = {
    boxes: [{ x: 100, y: 100, w: 200, h: 100 }, { x: 500, y: 100, w: 200, h: 100 }],
    frames: [{ x: 60, y: 60, w: 680, h: 200 }],
    lines: [{ x1: 300, y1: 150, x2: 498, y2: 150, kind: 'arrow', route: 1 }],
    texts: [{ x: 150, y: 140, w: 100, h: 20, text: 'Client', fonts: ['Times New Roman'] },
            { x: 360, y: 120, w: 80, h: 18, text: '① call', fonts: ['Times New Roman'] }],
  };
  assert.deepEqual(types(geom), []);
});

test('overlapping texts', () => {
  assert.deepEqual(types({ texts: [{ x: 10, y: 10, w: 100, h: 20, text: 'a' }, { x: 50, y: 15, w: 100, h: 20, text: 'b' }] }),
    ['text-overlap']);
});

test('a line through text, unless the text has a background', () => {
  const lines = [{ x1: 0, y1: 20, x2: 300, y2: 20, kind: 'arrow', route: 1 }];
  assert.deepEqual(types({ lines, texts: [{ x: 100, y: 10, w: 50, h: 20, text: 'x' }] }), ['line-through-text']);
  assert.deepEqual(types({ lines, texts: [{ x: 100, y: 10, w: 50, h: 20, text: 'x', bg: true }] }), []);
});

test('text crossing a box border', () => {
  const boxes = [{ x: 100, y: 100, w: 100, h: 60 }];
  assert.deepEqual(types({ boxes, texts: [{ x: 110, y: 120, w: 80, h: 20, text: 'in' }] }), []);
  assert.deepEqual(types({ boxes, texts: [{ x: 150, y: 120, w: 120, h: 20, text: 'spills' }] }), ['text-crosses-box']);
});

test('an arrow through a box it does not connect, but not the boxes at its ends', () => {
  const boxes = [{ x: 0, y: 100, w: 100, h: 100 }, { x: 300, y: 100, w: 100, h: 100 }, { x: 600, y: 100, w: 100, h: 100 }];
  const direct = [{ x1: 100, y1: 150, x2: 598, y2: 150, kind: 'arrow', route: 1 }];
  assert.deepEqual(types({ boxes, lines: direct }), ['arrow-through-box']);
  const around = [{ x1: 100, y1: 150, x2: 150, y2: 150, kind: 'arrow', route: 2 },
                  { x1: 150, y1: 150, x2: 150, y2: 50, kind: 'arrow', route: 2 },
                  { x1: 150, y1: 50, x2: 650, y2: 50, kind: 'arrow', route: 2 },
                  { x1: 650, y1: 50, x2: 650, y2: 98, kind: 'arrow', route: 2 }];
  assert.deepEqual(types({ boxes, lines: around }), []);
  // frame edges and lifelines are not arrows
  assert.deepEqual(types({ boxes, lines: [{ x1: 0, y1: 150, x2: 700, y2: 150, kind: 'frame' }] }), []);
});

test('off the canvas', () => {
  assert.deepEqual(types({ boxes: [{ x: 900, y: 100, w: 200, h: 50 }] }), ['off-canvas']);
});

test('emoji and non-serif fonts', () => {
  assert.deepEqual(types({ texts: [{ x: 0, y: 0, w: 10, h: 10, text: 'Done ✅' }] }), ['emoji']);
  assert.deepEqual(types({ texts: [{ x: 0, y: 0, w: 10, h: 10, text: 'Warn ⚠️' }] }), ['emoji']);
  assert.deepEqual(types({ texts: [{ x: 0, y: 0, w: 10, h: 10, text: 'A → B ↔ C ① …' }] }), []);
  assert.deepEqual(types({ texts: [{ x: 0, y: 0, w: 10, h: 10, text: 'x', fonts: ['Songti SC', 'PingFang SC'] }] }), ['font']);
  assert.deepEqual(types({ texts: [{ x: 0, y: 0, w: 10, h: 10, text: 'x', fonts: ['Times New Roman', 'Noto Serif SC', 'Liberation Serif'] }] }), []);
});

test('a label on ivory may sit on an arrow but not on a zone boundary', () => {
  const text = { x: 100, y: 10, w: 50, h: 20, text: 'x', bg: true };
  assert.deepEqual(types({ texts: [text], lines: [{ x1: 0, y1: 20, x2: 300, y2: 20, kind: 'arrow', route: 1 }] }), []);
  assert.deepEqual(types({ texts: [text], lines: [{ x1: 120, y1: 0, x2: 120, y2: 300, kind: 'frame' }] }), ['line-through-text']);
  // a frame's own label sits on its top edge
  assert.deepEqual(types({ texts: [{ ...text, frame: true }], lines: [{ x1: 0, y1: 20, x2: 300, y2: 20, kind: 'frame' }] }), []);
});

test('text running to the side of its box', () => {
  const boxes = [{ x: 100, y: 100, w: 200, h: 60 }];
  assert.deepEqual(types({ boxes, texts: [{ x: 101, y: 120, w: 197, h: 20, text: 'long' }] }), ['text-touches-border']);
  assert.deepEqual(types({ boxes, texts: [{ x: 116, y: 120, w: 168, h: 20, text: 'padded' }] }), []);
});

test('label text the browser parsed as an HTML tag', () => {
  const issues = checkLayout({ stage, tags: [{ tag: 'task-report', text: '', x: 100, y: 40 }, { tag: 't', text: 'List', x: 10, y: 10 }] });
  assert.deepEqual(issues.map((i) => i.type), ['html-tag', 'html-tag']);
  assert.match(issues[0].message, /an empty label at \(100,40\) contains <task-report>.*&lt;task-report&gt;/);
  assert.match(issues[1].message, /"List" .* contains <t>/);
});

// ---- warnings ----
const warn = (geom, o) => checkWarnings({ stage, ...geom }, o);
const wtypes = (geom, o) => warn(geom, o).map((w) => w.type);
const seg = (x1, y1, x2, y2, route) => ({ x1, y1, x2, y2, kind: 'arrow', route });
// A drawing that fills the canvas to within 60px on every side, so no margin warning interferes
const fill = [{ x: 60, y: 60, w: 880, h: 480 }];

test('warnings: a clean figure has none', () => {
  assert.deepEqual(wtypes({ frames: fill, lines: [seg(100, 100, 400, 100, 1), seg(100, 200, 400, 200, 2)],
    texts: [{ x: 100, y: 300, w: 80, h: 20, text: '覆盖范围：第 1 轮', size: 16 }] }), []);
});

test('crossing: arrows that cross, not arrows that meet at an end', () => {
  assert.equal(crossPoint(seg(0, 0, 100, 0), seg(50, -50, 50, 50)).x, 50);
  assert.equal(crossPoint(seg(0, 0, 100, 0), seg(100, 0, 100, 50)), null);   // meet at an end
  assert.equal(crossPoint(seg(0, 0, 100, 0), seg(0, 10, 100, 10)), null);    // parallel
  const w = warn({ frames: fill, lines: [seg(100, 300, 500, 300, 1), seg(300, 100, 300, 500, 2)] });
  assert.deepEqual(w.map((x) => x.type), ['crossing']);
  assert.match(w[0].message, /^two arrows cross at \(300,300\)/);
  const d = warn({ frames: fill, lines: [seg(100, 100, 500, 500, 1), seg(100, 500, 500, 100, 2)] });
  assert.match(d[0].message, /^two diagonal arrows cross at \(300,300\)/);
  // segments of one route do not cross themselves; two arrows into the same point only touch
  assert.deepEqual(wtypes({ frames: fill, lines: [seg(100, 300, 300, 300, 1), seg(300, 300, 300, 100, 1)] }), []);
  assert.deepEqual(wtypes({ frames: fill, lines: [seg(100, 100, 300, 300, 1), seg(500, 100, 300, 300, 2)] }), []);
});

test('diagonal: only in figures declared architecture, flow, overview or tree', () => {
  const lines = [seg(100, 100, 400, 300, 1)];
  assert.deepEqual(wtypes({ frames: fill, lines }), []);
  assert.deepEqual(wtypes({ frames: fill, lines, kind: 'sequence' }), []);
  const w = warn({ frames: fill, lines, kind: 'architecture' });
  assert.deepEqual(w.map((x) => x.type), ['diagonal']);
  assert.match(w[0].message, /slanted segment \(100,100\) → \(400,300\); in an architecture figure/);
  assert.deepEqual(wtypes({ frames: fill, lines: [seg(100, 100, 400, 101, 1)], kind: 'flow' }), []);   // within 2px is straight
  assert.deepEqual(wtypes({ frames: fill, lines, kind: 'tree' }), ['diagonal']);
});

test('detour: a route much longer than the distance between its ends', () => {
  const around = [seg(400, 300, 400, 80, 1), seg(400, 80, 900, 80, 1), seg(900, 80, 900, 520, 1), seg(900, 520, 500, 520, 1), seg(500, 520, 500, 320, 1)];
  const w = warn({ frames: fill, lines: around });
  assert.deepEqual(w.map((x) => x.type), ['detour']);
  assert.match(w[0].message, /runs 1760px for ends 120px apart/);
  // a self-call loop is short in absolute terms
  assert.deepEqual(wtypes({ frames: fill, lines: [seg(300, 200, 360, 200, 2), seg(360, 200, 360, 234, 2), seg(360, 234, 304, 234, 2)] }), []);
});

test('small-text: sizes scaled to the display width', () => {
  const texts = [{ x: 100, y: 100, w: 60, h: 16, text: 'tiny', size: 13 }];
  assert.deepEqual(wtypes({ frames: fill, texts }), []);   // a 1000px canvas is shown at full size
  const wide = { w: 3000, h: 600 };
  const w = checkWarnings({ stage: wide, frames: [{ x: 60, y: 60, w: 2880, h: 480 }], texts });
  assert.deepEqual(w.map((x) => x.type), ['small-text']);
  assert.match(w[0].message, /1 label\(s\) read below 8px when the 3000px canvas is shown 1600px wide, e.g. "tiny" 13px; use at least 15px/);
  assert.deepEqual(checkWarnings({ stage: wide, frames: [{ x: 60, y: 60, w: 2880, h: 480 }], texts }, { displayWidth: 3000 }), []);
});

test('margin: suggests a size for the right and bottom, a move for the left and top', () => {
  const w = warn({ boxes: [{ x: 70, y: 70, w: 500, h: 300 }] });
  assert.deepEqual(w.map((x) => x.type), ['margin']);
  assert.equal(w[0].message, 'empty margin right 430px, bottom 230px; set the size to 640x440');
  const m = warn({ boxes: [{ x: 300, y: 70, w: 640, h: 470 }] });
  assert.equal(m[0].message, 'empty margin left 300px; move everything left by 230px');
});

test('cjk-punct: half-width punctuation next to Chinese and full-width brackets', () => {
  const t = (text) => ({ frames: fill, texts: [{ x: 100, y: 100, w: 200, h: 20, text, size: 16 }] });
  const w = warn(t('覆盖范围: 第 1 轮; 软线'));
  assert.deepEqual(w.map((x) => x.type), ['cjk-punct']);
  assert.match(w[0].message, /half-width ":" ";" next to Chinese; use "：" "；"/);
  assert.deepEqual(wtypes(t('压缩器（后台）')), ['cjk-punct']);
  assert.deepEqual(wtypes(t('1k token: 13px, ok; 12:30')), []);
  assert.deepEqual(wtypes(t('覆盖范围：第 1 轮 (UTC)')), []);
});
