// Acceptance deviations: verify checkpoints the owner judged with another
// method because their literal wording cannot be judged or must misjudge,
// while spec already settles the product behaviour (deliver SKILL.md, 口径偏差).
// Shared by run-verifier.mjs (hands them to the verifier) and
// check-delivery.mjs (checks the verifier judged each one), so the two
// scripts read the same entries the same way.
//
// plan.md: one section whose heading is 口径偏差 (any level, emphasis
// allowed), holding top-level list items that start with an ID (D1, D2, ...)
// and four labelled sub-items: 字面, 不成立的原因, 改用, 推翻后重跑.
// Fenced code blocks are ignored everywhere. Anything else in the section, a
// second section, or a D<n> item outside the section is a problem, not
// "no deviations", so an entry cannot be left out of the checks by format.
import { createHash } from "node:crypto";

const LABELS = ["字面", "不成立的原因", "改用", "推翻后重跑"];
const CHECKPOINT = /\b[SR]\d{2,}\b/;
const ITEM = /^([-*+])[ \t]+\**(D\d+)(?![0-9A-Za-z])\**(.*)$/;
const LOOSE_ITEM = /^[ \t]*[-*+][ \t]+\**D\d+\b/;

// Lines with fenced code blocks blanked out, so examples never count.
function withoutFences(text) {
  let fence = null;
  return text.split("\n").map((line) => {
    const m = line.match(/^[ \t]*(`{3,}|~{3,})/);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      return "";
    }
    if (m) {
      fence = m[1];
      return "";
    }
    return line;
  });
}

const plain = (line) => line.replace(/[*_`]/g, "").trim();
const headingOf = (line) => line.match(/^(#{1,6})[ \t]+(.*)$/);

export function digest(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function parseDeviations(plan) {
  const lines = withoutFences(plan);
  const entries = [];
  const problems = [];
  const starts = lines
    .map((line, i) => ({ i, h: headingOf(line) }))
    .filter(({ h }) => h && plain(h[2]).startsWith("口径偏差"));
  if (starts.length > 1) problems.push("plan.md has more than one 口径偏差 section; keep one");
  let section = null;
  if (starts.length) {
    const { i, h } = starts[0];
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = headingOf(lines[j]);
      if (next && next[1].length <= h[1].length) {
        end = j;
        break;
      }
    }
    section = [i, end];
  }
  lines.forEach((line, i) => {
    const inside = section && i > section[0] && i < section[1];
    if (!inside && LOOSE_ITEM.test(line))
      problems.push(`口径偏差 entries belong in the 口径偏差 section of plan.md: ${line.trim().slice(0, 60)}`);
  });
  if (!section) return { entries, problems };
  let current = null;
  for (const line of lines.slice(section[0] + 1, section[1])) {
    const item = line.match(ITEM);
    if (item) {
      current = { id: item[2], lines: [line] };
      entries.push(current);
    } else if (line.trim() === "") {
      if (current) current.lines.push(line);
    } else if (current && /^[ \t]+\S/.test(line)) current.lines.push(line);
    else {
      problems.push(`unrecognized line in the 口径偏差 section (entries start with "- D1"): ${line.trim().slice(0, 60)}`);
      current = null;
    }
  }
  const seen = new Set();
  for (const entry of entries) {
    while (entry.lines.length && entry.lines.at(-1).trim() === "") entry.lines.pop();
    entry.text = entry.lines.map((l) => l.trimEnd()).join("\n");
    entry.sha256 = digest(entry.text);
    delete entry.lines;
    if (seen.has(entry.id)) problems.push(`口径偏差 ${entry.id} appears twice in plan.md`);
    seen.add(entry.id);
    if (!CHECKPOINT.test(entry.text.split("\n")[0]))
      problems.push(`口径偏差 ${entry.id} names no scenario or requirement (S01, R01, ...) on its first line`);
    const missing = LABELS.filter(
      (label) => !new RegExp(`^[ \\t]+[-*+][ \\t]+\\**${label}\\**[ \\t]*[:：][ \\t]*\\S`, "m").test(entry.text),
    );
    if (missing.length)
      problems.push(`口径偏差 ${entry.id} has no non-empty ${missing.join("、")} (see plan-format.md)`);
  }
  return { entries, problems };
}

// The verifier's judgements, read only from the report's 口径偏差 section
// (a heading or a line that starts with the label, until the next heading or
// closing-section label) with code blocks ignored. Each line is
// `D1：成立；未放宽；<reason>`; a list marker may lead.
const REPORT_LABELS = ["冒烟集与回归范围", "代码问题", "可选建议", "验收文档改动", "口径偏差"];
const labelOf = (line) => {
  const text = plain(line.replace(/^[ \t]*(#{1,6}|[-*+])[ \t]+/, ""));
  return REPORT_LABELS.find((label) => text.startsWith(label)) ?? (headingOf(line) ? "heading" : null);
};

export function parseJudgements(report) {
  const lines = withoutFences(report);
  const judged = new Map();
  const problems = [];
  const starts = lines.map((line, i) => (labelOf(line) === "口径偏差" ? i : -1)).filter((i) => i >= 0);
  if (starts.length === 0) return { found: false, judged, problems };
  if (starts.length > 1) problems.push("the report has more than one 口径偏差 section");
  const body = [];
  const first = lines[starts[0]].replace(/^.*?口径偏差\**[ \t]*[:：]?/, "");
  if (first.trim()) body.push(first);
  for (const line of lines.slice(starts[0] + 1)) {
    if (labelOf(line)) break;
    body.push(line);
  }
  for (const line of body) {
    const m = line.match(
      /^[ \t]*(?:[-*+][ \t]+)?\**(D\d+)\**[ \t]*[:：][ \t]*(成立|不成立)[ \t]*[;；][ \t]*(未放宽|放宽)[ \t]*(?:[;；][ \t]*(.*))?$/,
    );
    if (!m) continue;
    const reason = (m[4] ?? "").trim();
    if (judged.has(m[1])) problems.push(`the report judges 口径偏差 ${m[1]} more than once`);
    const before = judged.get(m[1]);
    judged.set(m[1], {
      holds: m[2] === "成立",
      // A later line never clears an earlier "looser".
      looser: m[3] === "放宽" || Boolean(before?.looser),
      reason: reason || before?.reason || "",
    });
    if (!reason) problems.push(`the report's judgement of 口径偏差 ${m[1]} gives no reason`);
  }
  return { found: true, judged, problems };
}
