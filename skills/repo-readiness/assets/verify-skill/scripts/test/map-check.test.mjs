import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { checkMaps } from '../map-check.mjs';
import { INDEX, MAP, makeRepo, write } from './helpers.mjs';

const problemsOf = (repo) => checkMaps(repo.config).problems.map((p) => `${p.check}: ${p.message}`);
const mapFile = (repo) => path.join(repo.mapDir, 'notes.md');
const editMap = (repo, from, to) => write(mapFile(repo), readFileSync(mapFile(repo), 'utf8').replace(from, to));

test('a well-formed map passes', () => {
  const result = checkMaps(makeRepo().config);
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
  assert.deepEqual(result.maps[0], {
    name: 'notes',
    file: 'docs/notes/feature-map/notes.md',
    subfeatures: 2,
    criteria: 5,
    scenarios: 3,
    scripted: ['API', 'Web'],
  });
  assert.deepEqual(result.specs, [{ spec: 'docs/notes/spec.md', ids: 3, referenced: 2 }]);
});

test('a criterion the script checks twice, or not at all, is reported', () => {
  const repo = makeRepo({
    scripts: {
      'notes.create.api.mjs': `export const scenario = { id: 'notes.create', entry: 'API' };
export async function run(t) {
  t.criterion('notes.create#1', true);
  t.criterion('notes.create#1', true);
}
`,
    },
  });
  const problems = problemsOf(repo);
  assert.ok(problems.includes('scenario: notes.create#1 is checked 2 times; each criterion exactly once'));
  assert.ok(problems.includes('scenario: notes.create#2 is checked 0 times; each criterion exactly once'));
});

test('an id the map does not give this entry is reported', () => {
  const repo = makeRepo({
    scripts: {
      'notes.list-empty.api.mjs': `export const scenario = { id: 'notes.list-empty', entry: 'API' };
export async function run(t) {
  t.criterion('notes.list-empty#1', true);
  t.criterion('notes.list-empty#9', true);
}
`,
    },
  });
  assert.ok(problemsOf(repo).includes('scenario: notes.list-empty#9 is not a API criterion of notes.list-empty in the map'));
});

test('a missing scenario script for a scripted entry is reported', () => {
  const repo = makeRepo({ scripts: { 'notes.create.web.mjs': null } });
  assert.ok(problemsOf(repo).includes('scenario: notes.create / Web has no scenario script scenarios/notes.create.web.mjs'));
});

test('ids must be unique and start with the map name', () => {
  const repo = makeRepo();
  editMap(repo, '- `notes.list-empty` (NOTE-02; API)', '- `other.list-empty` (NOTE-02; API)');
  assert.ok(problemsOf(repo).includes('id: other.list-empty does not start with the map name notes'));
});

test('a criterion under an entry its sub-feature does not declare is reported', () => {
  const repo = makeRepo();
  editMap(repo, '  - `notes.create#3` the list shows', '  - `notes.list-empty#2` the list shows');
  assert.ok(problemsOf(repo).includes('criteria: notes.list-empty#2 is under Web, which notes.list-empty does not declare'));
});

test('criteria are read only from the steps section: elsewhere a criterion id is a reference', () => {
  const repo = makeRepo();
  editMap(repo, '- Titles are required; an empty title answers 400.', '- `notes.create#2` reads the list once; a second read in the same second may lag.');
  assert.deepEqual(problemsOf(repo), []);
  assert.equal(checkMaps(repo.config).maps[0].criteria, 5);
  // Counterexample: under the steps section but outside an entry heading, it is still a misplaced criterion.
  editMap(repo, '### API\n', '- `notes.create#5` shared steps hold no criteria.\n\n### API\n');
  assert.ok(problemsOf(repo).includes('criteria: criterion notes.create#5 is not under an entry heading of "## Drive"'));
});

test('a look criterion outside a ui entry is reported', () => {
  const repo = makeRepo();
  editMap(repo, '`notes.create#2` the list', '`notes.create#2` (look) the list');
  assert.ok(problemsOf(repo).includes('criteria: notes.create#2: a look criterion belongs under an entry marked "ui": true'));
});

test('a map file the index does not list is reported', () => {
  const repo = makeRepo();
  write(path.join(repo.mapDir, 'extra.md'), MAP.replaceAll('notes.', 'extra.'));
  assert.ok(problemsOf(repo).includes('index: map file is not listed in the index'));
});

test('a spec id neither referenced nor named as not covered is reported', () => {
  const repo = makeRepo();
  editMap(repo, '- NOTE-03 (delete): there is no delete endpoint yet.', '- None.');
  assert.ok(problemsOf(repo).includes('spec: NOTE-03 is referenced by no sub-feature and not named under "Not covered"'));
});

test('a referenced id the spec does not define is reported', () => {
  const repo = makeRepo();
  editMap(repo, '(NOTE-02; API)', '(NOTE-09; API)');
  assert.ok(problemsOf(repo).includes('spec: notes.list-empty references NOTE-09, which docs/notes/spec.md does not define'));
});

test('run results in the map are reported', () => {
  const repo = makeRepo();
  write(mapFile(repo), `${readFileSync(mapFile(repo), 'utf8')}\n## Run record\n\n| notes.create | API | PASS |\n`);
  assert.ok(problemsOf(repo).includes("status: run results belong in the run's report, not in the map"));
});

test('a script that reads files or sets timers itself is reported', () => {
  const repo = makeRepo({
    scripts: {
      'notes.list-empty.api.mjs': `import { readFileSync } from 'node:fs';
export const scenario = { id: 'notes.list-empty', entry: 'API' };
export async function run(t) {
  await new Promise((r) => setTimeout(r, 1000));
  t.criterion('notes.list-empty#1', readFileSync('x').length === 0);
}
`,
    },
  });
  const problems = problemsOf(repo);
  assert.ok(problems.some((p) => p.startsWith('script: readFileSync: read evidence through t')));
  assert.ok(problems.includes('script: a timer: wait with t.until, t.hold or t.observe'));
});

test('a shared step that checks criteria is reported', () => {
  const repo = makeRepo({ scripts: { '_steps.mjs': "export const done = (t) => t.criterion('notes.create#1', true);\n" } });
  assert.ok(problemsOf(repo).includes('script: criteria are checked in the scenario script, not a shared step'));
});

test('a source without requirement ids is named as a code span; linked, it must have id headings', () => {
  const unlinked = makeRepo({
    files: { 'skill/features/README.md': INDEX.replace('[spec.md](../../docs/notes/spec.md)', '`docs/notes/design.md`, `src/notes.ts`') },
  });
  assert.deepEqual(checkMaps(unlinked.config).problems, []);
  assert.deepEqual(checkMaps(unlinked.config).specs, []);
  const linked = makeRepo({ files: { 'docs/notes/spec.md': '# Notes\n\nNotes are created and listed.\n' } });
  assert.ok(problemsOf(linked).some((p) => /^spec: no requirement id headings .* as a code span, not a link$/.test(p)));
});

test('a tool scripts or maps use that the verification Skill never names is a warning', () => {
  const repo = makeRepo({ files: { 'skill/SKILL.md': '# Verify\n\n- `api(method, path, body)`: an action.\n' } });
  editMap(repo, '- Titles are required', '- Inspect with `node $V do dump`. Titles are required');
  const result = checkMaps(repo.config);
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.warnings.map((w) => w.message).sort(),
    ['tool dump is used but the verification Skill never names it (`dump`)', 'tool read is used but the verification Skill never names it (`read`)'],
  );
});

test('a result tied to a date, a commit or a count is a run record, in a map or in the verification Skill', () => {
  const repo = makeRepo({
    files: {
      'skill/SKILL.md': '# Verify\n\nEvery sub-feature gets one result: PASS, FAIL, BLOCKED, UNVERIFIED or TO-CONFIRM.\n\nLast full run: 18 PASS, 1 TO-CONFIRM.\n',
      'skill/references/runs.md': '| Scenario | Commit | Result |\n|---|---|---|\n| notes.create.api | `a1b2c3d` | FAIL |\n',
    },
  });
  editMap(repo, '## Not covered', '| 2026-10-10 | notes.create | PASS |\n\n## Not covered');
  const status = checkMaps(repo.config).problems.filter((p) => p.check === 'status').map((p) => `${p.file}:${p.line}`);
  assert.deepEqual(status.sort(), ['docs/notes/feature-map/notes.md:37', 'skill/SKILL.md:5', 'skill/references/runs.md:3']);
});

test('product states and result words on their own are not run records', () => {
  const repo = makeRepo({
    files: {
      'skill/SKILL.md':
        '# Verify\n\nEvery sub-feature gets one result (PASS, FAIL, BLOCKED, UNVERIFIED, TO-CONFIRM). `jobs` is 4: measured on 2026-10-10 at base 9bf101a. `ok` means nothing is UNVERIFIED.\n\nSmoke: `node $V run notes` gives PASS for every scenario.\n',
    },
  });
  editMap(
    repo,
    '- Titles are required',
    '- A failed save shows FAILED, and since 2026-01-01 an archived note answers `BLOCKED` with code `409`.\n- When the owner has not answered, `notes.create#2` is recorded as TO-CONFIRM.\n- Titles are required',
  );
  assert.deepEqual(problemsOf(repo), []);
});

test('an AGENTS.md or CLAUDE.md that does not name the verification Skill is a warning', () => {
  const agents = (repo) => checkMaps(repo.config).warnings.filter((w) => w.check === 'agents').map((w) => w.file);
  assert.deepEqual(agents(makeRepo()), []);
  assert.deepEqual(agents(makeRepo({ files: { 'AGENTS.md': '# Agents\n\nRun the tests.\n', 'CLAUDE.md': '# Claude\n' } })), ['AGENTS.md', 'CLAUDE.md']);
  assert.deepEqual(agents(makeRepo({ files: { 'AGENTS.md': '# Agents\n', 'CLAUDE.md': '@AGENTS.md\n' } })), ['AGENTS.md']);
  const linked = makeRepo({ files: { 'AGENTS.md': '# Agents\n\nVerify a change with [skill](skill/SKILL.md).\n', 'CLAUDE.md': '@AGENTS.md\n' } });
  assert.deepEqual(agents(linked), []);
  assert.equal(checkMaps(linked.config).ok, true);
});
