// Layout checks for a rendered diagram. Pure functions over the geometry that render.mjs collects
// from the page, so they can be tested without a browser.
//
// Input: { stage: { w, h }, boxes, frames, lines, texts }
//   boxes:  [{ x, y, w, h }]                       closed shapes drawn by the helpers
//   frames: [{ x, y, w, h }]                       dashed zone boundaries
//   lines:  [{ x1, y1, x2, y2, kind, route }]      kind: arrow | frame | lifeline | timeline;
//                                                  segments of one arrow or route share `route`
//   texts:  [{ x, y, w, h, text, bg, frame, fonts }] painted text extent; bg = has an ivory background,
//                                                  frame = the label of a frame, sitting on its top edge
// Output: [{ type, message }]

const TOL = 2;        // px a text may touch a border without counting as crossing it
const BOX_INSET = 6;  // px an arrow may enter a box it does not start or end at (rough strokes wobble)
const EDGE_GAP = 6;   // px of side clearance text inside a box needs
const END_REACH = 14; // px around an arrow's first and last point that counts as "at" a box

const fmt = (r) => `(${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.w)}x${Math.round(r.h)})`;
const short = (s) => (s.length > 40 ? s.slice(0, 39) + '…' : s);
const inset = (r, d) => ({ x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d });

export function intersectArea(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

export function contains(outer, inner, tol = 0) {
  return inner.x >= outer.x - tol && inner.y >= outer.y - tol &&
    inner.x + inner.w <= outer.x + outer.w + tol && inner.y + inner.h <= outer.y + outer.h + tol;
}

function pointIn(r, x, y, pad = 0) {
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
}

// Liang–Barsky clipping: does the segment pass through the rectangle's interior?
export function segmentHitsRect(s, r) {
  if (r.w <= 0 || r.h <= 0) return false;
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  let t0 = 0, t1 = 1;
  const edges = [[-dx, s.x1 - r.x], [dx, r.x + r.w - s.x1], [-dy, s.y1 - r.y], [dy, r.y + r.h - s.y1]];
  for (const [p, q] of edges) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return t1 - t0 > 1e-6;
}

const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;
const NON_SERIF = /sans|PingFang|Hei|Hiragino|Helvetica|Arial|YaHei|Emoji|Kai|Caveat|Comic|Hand|Script|Cursive/i;

export function checkLayout({ stage, boxes = [], frames = [], lines = [], texts = [] }) {
  const issues = [];
  const add = (type, message) => issues.push({ type, message });
  const canvas = { x: 0, y: 0, w: stage.w, h: stage.h };

  // Text on text
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      if (intersectArea(inset(texts[i], 1), inset(texts[j], 1)) > 4) {
        add('text-overlap', `"${short(texts[i].text)}" ${fmt(texts[i])} overlaps "${short(texts[j].text)}" ${fmt(texts[j])}`);
      }
    }
  }

  // A line through text that has no background to mask it. A label on ivory may sit on an arrow or a
  // lifeline, but not on a zone boundary: it would hide where the zone ends.
  for (const t of texts) {
    if (t.frame) continue;
    const hit = lines.find((s) => (!t.bg || s.kind === 'frame') && segmentHitsRect(s, inset(t, TOL)));
    if (hit) add('line-through-text', `${/^[aeiou]/.test(hit.kind) ? 'an' : 'a'} ${hit.kind} line crosses "${short(t.text)}" ${fmt(t)}`);
  }

  // Text that straddles a box border (spills out of its node, or onto a neighbour)
  for (const t of texts) {
    for (const b of boxes) {
      if (intersectArea(inset(t, TOL), b) > 0 && !contains(b, t, TOL)) {
        add('text-crosses-box', `"${short(t.text)}" ${fmt(t)} crosses the border of the box at ${fmt(b)}`);
        break;
      }
      // Inside, but against a side: rough strokes wobble a few px, so the text looks like it touches the line
      if (contains(b, t, TOL) && Math.min(t.x - b.x, b.x + b.w - (t.x + t.w)) < EDGE_GAP && t.w > b.w / 2) {
        add('text-touches-border', `"${short(t.text)}" ${fmt(t)} runs to the side of the box at ${fmt(b)}; widen the box or shorten the text`);
        break;
      }
    }
  }

  // An arrow through a box that is neither where it starts nor where it ends
  const routes = new Map();
  for (const s of lines.filter((l) => l.kind === 'arrow')) {
    if (!routes.has(s.route)) routes.set(s.route, []);
    routes.get(s.route).push(s);
  }
  for (const segs of routes.values()) {
    const first = segs[0], last = segs[segs.length - 1];
    for (const b of boxes) {
      if (pointIn(b, first.x1, first.y1, END_REACH) || pointIn(b, last.x2, last.y2, END_REACH)) continue;
      if (segs.some((s) => segmentHitsRect(s, inset(b, BOX_INSET)))) {
        add('arrow-through-box', `the arrow from (${Math.round(first.x1)},${Math.round(first.y1)}) to ` +
          `(${Math.round(last.x2)},${Math.round(last.y2)}) passes through the box at ${fmt(b)}`);
      }
    }
  }

  // Off the canvas
  for (const r of [...texts, ...boxes, ...frames]) {
    if (!contains(canvas, r, 1)) add('off-canvas', `${r.text ? `"${short(r.text)}"` : 'a shape'} ${fmt(r)} extends past the ${stage.w}x${stage.h} canvas`);
  }

  // Emoji and non-serif fonts
  for (const t of texts) {
    if (EMOJI.test(t.text)) add('emoji', `"${short(t.text)}" contains an emoji`);
    const bad = (t.fonts || []).filter((f) => NON_SERIF.test(f));
    if (bad.length) add('font', `"${short(t.text)}" renders in ${bad.join(', ')}, not a serif font`);
  }

  return issues;
}
