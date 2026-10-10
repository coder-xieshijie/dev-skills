// Loads verify.config.json (next to this scripts/ directory) and fills the defaults.
// Paths in the config are relative to the repository root.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
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
    scriptedColumn: 'Also scripted',
    runRecord: ['Run record'],
  },
  lookMarker: '(look)',
  specHeading: '^#{2,3}\\s+([A-Z][A-Z0-9]*-\\d+)(?=[：:\\s]|$)',
  specId: '\\b[A-Z][A-Z0-9]*-\\d+\\b',
  jobs: 4,
  runsRoot: null,
  kit: null,
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
  // Real paths: on macOS /tmp and /var are symlinks, and products record real paths, so a path
  // compared with what the product wrote must be real too.
  config.skillDir = realpathSync(skillDir);
  config.root = realpathSync(path.resolve(root ?? repoRootOf(skillDir)));
  config.indexPath = path.resolve(config.skillDir, config.index);
  // entries: { "<slug>": { "name": "<heading name>", "max": <instances at once> } } or "<slug>": "<name>"
  config.entryList = Object.entries(config.entries).map(([slug, value]) =>
    typeof value === 'string' ? { slug, name: value } : { slug, ...value },
  );
  if (config.entryList.length === 0) throw new Error(`${file}: "entries" names no entry point`);
  return config;
}

export const entryByName = (config, name) =>
  config.entryList.find((entry) => entry.name === name || entry.slug === name);

// Config fields that decide how a run is carried out, not how a result is judged: how many instances
// run at once, where evidence goes, the label of the copied kit, and the settings of the adapter
// contract test, which `run` never reads. They stay out of the kit hash, so tuning them keeps earlier
// runs valid.
const NOT_JUDGED = ['jobs', 'runsRoot', 'kit'];
const NOT_JUDGED_PER_ENTRY = ['max', 'contract'];

export function judgedConfig(raw) {
  const judged = Object.fromEntries(Object.entries(raw).filter(([key]) => !NOT_JUDGED.includes(key)));
  if (raw.entries && typeof raw.entries === 'object')
    judged.entries = Object.fromEntries(
      Object.entries(raw.entries).map(([slug, entry]) => [
        slug,
        entry && typeof entry === 'object'
          ? Object.fromEntries(Object.entries(entry).filter(([key]) => !NOT_JUDGED_PER_ENTRY.includes(key)))
          : entry,
      ]),
    );
  return judged;
}

// The kit as copied: its own scripts in this directory, not adapters or tests. The copy stays as it
// was copied, so this hash names the kit version it came from when the copy carries no version.
export function kitFilesHash() {
  const hash = createHash('sha256');
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  for (const name of readdirSync(scripts).filter((item) => item.endsWith('.mjs')).sort())
    hash.update(name).update('\0').update(readFileSync(path.join(scripts, name))).update('\0');
  return hash.digest('hex').slice(0, 12);
}

// A hash of the ruler, recorded with every run: the scripts running it (runner, primitives, check,
// adapters; not tests), adapters named from elsewhere, and what verify.config.json says that can
// change a result (not its formatting, nor the fields judgedConfig leaves out). Results recorded with
// another hash were measured with another ruler.
export function kitHash(config) {
  const hash = createHash('sha256');
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  const add = (file) => hash.update(path.relative(scripts, file)).update('\0').update(readFileSync(file)).update('\0');
  const walk = (dir) => {
    for (const item of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (item.name !== 'test' && item.name !== 'node_modules') walk(full);
      } else if (/\.(mjs|js|cjs|json)$/.test(item.name)) add(full);
    }
  };
  walk(scripts);
  for (const entry of config.entryList) {
    const file = path.resolve(config.skillDir, entry.adapter ?? `scripts/entries/${entry.slug}.mjs`);
    if (!file.startsWith(`${scripts}${path.sep}`) && existsSync(file)) add(file);
  }
  const configFile = path.join(config.skillDir, 'verify.config.json');
  if (existsSync(configFile))
    hash.update('verify.config.json\0').update(JSON.stringify(judgedConfig(JSON.parse(readFileSync(configFile, 'utf8'))))).update('\0');
  return hash.digest('hex').slice(0, 12);
}
