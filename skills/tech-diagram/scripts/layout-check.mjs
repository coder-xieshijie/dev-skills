// Layout checks for a rendered diagram. Pure functions over the geometry that render.mjs collects
// from the page, so they can be tested without a browser.
//
// Input: { stage: { w, h }, kind, boxes, frames, lines, texts, tags }
//   kind:   what main() declared with kind(): architecture | flow | overview | sequence | lifecycle, or null
//   boxes:  [{ x, y, w, h }]                       closed shapes drawn by the helpers
//   frames: [{ x, y, w, h }]                       dashed zone boundaries
//   lines:  [{ x1, y1, x2, y2, kind, route }]      kind: arrow | frame | lifeline | timeline;
//                                                  segments of one arrow or route share `route`
//   texts:  [{ x, y, w, h, text, bg, frame, fonts, size }] painted text extent; bg = has an ivory background,
//                                                  frame = the label of a frame, sitting on its top edge,
//                                                  size = smallest font size in the label, px
//   tags:   [{ tag, text, x, y }]                  elements in a label other than b, br, span, div, i, sub,
//                                                  sup: label text like <task-report> that the browser parsed
//                                                  as a tag and did not draw
// Output of checkLayout: [{ type, message }], issues that fail the check.
// Output of checkWarnings: [{ type, message }], layout quality hints that do not fail it.

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

export function checkLayout({ stage, boxes = [], frames = [], lines = [], texts = [], tags = [] }) {
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

  // Text the browser took for an HTML tag: it is not drawn, and a label holding only it has no extent at all
  for (const t of tags) {
    add('html-tag', `${t.text ? `"${short(t.text)}"` : 'an empty label'} at (${Math.round(t.x)},${Math.round(t.y)}) ` +
      `contains <${t.tag}>, which the browser parsed as a tag and did not draw; write it as &lt;${t.tag}&gt;`);
  }

  return issues;
}

// ---------------------------------------------------------------------------------------------
// Warnings: what makes a figure read as cluttered without being wrong. They do not change the exit code.

const END_GAP = 8;             // px from a segment's end within which two arrows touch rather than cross
const DETOUR_RATIO = 1.8;      // path length over the Manhattan distance between an arrow's ends
const DETOUR_MIN = 200;        // px of extra length below which a loop is a local turn, not a detour
const MIN_DISPLAY_PX = 8;      // smallest readable text once the figure is scaled to the display width
const MARGIN_MAX = 120;        // px of empty canvas beyond which a side is a margin to trim
const RIGHT_ANGLE_KINDS = new Set(['architecture', 'flow', 'overview']);

const isDiagonal = (s) => Math.min(Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1)) > 2;
const len = (s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
const at = (x, y) => `(${Math.round(x)},${Math.round(y)})`;

// Where two segments cross, or null when they do not or only touch near an end
export function crossPoint(a, b) {
  const d = (a.x2 - a.x1) * (b.y2 - b.y1) - (a.y2 - a.y1) * (b.x2 - b.x1);
  if (Math.abs(d) < 1e-9) return null;   // parallel or collinear
  const t = ((b.x1 - a.x1) * (b.y2 - b.y1) - (b.y1 - a.y1) * (b.x2 - b.x1)) / d;
  const u = ((b.x1 - a.x1) * (a.y2 - a.y1) - (b.y1 - a.y1) * (a.x2 - a.x1)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  const x = a.x1 + t * (a.x2 - a.x1), y = a.y1 + t * (a.y2 - a.y1);
  const near = (s) => Math.hypot(x - s.x1, y - s.y1) < END_GAP || Math.hypot(x - s.x2, y - s.y2) < END_GAP;
  return near(a) || near(b) ? null : { x, y };
}

function arrowRoutes(lines) {
  const routes = new Map();
  for (const s of lines.filter((l) => l.kind === 'arrow')) {
    if (!routes.has(s.route)) routes.set(s.route, []);
    routes.get(s.route).push(s);
  }
  return [...routes.values()];
}

const ends = (segs) => `from ${at(segs[0].x1, segs[0].y1)} to ${at(segs[segs.length - 1].x2, segs[segs.length - 1].y2)}`;

// The extent of everything drawn, for the margin warning
function contentBox({ boxes, frames, lines, texts }) {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  const take = (x1, y1, x2, y2) => { l = Math.min(l, x1, x2); t = Math.min(t, y1, y2); r = Math.max(r, x1, x2); b = Math.max(b, y1, y2); };
  for (const q of [...boxes, ...frames, ...texts]) if (q.w > 0 && q.h > 0) take(q.x, q.y, q.x + q.w, q.y + q.h);
  for (const s of lines) take(s.x1, s.y1, s.x2, s.y2);
  return l === Infinity ? null : { l, t, r, b };
}

const CJK = '\\u3400-\\u9fff\\uf900-\\ufaff';
const HALF_PUNCT = new RegExp(`[${CJK}] ?([;:,])|([;:,]) ?[${CJK}]`, 'gu');
const FULL_BRACKET = /[（）]/u;
const FULL_FOR = { ';': '；', ':': '：', ',': '，' };

export function checkWarnings({ stage, kind = null, boxes = [], frames = [], lines = [], texts = [] }, { displayWidth = 1600 } = {}) {
  const warnings = [];
  const add = (type, message) => warnings.push({ type, message });
  const routes = arrowRoutes(lines);

  // Arrows crossing arrows; a crossing of two diagonals is the hardest to follow
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      let hit = null;
      for (const a of routes[i]) {
        for (const b of routes[j]) {
          const p = crossPoint(a, b);
          if (p && (!hit || (isDiagonal(a) && isDiagonal(b)))) hit = { p, diag: isDiagonal(a) && isDiagonal(b) };
        }
      }
      if (hit) add('crossing', `${hit.diag ? 'two diagonal arrows cross' : 'two arrows cross'} at ${at(hit.p.x, hit.p.y)}: ` +
        `the arrow ${ends(routes[i])} and the arrow ${ends(routes[j])}`);
    }
  }

  // Slanted arrow segments in figures whose arrows run at right angles
  if (RIGHT_ANGLE_KINDS.has(kind)) {
    for (const segs of routes) {
      const s = segs.find(isDiagonal);
      if (s) add('diagonal', `the arrow ${ends(segs)} has a slanted segment ${at(s.x1, s.y1)} → ${at(s.x2, s.y2)}; ` +
        `in ${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind} figure, route it with right angles`);
    }
  }

  // Arrows that travel much further than the distance between their ends
  for (const segs of routes) {
    const first = segs[0], last = segs[segs.length - 1];
    const path = segs.reduce((n, s) => n + len(s), 0);
    const direct = Math.abs(last.x2 - first.x1) + Math.abs(last.y2 - first.y1);
    if (path > DETOUR_RATIO * direct && path - direct > DETOUR_MIN) {
      add('detour', `the arrow ${ends(segs)} runs ${Math.round(path)}px for ends ${Math.round(direct)}px apart; ` +
        'move one end next to the other or route it through a nearer corridor');
    }
  }

  // Text too small once the figure is scaled down to the width it is read at
  const factor = Math.min(1, displayWidth / stage.w);
  const small = texts.filter((t) => t.size && t.size * factor < MIN_DISPLAY_PX).sort((a, b) => a.size - b.size);
  if (small.length) {
    const need = Math.ceil(MIN_DISPLAY_PX / factor);
    add('small-text', `${small.length} label(s) read below ${MIN_DISPLAY_PX}px when the ${stage.w}px canvas is shown ` +
      `${displayWidth}px wide, e.g. ${small.slice(0, 3).map((t) => `"${short(t.text)}" ${t.size}px`).join(', ')}; ` +
      `use at least ${need}px or a narrower canvas`);
  }

  // Empty canvas around the drawing
  const c = contentBox({ boxes, frames, lines, texts });
  if (c) {
    const m = { left: c.l, top: c.t, right: stage.w - c.r, bottom: stage.h - c.b };
    const wide = Object.entries(m).filter(([, v]) => v > MARGIN_MAX);
    if (wide.length) {
      const ceil10 = (v) => Math.ceil(v / 10) * 10;
      const clamp = (v) => Math.max(40, Math.min(MARGIN_MAX, v));
      const tips = [];
      if (m.left > MARGIN_MAX || m.top > MARGIN_MAX) {
        tips.push(`move everything ${[m.left > MARGIN_MAX && `left by ${Math.round(m.left - 70)}px`, m.top > MARGIN_MAX && `up by ${Math.round(m.top - 70)}px`].filter(Boolean).join(' and ')}`);
      }
      const w = ceil10(c.r + clamp(m.left)), h = ceil10(c.b + clamp(m.top));
      if (m.right > MARGIN_MAX || m.bottom > MARGIN_MAX) tips.push(`set the size to ${w}x${h}`);
      add('margin', `empty margin ${wide.map(([k, v]) => `${k} ${Math.round(v)}px`).join(', ')}; ${tips.join(', then ')}`);
    }
  }

  // Half-width punctuation in Chinese text, and full-width brackets anywhere
  for (const t of texts) {
    const found = new Set();
    for (const m of t.text.matchAll(HALF_PUNCT)) found.add(m[1] || m[2]);
    if (found.size) add('cjk-punct', `"${short(t.text)}" ${fmt(t)} has half-width ${[...found].map((p) => `"${p}"`).join(' ')} ` +
      `next to Chinese; use ${[...found].map((p) => `"${FULL_FOR[p]}"`).join(' ')}`);
    if (FULL_BRACKET.test(t.text)) add('cjk-punct', `"${short(t.text)}" ${fmt(t)} has full-width brackets; use half-width ( )`);
  }

  return warnings;
}
