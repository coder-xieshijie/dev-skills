#!/usr/bin/env node
// Render a diagram HTML to PNG with headless Chrome and check its layout.
//
//   node render.mjs <diagram.html> [--out <file.png>] [--scale 2] [--json]
//
// Waits for window.__renderDone, sizes the viewport to the .stage element, writes the PNG next to the
// HTML (or to --out), then runs layout-check.mjs on the geometry the template's helpers recorded and on
// the fonts Chrome actually used. Prints the issues; exits 1 when there are any, 2 when rendering failed.
// No dependencies: Chrome over the DevTools protocol, with Node's built-in WebSocket.
// Chrome: $CHROME, else the usual macOS / Linux locations.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkLayout } from './layout-check.mjs';

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];

export function findChrome() {
  if (process.env.CHROME) return existsSync(process.env.CHROME) ? process.env.CHROME : null;
  return CHROME_PATHS.find((p) => existsSync(p)) || null;
}

// In-page collector: geometry the helpers recorded plus the painted extent of every label.
const COLLECT = `(() => {
  const g = window.__diagram || { boxes: [], frames: [], lines: [] };
  const st = document.querySelector('.stage').getBoundingClientRect();
  const rel = (r) => ({ x: r.left - st.left, y: r.top - st.top, w: r.width, h: r.height });
  const texts = [];
  document.querySelectorAll('#labels > .label').forEach((el, i) => {
    el.dataset.ldx = i;
    let r;
    if (el.dataset.bg) r = el.getBoundingClientRect();
    else {
      // Union of the glyph boxes of every text node: block children span the full width, glyphs do not
      let l = Infinity, t = Infinity, rr = -Infinity, bb = -Infinity;
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!n.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const q of rg.getClientRects()) {
          l = Math.min(l, q.left); t = Math.min(t, q.top); rr = Math.max(rr, q.right); bb = Math.max(bb, q.bottom);
        }
      }
      r = l === Infinity ? { left: 0, top: 0, width: 0, height: 0 } : { left: l, top: t, width: rr - l, height: bb - t };
    }
    if (r.width && r.height) texts.push(Object.assign(rel(r), { text: el.innerText.replace(/\\s+/g, ' ').trim(), bg: !!el.dataset.bg, frame: !!el.dataset.frame, idx: i }));
  });
  g.boxes.filter((b) => b.text).forEach((b) => texts.push({ x: b.x, y: b.y, w: b.w, h: b.h, text: b.label, bg: false }));
  return JSON.stringify({ stage: { w: st.width, h: st.height }, boxes: g.boxes.filter((b) => !b.text),
                          frames: g.frames, lines: g.lines, texts });
})()`;

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { ok, err } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? err(new Error(`${m.error.message} (${JSON.stringify(m.error.data || '')})`)) : ok(m.result);
    }
  };
  let closed = null;
  const ready = new Promise((ok, err) => { ws.onopen = ok; ws.onerror = () => err(new Error('DevTools socket failed')); });
  // Chrome going away mid-session fails every pending and later call instead of leaving them hanging
  ws.onclose = () => {
    closed = new Error('Chrome closed the DevTools connection');
    for (const { err } of pending.values()) err(closed);
    pending.clear();
  };
  const send = (method, params = {}, sessionId) => new Promise((ok, err) => {
    if (closed) return err(closed);
    pending.set(++id, { ok, err });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  return { ready, send, close: () => ws.close() };
}

function launch(chrome) {
  const profile = mkdtempSync(join(tmpdir(), 'tech-diagram-'));
  const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    // CI runners often cannot start Chrome's sandbox (restricted user namespaces); local runs keep it.
    ...(process.env.CI ? ['--no-sandbox'] : []), 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = new Promise((ok, err) => {
    let buf = '';
    const timer = setTimeout(() => err(new Error('Chrome did not open a DevTools port within 20 s')), 20000);
    proc.stderr.on('data', (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); ok(m[1]); }
    });
    proc.on('exit', (code) => { clearTimeout(timer); err(new Error(`Chrome exited with ${code}: ${buf.slice(-400)}`)); });
    proc.on('error', (e) => { clearTimeout(timer); err(new Error(`Chrome could not start: ${e.message}`)); });
  });
  const stop = () => { proc.kill(); setTimeout(() => rmSync(profile, { recursive: true, force: true }), 300); };
  return { wsUrl, stop };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function render(htmlPath, { out, scale = 2, timeoutMs = 20000 } = {}) {
  const chrome = findChrome();
  if (!chrome) throw new Error(process.env.CHROME ? `CHROME=${process.env.CHROME} does not exist`
                                                   : 'Chrome not found; set CHROME to a Chrome or Chromium binary');
  const file = resolve(htmlPath);
  const png = resolve(out || join(dirname(file), basename(file).replace(/\.html?$/i, '') + '.png'));
  const browser = launch(chrome);
  let conn = null;
  try {
    conn = cdp(await browser.wsUrl);
    await conn.ready;
    const { targetId } = await conn.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await conn.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => conn.send(m, p, sessionId);
    const evaluate = async (expression, awaitPromise = false) => {
      const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const load = async () => {
      await s('Page.navigate', { url: pathToFileURL(file).href });
      const deadline = Date.now() + timeoutMs;
      while (!(await evaluate('window.__renderDone === true').catch(() => false))) {
        if (Date.now() > deadline) {
          const err = await evaluate('document.querySelector(".stage") ? "" : "no .stage element"').catch(() => '');
          throw new Error(`window.__renderDone was not set within ${timeoutMs / 1000} s ${err}` +
            '(main() threw, or rough.js did not load: check network access to cdn.jsdelivr.net)');
        }
        await sleep(100);
      }
      await evaluate('document.fonts.ready.then(() => true)', true);
    };
    await s('Page.enable'); await s('Runtime.enable'); await s('DOM.enable'); await s('CSS.enable');
    await load();
    const size = await evaluate('(() => { const r = document.querySelector(".stage").getBoundingClientRect(); return [Math.ceil(r.width), Math.ceil(r.height)]; })()');
    // Reload at the final size and scale so the canvas is drawn at device resolution.
    await s('Emulation.setDeviceMetricsOverride', { width: size[0], height: size[1], deviceScaleFactor: scale, mobile: false });
    await load();
    const geom = JSON.parse(await evaluate(COLLECT));

    // Fonts Chrome actually used for each label
    const { root } = await s('DOM.getDocument', { depth: -1 });
    const fontsByIdx = new Map();
    for (const t of geom.texts.filter((x) => x.idx !== undefined)) {
      const { nodeId } = await s('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-ldx="${t.idx}"]` });
      const families = new Set();
      const walk = async (id) => {
        const { fonts } = await s('CSS.getPlatformFontsForNode', { nodeId: id }).catch(() => ({ fonts: [] }));
        fonts.forEach((f) => families.add(f.familyName));
        const { node } = await s('DOM.describeNode', { nodeId: id, depth: 1 });
        for (const c of node.children || []) {
          if (c.nodeType === 1) {
            const { nodeIds } = await s('DOM.querySelectorAll', { nodeId: id, selector: ':scope > *' });
            for (const n of nodeIds) await walk(n);
            break;
          }
        }
      };
      await walk(nodeId);
      fontsByIdx.set(t.idx, [...families]);
    }
    geom.texts.forEach((t) => { if (t.idx !== undefined) t.fonts = fontsByIdx.get(t.idx); });

    const shot = await s('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: size[0], height: size[1], scale: 1 },
    });
    writeFileSync(png, Buffer.from(shot.data, 'base64'));
    return { png, size: { w: size[0], h: size[1], scale }, issues: checkLayout(geom) };
  } finally {
    conn?.close();
    browser.stop();
  }
}

async function cli() {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const json = args.includes('--json') ? (args.splice(args.indexOf('--json'), 1), true) : false;
  const out = opt('--out');
  const scale = Number(opt('--scale') || 2);
  if (args.length !== 1) {
    console.error('usage: node render.mjs <diagram.html> [--out <file.png>] [--scale 2] [--json]');
    process.exit(2);
  }
  let result;
  try {
    result = await render(args[0], { out, scale });
  } catch (e) {
    console.error(`render failed: ${e.message}`);
    process.exit(2);
  }
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`${result.png} (${result.size.w}x${result.size.h} @${result.size.scale}x)`);
    if (!result.issues.length) console.log('layout check: no issues');
    else {
      console.log(`layout check: ${result.issues.length} issue(s)`);
      result.issues.forEach((i) => console.log(`- [${i.type}] ${i.message}`));
    }
  }
  process.exit(result.issues.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) cli();
