# Writing feature maps and scenario scripts

Read this when you write or change a feature map or a scenario script, or pick what to rerun after a change. Running a verification does not need it. Headings below are the defaults in `verify.config.json` (`headings`); a repository may rename them, and `check` reads the configured names.

## The map is the only spec of sub-feature behavior

A feature map says which sub-features a feature has, how a user reaches each one at every entry point, what to do, and what counts as correct. It describes the product now. It holds no run results: results live in the run's evidence directory and go into the MR description.

- Map files live at `<map root>/<feature>/feature-map/<map>.md`, next to the feature's own docs; when features have no doc directory of their own, use `<docs root>/features/<feature>/feature-map/` and add that root to `mapRoots`. Every `.md` in a `feature-map/` directory is a map and is listed in the index (`features/README.md`). Map names are unique, lowercase, digits and hyphens.
- A sub-feature ID is `<map>.<short>`, unique across maps. Behaviors with different results are different sub-features.
- Where two features meet, one map holds the steps and the other refers to its IDs.

## Structure, in order

1. Title and one paragraph: what the user gets, and which spec or source files define the behavior when there is no spec.
2. `## Sub-features`, one item each (may wrap; continuation lines indented two spaces):

   ```markdown
   - `notes.create` (NOTE-01; API, Web): a created note is stored and listed once.
   ```

   Inside the parentheses, after the last `;`, the entry points it supports (comma-separated, names from `verify.config.json`); before it, the requirement IDs it implements, or the source location of the behavior when there is no spec. List every entry where a user can see the behavior; an entry with no driver (a phone app, say) may be named, needs no criteria and goes under Not covered.
3. `## Entry points (user view)`: a table of entry, user action, driver, and the interface underneath.
4. `## Drive`: shared terms and shared steps first, then one `### <entry>` subsection per driven entry.
5. `## Gotchas`: traps that waste or void a run, and known product problems with the sub-feature they affect. They describe the product and the trap, never what a run returned.
6. `## Not covered`: behaviors left out on purpose, each with its reason (no driver, visible only to the model, owned by another map, deferred). Every spec ID no sub-feature references is named here, and so is every entry where a sub-feature's behavior is visible but that the sub-feature does not declare. User-visible sub-features that only have API steps are named here with the reason. Write "None" when there is nothing.

## Criteria

Each criterion is a list item in an entry subsection of `## Drive`, starting with its ID, then one observable expected result (in other sections, such as Gotchas, an item may start with a criterion ID to refer to it):

```markdown
- **Create** (`notes.create`). Post a note titled `alpha`, then read the list:
  - `notes.create#1` POST returns 201 with an id.
  - `notes.create#2` the list holds exactly one note titled `alpha`.
```

- The ID is `<sub-feature>#<n>`, unique within the sub-feature and never reused. A criterion belongs to its entry; when two entries judge the same behavior, each has its own. Every driven entry a sub-feature declares has at least one criterion.
- The API entry holds deterministic criteria: counts, order, filtering by turn or boundary, field values, files, status codes. Criteria that need understanding (is the reply sensible, is the wording right) go in UI entries.
- UI entries judge what the user sees (element counts, text, banners, lines on screen, position and visibility) and what the UI sent. Behavior after the backend that the API entry already judges is not judged again; a UI scenario keeps at most one backend check that proves this UI action took effect.
- A criterion only the screen can settle (layout, overlap, whole thing visible) is a look criterion: `` - `<id>` (look) <which screen, compared with what, what passes> ``. Only under entries marked `"ui": true`.
- When a criterion is about one request or one turn, say which. When it is about behavior after a resume, restart or answer, name the boundary and read only evidence after it.
- Say which wrong implementation it catches. "Status is active after resume" does not catch "shows running but nothing started"; also require the new turn or an explicit wait reason.
- Numbers and UI text in criteria are values the product defines (error names, status codes, product deadlines, copy). How long to wait or how often to poll belongs to the script.

## Steps per entry

- **Scripted entries** (the config's `scripted`, plus the index row's `Scripted` column): each sub-feature has a scenario script. The map gives a one-sentence outline (what precondition, what action, what is read) and the criteria. Request bodies, keys and selectors, waits and evidence parsing live only in the script.
- **Entries run by hand**: steps an agent can follow as written: keys, testid or role selectors, which screenshot to take and what to judge. Commands are copied verbatim. Each verdict is filed with `node $V record <evidence dir> <criterion id> pass|fail|confirm --why "<what was observed>" [--file <screenshot>]`, so hand results sit in the same evidence directory and summary as scripted ones.
- Every tool a map or script uses (`do <tool>`, `t.<tool>`) is documented in the verification Skill; `check` warns about one that is not.
- Shared start, doctor, evidence and cleanup rules live in the verification Skill's references; maps link to them.

## Scenario scripts

Each scripted entry of each sub-feature has `feature-map/scenarios/<id>.<entry slug>.mjs`. When script and map disagree, fix the script to the map; when the map is wrong, fix the map first.

```js
import { createNote } from './_notes.mjs'; // files starting with `_` hold this map's shared steps

export const scenario = { id: 'notes.create', entry: 'API', timeoutSeconds: 120, launch: {} };

export async function run(t) {
  const created = await createNote(t, 'alpha');
  t.precondition('the note was accepted', created.status === 201, created); // false: BLOCKED, stop
  const listed = await t.until(async () => (await t.read('/notes')).notes, (notes) => notes.length > 0, {
    timeout: 30,
  });
  const alpha = (listed.value ?? []).filter((note) => note.title === 'alpha');
  t.criterion('notes.create#2', listed.ok && alpha.length === 1, listed); // each criterion exactly once, ID literal
  // t.confirm('<id>', detail)  observed, but a product owner must confirm it: TO-CONFIRM
  // t.criterion('<id>', ok, detail, { otherwise: 'confirm' })  when it does not hold: TO-CONFIRM
  // await t.look('<id>', '<capture name>', '<what passes>')  look criteria
}
```

- `launch` is passed to the entry adapter's `up` (for example `{ env: { ... } }`); `run --launch '<json>'` merges into it for every script, which is how a counterexample run breaks the product.
- Read evidence with the adapter's strict reads (`t.read` and whatever the adapter adds); select by boundary with `t.select.after / before / between`; wait with `t.until(read, wanted, { timeout, terminal })`, `t.hold(read, wanted, seconds)` and `t.observe(seconds)`. Plain value comparisons stay in the script.
- A shared step only arranges preconditions and reads evidence; criteria are checked in the scenario script. A script imports only files in its own `scenarios/` directory.
- `t.defer(fn)` undoes something the script arranged that `down` does not remove: deferred functions run in reverse order after the script, whether it passed, failed or threw, and before `down`; an error in one becomes a note.
- Unreadable evidence, a script error or a timeout makes the result UNVERIFIED and can never satisfy "nothing happened"; an empty state counts only when it was read successfully. Use `t.unreadable(message)` when a shared step finds evidence unusable.
- During `t.until`, `t.hold` and `t.observe`, a read the adapter marks as having a side effect is refused. Observe through reads without side effects; do the other reads after the window.
- When the script replaces an external system's reply (a scripted model reply, a fault), record it in the result (`t.note`) and keep the claim to "the product's behavior after that reply".

## Results

Every sub-feature × entry gets exactly one of: PASS (every criterion holds), FAIL (the product breaks the spec), BLOCKED (the precondition could not be built), UNVERIFIED (not run, or this run does not count), TO-CONFIRM (a product owner must say whether it is intended). TO-CONFIRM is not a pass; every non-PASS carries a note.

The order decides: error, timeout, unreadable evidence or a side-effect read in a window → UNVERIFIED; a failed precondition → BLOCKED; nothing checked → UNVERIFIED; a criterion that does not hold → FAIL; a criterion left unchecked → UNVERIFIED; a look criterion not yet judged → UNVERIFIED; something to confirm → TO-CONFIRM; otherwise PASS. A run the adapter reports invalid (lost login, sandbox breach) is UNVERIFIED and runs once more.

## Structure check

```bash
node <skill>/scripts/verify.mjs check
```

Read-only, and CI runs it: index and map files match; a linked spec has requirement ID headings (a source without IDs is named in the index as a code span, not linked); IDs unique and prefixed by their map; criteria under an entry subsection, unique, belonging to a declared entry, every driven entry has some, look criteria only under UI entries; every scripted entry has its scripts, each script checks each of its criteria exactly once with a literal ID and no other ID; scripts leave reading, waiting and process control to the runner; every spec ID is referenced or named as not covered; each map has the Not covered section; no map and no file of the verification Skill holds a run record (a run-record heading, or a result word tied to a date, a commit or a count in one sentence or table row; result words on their own and product values in code spans are fine). It warns about a tool used but never named in the verification Skill, and about an AGENTS.md or CLAUDE.md at the repository root that does not name the verification Skill. It does not check that the map matches the product. Wrong evidence or a wrong comparison behind a matching ID is caught by review and counterexample runs; whether the map is true is settled only by running it.

## Keeping it true, and what to rerun

- When a change alters a feature's user-visible behavior or entry points, update its map and scripts in the same MR.
- Before a requirement, run the sub-features it touches at every entry and check the rest of each touched map against the source; run a whole map, or all maps, only when it is new, rewritten, or someone asks.
- After a change, rerun what it changed, what depends on it, and nearby FAIL and TO-CONFIRM results; a change to a shared step reruns every script importing it; a change to the primitives, the runner or an adapter reruns every script of that entry. Write the reason for the selection in the report.
- After changing the verify scripts, get their tests and `check` passing before a batch run. Results from before the change do not count for the new version.
- Repeated deterministic operations may become a command, an adapter tool or a shared step in the same MR, with tests, listed in the report. Edit only the maps and the verification Skill; report product problems separately.
