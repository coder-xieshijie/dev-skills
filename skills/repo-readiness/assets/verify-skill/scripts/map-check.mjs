// `check`: read-only structural check of the feature maps, in the format references/maps.md defines.
//   index     - the maps the index links and the feature-map/*.md files under mapRoots match one to one;
//   id        - sub-feature ids `<map>.<short>` are unique across maps and start with their map name;
//   criteria  - each criterion `- \`<sub-feature>#<n>\` <expected>` sits under `### <entry>` of the
//               steps section; ids are unique; every driven entry a sub-feature declares has criteria;
//               look criteria sit only under entries the config marks `"ui": true`;
//   scenario  - every scripted entry has scenarios/<id>.<slug>.mjs; each script checks every criterion
//               of its sub-feature at that entry exactly once (t.criterion / t.confirm, t.look for look
//               criteria, id as a literal) and no other id;
//   script    - scripts and shared steps leave reading, waiting and process control to the runner and
//               the primitives; shared steps check no criteria;
//   spec      - every requirement id a spec defines (headings) is referenced by a sub-feature of the
//               maps on that spec or named in their uncovered section; referenced ids exist;
//   uncovered - each map has the uncovered section;
//   status    - no run results in a map: they belong in the run's report.
// Warnings (they do not fail the check): a tool scripts call as t.<name> or maps drive with `do <name>`
// that the verification Skill (SKILL.md, references/) never names, so an agent cannot look it up.
// It does not check that the map matches the product; only running it does.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ITEM_RE = /^- `([a-z0-9-]+)\.([a-z0-9-]+)`\s*[（(]([^）)]*)[）)]/;
const CRITERION_RE = /^(\s*)- `([a-z0-9-]+\.[a-z0-9-]+)#(\d+)`(\s*\S)?/;
const SCENARIO_RE = /^([a-z0-9-]+\.[a-z0-9-]+)\.([a-z0-9-]+)\.mjs$/;
const CHECK_RE = /\bt\.(criterion|confirm|look)\(\s*(['"])([^'"`$]+)\2/g;
const NON_LITERAL_CHECK_RE = /\bt\.(?:criterion|confirm|look)\((?!\s*['"][^'"`$]+['"])/g;
const SCRIPT_RULES = [
  [
    /\b(readFileSync|existsSync|readdirSync|statSync|readFile|readdir|createReadStream|node:fs)\b/,
    (m) => `${m[1]}: read evidence through t (the adapter's strict reads), not the file system`,
  ],
  [
    /\b(spawn|spawnSync|exec|execSync|execFile|execFileSync|node:child_process)\b/,
    (m) => `${m[1]}: instances are started and stopped by the runner; drive through t`,
  ],
  [/\bsetTimeout\s*\(|\bsetInterval\s*\(/, () => 'a timer: wait with t.until, t.hold or t.observe'],
  [/\bfrom\s+['"]\.\.\//, () => "an import outside this map's scenarios dir"],
];

const splitList = (text) =>
  text
    .split(/[,、，]/)
    .map((item) => item.trim())
    .filter(Boolean);

function section(lines, heading) {
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) return undefined;
  const next = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return [start, next < 0 ? lines.length : next];
}

export const scenariosDirOf = (mapFile) => path.join(path.dirname(mapFile), 'scenarios');

export function mapScenarios(mapFile, config) {
  const dir = scenariosDirOf(mapFile);
  const mapName = path.basename(mapFile, '.md');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.mjs') && file.startsWith(`${mapName}.`))
    .sort()
    .map((file) => {
      const match = SCENARIO_RE.exec(file);
      const entry = match && config.entryList.find((item) => item.slug === match[2]);
      return { file: path.join(dir, file), id: match?.[1] ?? null, entry: entry?.name ?? null };
    });
}

export function parseMap(file, config) {
  const { headings, lookMarker } = config;
  const specId = new RegExp(config.specId, 'g');
  const driven = Object.fromEntries(config.entryList.map((entry) => [`### ${entry.name}`, entry.name]));
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const problems = [];
  const problem = (check, line, message) => problems.push({ check, line, message });

  const subfeatures = [];
  const sub = section(lines, headings.subfeatures);
  if (!sub) problem('id', 0, `no "## ${headings.subfeatures}" section`);
  for (let i = sub?.[0] ?? 0; sub && i < sub[1]; i += 1) {
    if (!lines[i].startsWith('- ')) continue;
    let item = lines[i];
    for (let j = i + 1; j < sub[1] && /^\s{2,}\S/.test(lines[j]); j += 1) item += ` ${lines[j].trim()}`;
    const match = ITEM_RE.exec(item);
    if (!match) {
      problem('id', i + 1, 'sub-feature item is not "- `<map>.<short>` (<spec ids>; <entry>, <entry>): ..."');
      continue;
    }
    const parts = match[3].split(/[;；]/);
    subfeatures.push({
      id: `${match[1]}.${match[2]}`,
      mapPart: match[1],
      entries: splitList(parts.at(-1)),
      refs: parts.slice(0, -1).flatMap((part) => part.match(specId) ?? []),
      line: i + 1,
    });
  }

  const criteria = [];
  let inSteps = false;
  let entry = null;
  for (const [i, line] of lines.entries()) {
    if (line.startsWith('## ')) {
      inSteps = line.trim() === `## ${headings.steps}`;
      entry = null;
    } else if (line.startsWith('### ')) entry = inSteps ? (driven[line.trim()] ?? null) : null;
    const match = CRITERION_RE.exec(line);
    if (!match) continue;
    const id = `${match[2]}#${match[3]}`;
    const next = lines[i + 1] ?? '';
    if (!match[4] && !(next.trim() && next.search(/\S/) > match[1].length + 1)) {
      problem('criteria', i + 1, `criterion ${id} has no expected result`);
      continue;
    }
    if (!entry) {
      problem('criteria', i + 1, `criterion ${id} is not under an entry heading of "## ${headings.steps}"`);
      continue;
    }
    const rest = line.slice(line.indexOf('`', line.indexOf('`') + 1) + 1).trim();
    const look = rest.startsWith(lookMarker) || (!match[4] && next.trim().startsWith(lookMarker));
    if (look && !config.entryList.find((item) => item.name === entry)?.ui)
      problem('criteria', i + 1, `${id}: a look criterion belongs under an entry marked "ui": true`);
    criteria.push({ id, subfeature: match[2], entry, line: i + 1, look });
  }

  const uncovered = section(lines, headings.uncovered);
  if (!uncovered) problem('uncovered', 0, `no "## ${headings.uncovered}" section (write "None" when none)`);
  const uncoveredRefs = uncovered ? lines.slice(...uncovered).flatMap((line) => line.match(specId) ?? []) : [];
  for (const [i, line] of lines.entries())
    if (headings.runRecord.some((name) => line.trim() === `## ${name}`))
      problem('status', i + 1, "run results belong in the run's report, not in the map");
  return { name: path.basename(file, '.md'), file, subfeatures, criteria, uncoveredRefs, problems };
}

export const criteriaOf = (map, id, entry) =>
  map.criteria.filter((item) => item.subfeature === id && item.entry === entry).map((item) => item.id);
export const looksOf = (map, id, entry) =>
  map.criteria.filter((item) => item.subfeature === id && item.entry === entry && item.look).map((item) => item.id);

export function scriptCriteria(text) {
  const matches = [...text.matchAll(CHECK_RE)];
  return {
    ids: matches.filter((m) => m[1] !== 'look').map((m) => m[3]),
    looks: matches.filter((m) => m[1] === 'look').map((m) => m[3]),
    nonLiteral: [...text.matchAll(NON_LITERAL_CHECK_RE)].length,
  };
}

export function scriptProblems(text, { shared = false } = {}) {
  const problems = [];
  for (const [i, line] of text.split('\n').entries()) {
    if (/^\s*\/\//.test(line)) continue;
    for (const [pattern, message] of SCRIPT_RULES) {
      const match = pattern.exec(line);
      if (match) problems.push({ line: i + 1, message: message(match) });
    }
    if (shared && /\bt\.(criterion|confirm|look)\(/.test(line))
      problems.push({ line: i + 1, message: 'criteria are checked in the scenario script, not a shared step' });
  }
  return problems;
}

function walkMaps(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (item.name === 'node_modules' || item.name.startsWith('.')) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walkMaps(full, out);
    else if (item.name.endsWith('.md') && path.basename(dir) === 'feature-map') out.push(full);
  }
  return out;
}

// The maps the index links, the spec each row gives them, the entries each map scripts, the files on disk.
export function listMaps(config) {
  const { indexPath } = config;
  const linked = new Map();
  const specOf = new Map();
  const scriptedOf = new Map();
  let column = -1;
  const cells = (line) =>
    line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
  for (const [i, line] of readFileSync(indexPath, 'utf8').split('\n').entries()) {
    if (line.startsWith('|') && cells(line).includes(config.headings.scriptedColumn))
      column = cells(line).indexOf(config.headings.scriptedColumn);
    const links = [...line.matchAll(/\]\(([^)\s#]+\.md)\)/g)].map((m) => path.resolve(path.dirname(indexPath), m[1]));
    const maps = links.filter((file) => path.basename(path.dirname(file)) === 'feature-map');
    const specs = links.filter((file) => !maps.includes(file));
    const scripted = column >= 0 ? splitList(cells(line)[column] ?? '') : [];
    for (const file of maps) {
      linked.set(file, i + 1);
      if (specs.length) specOf.set(file, specs[0]);
      const names = [...config.scripted, ...scripted]
        .map((name) => config.entryList.find((entry) => entry.name === name || entry.slug === name)?.name)
        .filter(Boolean);
      scriptedOf.set(file, [...new Set(names)]);
    }
  }
  const onDisk = config.mapRoots.flatMap((root) => walkMaps(path.resolve(config.root, root))).sort();
  return { linked, specOf, scriptedOf, onDisk };
}

function specIds(file, config) {
  const heading = new RegExp(config.specHeading);
  return readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line) => heading.exec(line)?.[1] ?? []);
}

export function checkMaps(config) {
  const { root, indexPath } = config;
  const rel = (file) => path.relative(root, file);
  const problems = [];
  const add = (file, check, line, message) => problems.push({ file: rel(file), check, line, message });
  const { linked, specOf, scriptedOf, onDisk } = listMaps(config);
  for (const [file, line] of linked) if (!existsSync(file)) add(indexPath, 'index', line, `listed map ${rel(file)} does not exist`);
  for (const file of onDisk) if (!linked.has(file)) add(file, 'index', 0, 'map file is not listed in the index');

  const drivenNames = config.entryList.map((entry) => entry.name);
  const maps = [...linked.keys()].filter(existsSync).map((file) => parseMap(file, config));
  const seen = new Map();
  const summary = [];
  for (const map of maps) {
    for (const { check, line, message } of map.problems) add(map.file, check, line, message);
    if (seen.has(`map:${map.name}`)) add(map.file, 'id', 0, `map name ${map.name} is used twice`);
    seen.set(`map:${map.name}`, map.file);
    const scenarios = mapScenarios(map.file, config);
    const scripted = scriptedOf.get(map.file) ?? [];

    const criterionSeen = new Map();
    for (const item of map.criteria) {
      if (criterionSeen.has(item.id))
        add(map.file, 'criteria', item.line, `${item.id} is used twice (line ${criterionSeen.get(item.id)})`);
      criterionSeen.set(item.id, item.line);
      const feature = map.subfeatures.find((f) => f.id === item.subfeature);
      if (!feature) add(map.file, 'criteria', item.line, `${item.id}: ${item.subfeature} is not a declared sub-feature`);
      else if (!feature.entries.includes(item.entry))
        add(map.file, 'criteria', item.line, `${item.id} is under ${item.entry}, which ${item.subfeature} does not declare`);
    }
    for (const { id, mapPart, entries, line } of map.subfeatures) {
      if (mapPart !== map.name) add(map.file, 'id', line, `${id} does not start with the map name ${map.name}`);
      if (seen.has(id)) add(map.file, 'id', line, `${id} is already used in ${rel(seen.get(id))}`);
      seen.set(id, map.file);
      if (entries.length === 0) add(map.file, 'id', line, `${id} has no entry`);
      for (const entry of entries) {
        if (drivenNames.includes(entry) && criteriaOf(map, id, entry).length === 0)
          add(map.file, 'criteria', line, `${id} / ${entry} has no criteria (\`${id}#<n>\` items under ### ${entry})`);
        if (scripted.includes(entry) && !scenarios.some((s) => s.id === id && s.entry === entry)) {
          const slug = config.entryList.find((e) => e.name === entry).slug;
          add(map.file, 'scenario', line, `${id} / ${entry} has no scenario script scenarios/${id}.${slug}.mjs`);
        }
      }
    }

    const dir = scenariosDirOf(map.file);
    const shared = existsSync(dir) ? readdirSync(dir).filter((file) => /^_.*\.mjs$/.test(file)) : [];
    for (const file of shared)
      for (const { line, message } of scriptProblems(readFileSync(path.join(dir, file), 'utf8'), { shared: true }))
        add(path.join(dir, file), 'script', line, message);
    for (const item of scenarios) {
      const text = readFileSync(item.file, 'utf8');
      for (const { line, message } of scriptProblems(text)) add(item.file, 'script', line, message);
      const declared = map.subfeatures.some((f) => f.id === item.id && f.entries.includes(item.entry));
      if (!item.id || !item.entry || !declared) {
        add(item.file, 'scenario', 0, 'script name is not <declared id>.<entry slug>.mjs of a declared entry');
        continue;
      }
      const expected = criteriaOf(map, item.id, item.entry);
      const looks = looksOf(map, item.id, item.entry);
      const checked = scriptCriteria(text);
      if (checked.nonLiteral) add(item.file, 'scenario', 0, 't.criterion / t.confirm / t.look take the id as a string literal');
      for (const cid of expected) {
        const look = looks.includes(cid);
        const count = (look ? checked.looks : checked.ids).filter((other) => other === cid).length;
        if (count !== 1)
          add(item.file, 'scenario', 0, `${cid} is ${look ? 'saved with t.look' : 'checked'} ${count} times; each criterion exactly once`);
        if ((look ? checked.ids : checked.looks).includes(cid))
          add(item.file, 'scenario', 0, look ? `${cid} is a look criterion: use t.look` : `${cid} is not a look criterion: use t.criterion or t.confirm`);
      }
      for (const cid of new Set([...checked.ids, ...checked.looks].filter((other) => !expected.includes(other))))
        add(item.file, 'scenario', 0, `${cid} is not a ${item.entry} criterion of ${item.id} in the map`);
    }
    summary.push({
      name: map.name,
      file: rel(map.file),
      subfeatures: map.subfeatures.length,
      criteria: map.criteria.length,
      scenarios: scenarios.length,
      scripted,
    });
  }

  const specs = [];
  for (const spec of new Set(specOf.values())) {
    const onSpec = maps.filter((map) => specOf.get(map.file) === spec);
    if (!existsSync(spec)) {
      add(indexPath, 'spec', linked.get(onSpec[0]?.file) ?? 0, `spec ${rel(spec)} does not exist`);
      continue;
    }
    const ids = specIds(spec, config);
    if (ids.length === 0)
      add(
        spec,
        'spec',
        0,
        'no requirement id headings for the maps to reference; name a source without ids in the index as a code span, not a link',
      );
    const referenced = new Set(onSpec.flatMap((map) => map.subfeatures.flatMap((f) => f.refs)));
    const uncovered = new Set(onSpec.flatMap((map) => map.uncoveredRefs));
    const prefixes = new Set(ids.map((id) => id.replace(/-\d+$/, '')));
    for (const map of onSpec)
      for (const feature of map.subfeatures)
        for (const ref of feature.refs)
          if (prefixes.has(ref.replace(/-\d+$/, '')) && !ids.includes(ref))
            add(map.file, 'spec', feature.line, `${feature.id} references ${ref}, which ${rel(spec)} does not define`);
    for (const id of ids.filter((id) => !referenced.has(id) && !uncovered.has(id)))
      add(spec, 'spec', 0, `${id} is referenced by no sub-feature and not named under "${config.headings.uncovered}"`);
    specs.push({ spec: rel(spec), ids: ids.length, referenced: ids.filter((id) => referenced.has(id)).length });
  }
  const warnings = undocumentedTools(config, maps).map(({ file, line, message }) => ({ file: rel(file), check: 'tools', line, message }));
  return { ok: problems.length === 0, index: rel(indexPath), maps: summary, specs, problems, warnings };
}

// t.<name> members the runner itself provides; every other one comes from an adapter's tools().
const RUNNER_MEMBERS = new Set(['id', 'entry', 'runDir', 'instance', 'until', 'hold', 'observe', 'select', 'precondition', 'criterion', 'confirm', 'look', 'unreadable', 'note', 'defer']);

function undocumentedTools(config, maps) {
  const docs = [path.join(config.skillDir, 'SKILL.md')];
  const refs = path.join(config.skillDir, 'references');
  if (existsSync(refs)) docs.push(...readdirSync(refs).filter((f) => f.endsWith('.md')).map((f) => path.join(refs, f)));
  if (!existsSync(docs[0])) return [];
  const text = docs.filter(existsSync).map((file) => readFileSync(file, 'utf8')).join('\n');
  const documented = (name) => new RegExp(`\`(?:t\\.)?${name}[\`(\\s]`).test(text);
  const used = new Map();
  const use = (name, file, line) => {
    if (!RUNNER_MEMBERS.has(name) && !used.has(name)) used.set(name, { file, line });
  };
  for (const map of maps) {
    for (const [i, line] of readFileSync(map.file, 'utf8').split('\n').entries())
      for (const m of line.matchAll(/(?:\$V|verify\.mjs)\s+do\s+([A-Za-z_]\w*)/g)) use(m[1], map.file, i + 1);
    const dir = scenariosDirOf(map.file);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.mjs')))
      for (const [i, line] of readFileSync(path.join(dir, file), 'utf8').split('\n').entries())
        for (const m of line.matchAll(/\bt\.([A-Za-z_]\w*)\b/g)) use(m[1], path.join(dir, file), i + 1);
  }
  return [...used]
    .filter(([name]) => !documented(name))
    .map(([name, { file, line }]) => ({ file, line, message: `tool ${name} is used but the verification Skill never names it (\`${name}\`)` }));
}
