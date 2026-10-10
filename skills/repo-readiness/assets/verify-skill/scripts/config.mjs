// Loads verify.config.json (next to this scripts/ directory) and fills the defaults.
// Paths in the config are relative to the repository root.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULTS = {
  index: 'features/README.md',
  mapRoots: ['docs'],
  entries: {},
  scripted: [],
  headings: {
    subfeatures: 'Sub-features',
    steps: 'Drive',
    uncovered: 'Not covered',
    scriptedColumn: 'Scripted',
    runRecord: ['Run record'],
  },
  lookMarker: '(look)',
  specHeading: '^#{2,3}\\s+([A-Z][A-Z0-9]*-\\d+)(?=[：:\\s]|$)',
  specId: '\\b[A-Z][A-Z0-9]*-\\d+\\b',
  jobs: 4,
  runsRoot: null,
};

export function repoRootOf(start) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: start,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return start;
  }
}

export function loadConfig({ skillDir = SKILL_DIR, root } = {}) {
  const file = path.join(skillDir, 'verify.config.json');
  const raw = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const config = { ...DEFAULTS, ...raw, headings: { ...DEFAULTS.headings, ...raw.headings } };
  config.skillDir = skillDir;
  config.root = path.resolve(root ?? repoRootOf(skillDir));
  config.indexPath = path.resolve(skillDir, config.index);
  // entries: { "<slug>": { "name": "<heading name>", "max": <instances at once> } } or "<slug>": "<name>"
  config.entryList = Object.entries(config.entries).map(([slug, value]) =>
    typeof value === 'string' ? { slug, name: value } : { slug, ...value },
  );
  if (config.entryList.length === 0) throw new Error(`${file}: "entries" names no entry point`);
  return config;
}

export const entryByName = (config, name) =>
  config.entryList.find((entry) => entry.name === name || entry.slug === name);
