import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLayout, segmentHitsRect, intersectArea, contains } from './layout-check.mjs';

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
