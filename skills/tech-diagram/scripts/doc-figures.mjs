#!/usr/bin/env node
// Check that a document's figures are numbered in reading order and that every "图 N" / "Figure N" points
// at the right figure, in the document and in each figure's HTML.
//
//   node doc-figures.mjs <doc.md> [--json]
//
// Lists the local images the document embeds (Markdown ![…](…) and <img src>), in the order they first
// appear. A figure's number is its place in that order. Reports:
//   - a file whose numeric prefix (01-overview.png) differs from its number, with the rename to make
//     (and the same for the .html next to it); renames are only suggested, never made. Once the set is
//     published (a line "published: <targets>" in the diagram-binding.md next to the figures), file names
//     stay fixed and no renames are listed; captions alone carry the reading order;
//   - a caption ("图 N" or "Figure N" in the alt text, or on the line right after or before the image)
//     that differs from the number;
//   - every "图 N" / "Figure N" in the text, and in main() of each figure's HTML, that points at a figure
//     whose number has changed or at no figure. When figures carry captions, N means the figure captioned
//     N; otherwise the N-th figure.
// Exits 1 when it reports anything, 0 when numbering and references agree.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractMain } from './main.mjs';

const REF = /(图|[Ff]igure|Fig\.)\s*(\d+)/g;
const CAPTION = /^(?:图|[Ff]igure|Fig\.)\s*(\d+)/;
const MD_IMG = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
const HTML_IMG = /<img\b[^>]*>/gi;

const plainLine = (l) => l.replace(/^\s*(?:[>*_#-]\s*)*/, '').replace(/^[*_]+/, '').trim();
const isLocal = (src) => !/^(?:[a-z]+:|\/\/|#)/i.test(src);

// Lines of the document with fenced code blocks blanked, so line numbers stay true
function proseLines(text) {
  let fence = null;
  return text.split('\n').map((l) => {
    const m = /^\s*(```+|~~~+)/.exec(l);
    if (m) {
      if (!fence) fence = m[1][0];
      else if (m[1][0] === fence) { fence = null; }
      return '';
    }
    return fence ? '' : l;
  });
}

function images(lines) {
  const found = [];
  lines.forEach((l, i) => {
    for (const m of l.matchAll(MD_IMG)) found.push({ line: i + 1, alt: m[1], src: m[2], at: m.index });
    for (const m of l.matchAll(HTML_IMG)) {
      const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(m[0]);
      const alt = /\balt\s*=\s*["']([^"']*)["']/i.exec(m[0]);
      if (src) found.push({ line: i + 1, alt: alt ? alt[1] : '', src: src[1], at: m.index });
    }
  });
  return found.sort((a, b) => a.line - b.line || a.at - b.at).filter((f) => isLocal(f.src));
}

function caption(img, lines) {
  const fromAlt = CAPTION.exec(plainLine(img.alt));
  if (fromAlt) return { n: Number(fromAlt[1]), line: img.line };
  const near = (step) => {
    for (let i = img.line - 1 + step; i >= 0 && i < lines.length; i += step) {
      if (!lines[i].trim()) continue;
      return { text: plainLine(lines[i]), line: i + 1 };
    }
    return null;
  };
  for (const c of [near(1), near(-1)]) {
    const m = c && CAPTION.exec(c.text);
    if (m) return { n: Number(m[1]), line: c.line };
  }
  return null;
}

export function checkDocFigures(docPath) {
  const doc = resolve(docPath);
  const dir = dirname(doc);
  const lines = proseLines(readFileSync(doc, 'utf8'));
  const rel = (p) => relative(dir, p) || p;

  const figures = [];
  for (const img of images(lines)) {
    const file = resolve(dir, decodeURI(img.src.split(/[?#]/)[0]));
    if (figures.some((f) => f.file === file)) continue;
    figures.push({ n: figures.length + 1, line: img.line, src: img.src, file, caption: caption(img, lines) });
  }
  const issues = [], renames = [];
  const count = figures.length;
  // A published set keeps its file names, so links and anchors in its published copies keep working
  const bindings = [...new Set(figures.map((f) => join(dirname(f.file), 'diagram-binding.md')))].filter(existsSync);
  const published = bindings.some((b) => /^published:[ \t]*[^\s<]/m.test(readFileSync(b, 'utf8')));
  const width = Math.max(2, String(count).length);

  for (const f of figures) {
    if (!existsSync(f.file)) issues.push(`line ${f.line}: ${f.src} does not exist`);
    const html = join(dirname(f.file), basename(f.file, extname(f.file)) + '.html');
    f.html = existsSync(html) ? html : null;
    const base = basename(f.file);
    const m = /^(\d+)([-_. ])?(.*)$/.exec(base);
    if (!published && (!m || Number(m[1]) !== f.n)) {
      const want = String(f.n).padStart(m ? Math.max(width, m[1].length) : width, '0') + (m ? (m[2] || '-') + m[3] : '-' + base);
      renames.push({ from: rel(f.file), to: rel(join(dirname(f.file), want)), html: !!f.html });
    }
    if (f.caption && f.caption.n !== f.n) {
      issues.push(`line ${f.caption.line}: the caption of ${f.src} says ${f.caption.n}, but it is figure ${f.n} in reading order`);
    }
  }
  const captioned = figures.filter((f) => f.caption);
  for (const n of new Set(captioned.map((f) => f.caption.n))) {
    const same = captioned.filter((f) => f.caption.n === n);
    if (same.length > 1) issues.push(`${same.map((f) => f.src).join(' and ')} are both captioned ${n}`);
  }

  // Where a reference "N" points now: the figure captioned N, else the N-th figure
  const target = (n) => (captioned.length ? captioned.find((f) => f.caption.n === n) : figures[n - 1]);
  const checkRef = (where, word, n) => {
    const f = target(n);
    if (!f) return `${where}: "${word} ${n}" points at no figure (the document has ${count})`;
    if (f.n !== n) return `${where}: "${word} ${n}" points at ${f.src}, which is now figure ${f.n}; write "${word} ${f.n}"`;
    return null;
  };
  const captionLines = new Set(captioned.map((f) => f.caption.line));
  lines.forEach((l, i) => {
    if (captionLines.has(i + 1)) return;
    for (const m of l.replace(MD_IMG, '').replace(HTML_IMG, '').matchAll(REF)) {
      const issue = checkRef(`line ${i + 1}`, m[1], Number(m[2]));
      if (issue) issues.push(issue);
    }
  });
  for (const f of figures.filter((x) => x.html)) {
    const src = readFileSync(f.html, 'utf8');
    let body, offset = 0;
    try {
      body = extractMain(src);
      offset = src.slice(0, src.indexOf(body.trimEnd())).split('\n').length - 1;
    } catch { body = src; }
    body.split('\n').forEach((l, i) => {
      for (const m of l.matchAll(REF)) {
        const issue = checkRef(`${rel(f.html)}:${offset + i + 1}`, m[1], Number(m[2]));
        if (issue) issues.push(`${issue}, then re-render ${basename(f.html)}`);
      }
    });
  }
  return { published, figures: figures.map(({ n, line, src, caption: c, html }) => ({ n, line, src, caption: c ? c.n : null, html: html ? rel(html) : null })),
           issues, renames };
}

function cli() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const files = args.filter((a) => a !== '--json');
  if (files.length !== 1) {
    console.error('usage: node doc-figures.mjs <doc.md> [--json]');
    process.exit(2);
  }
  let r;
  try { r = checkDocFigures(files[0]); } catch (e) { console.error(e.message); process.exit(2); }
  if (json) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`figures in reading order: ${r.figures.length}${r.published ? ' (published set: file names stay fixed)' : ''}`);
    r.figures.forEach((f) => console.log(`  ${f.n}  line ${f.line}  ${f.src}${f.caption !== null ? `  caption ${f.caption}` : ''}${f.html ? '' : '  (no .html next to it)'}`));
    if (r.renames.length) {
      console.log('renames to number files in reading order (not made; rename through a temporary name when two collide):');
      r.renames.forEach((x) => console.log(`  ${x.from} → ${x.to}${x.html ? ' (and the .html next to it)' : ''}`));
    }
    if (r.issues.length) {
      console.log(`issues: ${r.issues.length}`);
      r.issues.forEach((i) => console.log(`- ${i}`));
    }
    if (!r.renames.length && !r.issues.length) console.log('numbering and references agree');
  }
  process.exit(r.renames.length || r.issues.length ? 1 : 0);
}

// Run as a CLI also when called through a symlink (the Skill is usually installed as one)
const invoked = process.argv[1] && existsSync(process.argv[1]) ? realpathSync(process.argv[1]) : '';
if (fileURLToPath(import.meta.url) === invoked) cli();
