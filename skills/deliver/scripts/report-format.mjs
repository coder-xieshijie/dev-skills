// Parsing of verify.md and verification reports, shared by run-verifier.mjs
// (is the report complete?) and check-delivery.mjs (may the MR merge?), so
// the two scripts cannot drift apart on the report format.

const ID = /\b[SR]\d{2,}\b/g;

// Table cells of one Markdown row, keeping escaped pipes inside a cell.
function cellsOf(line) {
  return line
    .replace(/\\\|/g, "\u0000")
    .split("|")
    .slice(1, -1)
    .map((c) => c.replace(/\u0000/g, "|").trim());
}

// What a report has to cover, read from the frozen verify.md:
// - scenarios: every scenario ID (S01, S02, ...);
// - requirements: requirement IDs (R01, ...) whose proof column in the
//   requirement table names a mechanical or existing check, so they need a
//   result row of their own;
// - blindSpots: IDs on the list items and table rows under the coverage
//   blind-spot heading. Prose there does not count, so an ID mentioned in
//   passing is not exempted.
// - unreadable: verify.md mentions R IDs but no requirement row could be read.
export function parseVerify(text) {
  const scenarios = [...new Set(text.match(/\bS\d{2,}\b/g) ?? [])].sort();
  const lines = text.split("\n");
  const requirements = new Set();
  let requirementRows = 0;
  for (const line of lines) {
    if (!line.trimStart().startsWith("|")) continue;
    const cells = cellsOf(line.trim());
    const id = cells[0]?.replace(/`/g, "").match(/^(R\d{2,})$/)?.[1];
    if (!id) continue;
    requirementRows += 1;
    if (/机械检查|已有检查/.test(cells[cells.length - 1] ?? "")) requirements.add(id);
  }
  const blindSpots = new Set();
  lines.forEach((line, i) => {
    const heading = line.match(/^(#{1,6})\s.*覆盖盲区/);
    if (!heading) return;
    for (const next of lines.slice(i + 1)) {
      const level = next.match(/^(#{1,6})\s/)?.[1].length;
      if (level && level <= heading[1].length) break;
      const entry = /^\s*([-*+]|\d+\.)\s/.test(next) || /^\s*\|(?!\s*:?-)/.test(next);
      if (entry) for (const id of next.match(ID) ?? []) blindSpots.add(id);
    }
  });
  return {
    scenarios,
    requirements: [...requirements].sort(),
    blindSpots,
    unreadable: requirementRows === 0 && /\bR\d{2,}\b/.test(text),
  };
}

export const REQUIRED_SECTIONS = ["冒烟集与回归范围", "代码问题"];

// The fixed parts of a report (see references/verifier-brief.md).
export function parseReport(text) {
  const rows = new Map();
  for (const m of text.matchAll(
    /^\|[ \t]*([SR]\d{2,})[ \t]*\|[ \t]*(PASS|FAIL|UNVERIFIED)[ \t]*\|([^|\n]*)\|([^|\n]*)\|[ \t]*$/gm,
  )) {
    if (!rows.has(m[1])) rows.set(m[1], []);
    rows.get(m[1]).push({ result: m[2], evidence: m[3].trim(), note: m[4].trim() });
  }
  const issues = text.match(/^code-issues:[ \t]*(\d+)[ \t]*$/m)?.[1];
  return {
    head: text.match(/^head:[ \t]*([0-9a-f]{40})[ \t]*$/m)?.[1] ?? null,
    verdict: text.match(/^verdict:[ \t]*(PASS|FAIL|UNVERIFIED)[ \t]*$/m)?.[1] ?? null,
    smoke: text.match(/^smoke-regression:[ \t]*(PASS|FAIL|UNVERIFIED)[ \t]*$/m)?.[1] ?? null,
    codeIssues: issues === undefined ? null : Number(issues),
    hasModel: /^验证模型[:：][ \t]*\S[^\n]*$/m.test(text),
    rows,
    missingSections: REQUIRED_SECTIONS.filter((section) => !text.includes(section)),
  };
}

// An UNVERIFIED row may stand only for a blind spot verify.md declares.
export function isDeclaredBlindSpot(id, row, verify) {
  return row.note.startsWith("覆盖盲区") && verify.blindSpots.has(id);
}

// Is the report complete and self-consistent? A FAIL result is still a
// complete report; whether it may merge is check-delivery's question.
export function reportProblems(report, verify, head) {
  const found = [];
  if (!report.head) found.push("no `head: <40-hex SHA>` line");
  else if (report.head !== head)
    found.push(`report head ${report.head.slice(0, 12)} is not ${head.slice(0, 12)}`);
  if (!report.verdict) found.push("no `verdict: PASS|FAIL|UNVERIFIED` line");
  if (!report.smoke) found.push("no `smoke-regression: PASS|FAIL|UNVERIFIED` line");
  if (report.codeIssues === null) found.push("no `code-issues: <count>` line");
  if (!report.hasModel) found.push("no `验证模型：` line with a value");
  if (verify.unreadable)
    found.push("verify.md mentions R IDs but no requirement table row could be read");
  for (const id of [...verify.scenarios, ...verify.requirements]) {
    const rows = report.rows.get(id);
    if (!rows) found.push(`${id} has no complete row (| ${id} | result | evidence | note |)`);
    else if (rows.some((r) => r.result !== "UNVERIFIED" && !r.evidence))
      found.push(`${id} has no evidence`);
  }
  for (const section of report.missingSections)
    found.push(`no \`${section}\` section (report may be truncated)`);
  for (const [id, rows] of report.rows)
    if (rows.some((r) => r.result === "UNVERIFIED" && !/^(覆盖盲区|环境受阻)/.test(r.note)))
      found.push(`${id} is UNVERIFIED without a reason starting with 覆盖盲区 or 环境受阻`);
  if (report.verdict === "PASS") {
    if (report.smoke && report.smoke !== "PASS")
      found.push(`verdict is PASS but smoke-regression is ${report.smoke}`);
    if (report.codeIssues) found.push(`verdict is PASS but code-issues is ${report.codeIssues}`);
    for (const [id, rows] of report.rows) {
      if (rows.some((r) => r.result === "FAIL")) found.push(`verdict is PASS but ${id} is FAIL`);
      else if (rows.some((r) => r.result === "UNVERIFIED" && !isDeclaredBlindSpot(id, r, verify)))
        found.push(`verdict is PASS but ${id} is UNVERIFIED and not a declared blind spot`);
    }
  }
  return found;
}
