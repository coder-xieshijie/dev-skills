import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { checkMaps } from '../map-check.mjs';
import { MAP, makeRepo, write } from './helpers.mjs';

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
