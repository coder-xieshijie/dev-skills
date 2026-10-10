// Builds a throwaway repository with one feature map, its spec and scenario scripts, wired to the
// notes stand-in adapter (fixture/notes-entry.mjs). Tests change single files to produce each
// problem or result; `files` adds or replaces files by path relative to the repository root.

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '../config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SCRIPTS = path.resolve(here, '..');

export const MAP = `# Notes

Users create notes and list them.

## Sub-features

- \`notes.create\` (NOTE-01; API, Web): a created note is stored and listed once.
- \`notes.list-empty\` (NOTE-02; API): a new instance lists no notes, and keeps listing none.

## Entry points (user view)

| Entry | User action | Interface |
|---|---|---|
| Web | type a title, press Save | POST /notes |
| HTTP client | POST /notes | POST /notes |

## Drive

### API

- **Create** (\`notes.create\`). Post a note titled \`alpha\`, then read the list:
  - \`notes.create#1\` POST returns 201 with an id.
  - \`notes.create#2\` the list holds exactly one note titled \`alpha\`.
- **Empty** (\`notes.list-empty\`). On a new instance, read the list for 1 second:
  - \`notes.list-empty#1\` the list stays empty.

### Web

- **Create** (\`notes.create\`). Save a note titled \`beta\`:
  - \`notes.create#3\` the list shows \`beta\`.
  - \`notes.create#4\` (look) the saved list capture shows \`beta\` once.

## Gotchas

- Titles are required; an empty title answers 400.

## Not covered

- NOTE-03 (delete): there is no delete endpoint yet.
`;

export const SPEC = `# Notes spec

## NOTE-01: create

## NOTE-02: list

## NOTE-03: delete
`;

export const INDEX = `# Feature maps

| Feature | Map | Spec | Also scripted | Content |
|---|---|---|---|---|
| Notes | [notes.md](../../docs/notes/feature-map/notes.md) | [spec.md](../../docs/notes/spec.md) | API, Web | create, list |
`;

export const SCRIPTS_BY_NAME = {
  'notes.create.api.mjs': `export const scenario = { id: 'notes.create', entry: 'API', timeoutSeconds: 20 };

export async function run(t) {
  const created = await t.api('POST', '/notes', { title: 'alpha' });
  t.criterion('notes.create#1', created.status === 201 && Boolean(created.body?.id), created);
  const listed = await t.until(async () => (await t.read('/notes')).notes, (notes) => notes.length > 0, {
    timeout: 2,
    interval: 0.2,
  });
  const alpha = (listed.value ?? []).filter((note) => note.title === 'alpha');
  t.criterion('notes.create#2', listed.ok && alpha.length === 1, listed);
}
`,
  'notes.list-empty.api.mjs': `export const scenario = { id: 'notes.list-empty', entry: 'API', timeoutSeconds: 10 };

export async function run(t) {
  const held = await t.hold(async () => (await t.read('/notes')).notes.length, 0, 1, { interval: 0.2 });
  t.criterion('notes.list-empty#1', held.ok, held);
}
`,
  'notes.create.web.mjs': `export const scenario = { id: 'notes.create', entry: 'Web', timeoutSeconds: 20 };

export async function run(t) {
  await t.api('POST', '/notes', { title: 'beta' });
  const notes = (await t.read('/notes')).notes;
  t.criterion('notes.create#3', notes.some((note) => note.title === 'beta'), notes);
  await t.look('notes.create#4', 'list', 'the list shows beta exactly once');
}
`,
};

export function makeRepo({ config: extra = {}, scripts = {}, files = {} } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'verify-kit-'));
  const skillDir = path.join(root, 'skill');
  const mapDir = path.join(root, 'docs', 'notes', 'feature-map');
  mkdirSync(path.join(skillDir, 'features'), { recursive: true });
  mkdirSync(path.join(mapDir, 'scenarios'), { recursive: true });
  const config = {
    index: 'features/README.md',
    mapRoots: ['docs'],
    entries: {
      api: {
        name: 'API',
        adapter: path.join(here, 'fixture', 'notes-entry.mjs'),
        options: { invalidWhen: '^LOGIN LOST' },
      },
      web: {
        name: 'Web',
        ui: true,
        max: 1,
        adapter: path.join(here, 'fixture', 'web-entry.mjs'),
      },
    },
    scripted: ['api'],
    jobs: 3,
    runsRoot: path.join(root, 'runs'),
    ...extra,
  };
  writeFileSync(path.join(skillDir, 'verify.config.json'), JSON.stringify(config, null, 2));
  writeFileSync(path.join(skillDir, 'features', 'README.md'), INDEX);
  writeFileSync(path.join(root, 'docs', 'notes', 'spec.md'), SPEC);
  writeFileSync(path.join(mapDir, 'notes.md'), MAP);
  for (const [name, text] of Object.entries({ ...SCRIPTS_BY_NAME, ...scripts }))
    if (text !== null) writeFileSync(path.join(mapDir, 'scenarios', name), text);
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), text);
  }
  return { root, skillDir, mapDir, config: loadConfig({ skillDir, root }) };
}

export const write = (file, text) => writeFileSync(file, text);
