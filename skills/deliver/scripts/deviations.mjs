// Acceptance deviations: verify checkpoints the owner judged with another
// method because their literal wording cannot be judged or must misjudge,
// while spec already settles the product behaviour (deliver SKILL.md, 口径偏差).
// Shared by run-verifier.mjs (hands them to the verifier) and
// check-delivery.mjs (checks the verifier judged each one), so the two
// scripts read the same entries.

const ENTRY = /^-[ \t]+(D\d+)\b(.*)$/;
const CHECKPOINT = /\b[SR]\d{2,}\b/;

// Entries under the plan's 口径偏差 heading: top-level list items that start
// with an ID (D1, D2, ...), each with the lines indented under it.
export function parseDeviations(plan) {
  const lines = plan.split("\n");
  const entries = [];
  const problems = [];
  const start = lines.findIndex((line) => /^#{1,6}[ \t]+口径偏差/.test(line));
  if (start === -1) return { entries, problems };
  const level = lines[start].match(/^(#+)/)[1].length;
  let current = null;
  for (const line of lines.slice(start + 1)) {
    const heading = line.match(/^(#{1,6})[ \t]/);
    if (heading && heading[1].length <= level) break;
    const entry = line.match(ENTRY);
    if (entry) {
      current = { id: entry[1], lines: [line] };
      entries.push(current);
    } else if (current && (/^[ \t]+\S/.test(line) || line.trim() === "")) current.lines.push(line);
    else if (/^-[ \t]/.test(line)) {
      problems.push(`口径偏差 entry does not start with an ID such as D1: ${line.trim().slice(0, 60)}`);
      current = null;
    }
  }
  const seen = new Set();
  for (const entry of entries) {
    entry.text = entry.lines.join("\n").trimEnd();
    delete entry.lines;
    if (seen.has(entry.id)) problems.push(`口径偏差 ${entry.id} appears twice in plan.md`);
    seen.add(entry.id);
    if (!CHECKPOINT.test(entry.text))
      problems.push(`口径偏差 ${entry.id} names no scenario or requirement (S01, R01, ...)`);
    if (!/改用/.test(entry.text))
      problems.push(`口径偏差 ${entry.id} has no 改用 line saying how the checkpoint is judged instead`);
  }
  return { entries, problems };
}

// The verifier's judgement lines in its 口径偏差 section:
// `D1：成立；未放宽；<reason>` (a leading list marker is allowed).
export function parseJudgements(report) {
  const judged = new Map();
  for (const m of report.matchAll(
    /^[ \t]*(?:[-*][ \t]+)?(D\d+)[ \t]*[:：][ \t]*(成立|不成立)[ \t]*[;；][ \t]*(未放宽|放宽)(?:[ \t]*[;；][ \t]*(.*))?$/gm,
  ))
    judged.set(m[1], { holds: m[2] === "成立", looser: m[3] === "放宽", reason: (m[4] ?? "").trim() });
  return judged;
}
