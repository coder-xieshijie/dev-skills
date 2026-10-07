# Template: feature map

The feature map tells an agent, for each user-facing feature, how to reach it from every entry point, what to do, what to observe, and what evidence to keep. It also records which steps have been run on which version. Why each part exists is in [Repository readiness](../repository-readiness.md), step 5. A filled example from our runs is in [feature map example](../examples/feature-map-example.md).

There are two files to copy:

1. **The index**, once per repository, usually `<skills dir>/verify-<app>/features/README.md`.
2. **A feature file**, once per feature area. Put it in the Skill's `features/` directory, or next to the feature's own docs. Either way it lives in the repository and the index links to it.

How to fill them in:

- Replace every `<...>`. Write from the user's point of view: entry points, actions, stable handles, commands and observable results. Leave implementation details out.
- Every step must have been run at least once before you commit it. Record the run in the run record.
- Lines starting with `Guide:` are for you. Delete them when you are done.

## 1. The index

````markdown
# <App> feature map

This is the index of <app>'s feature maps and the conventions all of them follow. Start an instance with [SKILL.md](../SKILL.md) first, then read the map for the feature your scenario touches.

## Conventions

### Files and IDs

- Map files live in `<path pattern, for example docs/<feature>/feature-map/<map>.md>`. Every map file is listed in the table at the end of this file.
- A map's name is its file name without `.md`. It is unique and uses lowercase letters, digits and hyphens.
- A sub-feature ID is `<map name>.<short name>`, unique across the repository. Behaviors with different results get different IDs.
- Where two features meet, the steps are written once, in one map. The other map refers to its IDs.
- IDs and section names are stable. Frozen acceptance documents (verify.md) refer to them, so search for references before renaming one.

### Parts of a map file

In order: a title and one paragraph; `## Sub-features`; `## Entry points (user view)`; `## States`; `## Driving it with <control commands>`, one subsection per entry point, each step naming the IDs it covers; `## Gotchas`; `## Run record`.

### Run record

A table at the end of each map file, with exactly one row for each entry point of each sub-feature:

| Sub-feature | Entry point | Result | Version | Date | Note |
|---|---|---|---|---|---|

- Result is one of PASS, FAIL, Not run, Blocked. Not run and Blocked always say why: the missing prerequisite and the route tried.
- Version is the commit the run used (`git rev-parse --short HEAD`), kept only to trace where a result came from. Whether a row is still true is settled by maintenance before each requirement.
- Run status appears only here. The rest of the map describes the product as it is now.

### Structure check

```bash
<structure check command>
```

Read-only. It checks that the index and the map files match one to one, that sub-feature IDs are unique and start with their map's name, that every declared entry point of every sub-feature has exactly one run-record row, and that no run-status text appears outside the run record. It does not check that a map matches the product. Only live runs do that.

## Baseline state

- The instance was started with `<start command>` from this worktree, and `<doctor command>` passes.
- Each scenario starts in a new <conversation / project / account>, so earlier scenarios cannot affect it.
- Test data: <seed data and how to load it>.
- Accounts and environment: <test account, region, build>.

## Driving conventions

- Commands are literal. Keep quoted text, field names and values unchanged unless the step says they may change.
- Every action that changes state is saved with `--save <name>`.
- Wait for a state with `<poll command> --until … --timeout`. Confirm a state holds with `--hold`. No fixed sleeps.
- Locate UI elements by <test ID, role and accessible name>. Never by coordinates or position. Where UI text is needed, give it for every UI language you verify.
- End each scenario by removing the state it created: `<command>`.
- When a precondition depends on how an external system answers (for example a model), fix the answer with <a scripted reply at the integration layer>, and say which requests were scripted.

## Proof and judgment

- Capture the action and the resulting state, not only the final screen.
- Judge by state, events and files, not by wording that can vary.
- Mutation proof includes a second, read-only view of the stored value.
- Add a visual checkpoint only where the screen itself is the result. Name the screenshot, the reference and what counts as a pass.
- Every evidence file names its sub-feature ID and the entry point used.
- An entry point you cannot drive is reported with the command you tried and the missing precondition. It is not a pass, and another entry point's result does not stand in for it.

## Maintenance

- When a change alters a feature's user-visible behavior or entry points, update its map and run record in the same MR.
- Before a requirement starts, the maps of the features it touches are brought in line with the product, to the same standard as a full pass but limited to those features.
- A full pass is done when the structure check passes and every sub-feature has been run at every entry point on this version, or its run record says why not. Reading the code alone is not enough; every pass includes live runs.
- Edit only the maps and the verification Skill. A behavior the map describes that the product no longer does is either map drift (fix the map) or a product regression (report it separately).

## Features

| Feature | Map | Covers |
|---|---|---|
| <Feature> | [<map name>.md](<relative path to the map file>) | <areas: for example create, pause, resume, limits> |

Features not listed here have no map yet. Add one the first time a requirement or a bug fix touches the feature, following these conventions, and list it here.
````

## 2. A feature file

````markdown
# <Feature name>: <area>

<One paragraph from the user's point of view: what the user can do and what they see. Link the feature's behavior spec if there is one. This file says how to reach, drive and prove the feature. It does not restate the behavior rules.>

## Sub-features

- `<map>.<short-name>` (<spec ID, optional>; <entry points, for example desktop, TUI, API>): <the behavior and its observable result, in one sentence>.
- `<map>.<short-name>` (<...>; <...>): <...>.

Guide: one line per behavior with a distinct result. The entry points listed after the last semicolon are the ones the run record must cover.

Related sub-features in other maps: `<other-map>.<short-name>` (<what it covers>).

## Entry points (user view)

| Entry point | What the user does | Driven by | What the app sends or calls |
|---|---|---|---|
| <Desktop: home screen composer, `/<command> <text>`> | <types and sends> | <desktop> | <request> |
| <Desktop: banner button `<label>`> | <clicks> | <desktop> | <request> |
| <TUI: `/<command> <args>`> | <types the command> | <TUI> | <in-process call> |
| <HTTP API: `<METHOD> <path>`> | <a client sends the request> | <API> | <same> |
| <Phone app> | <...> | <none: no driver> | <...> |

## States

Guide: core-spec walks each entry point through these states. Mark the ones that do not apply, so nobody wonders whether they were forgotten.

| State | Applies? | Sub-feature, or why not |
|---|---|---|
| Default | <yes/no> | <...> |
| Loading | | |
| Empty | | |
| Error | | |
| Disabled | | |
| Cancelled | | |
| Triggered repeatedly | | |
| Concurrent | | |
| After restart | | |
| <Feature-specific state> | | |

## Driving it with <control commands>

Preconditions: an instance started per [SKILL.md](<relative path to SKILL.md>) for the entry point you use; doctor passes; a new <conversation> for each scenario. `$S` means <the ID of the conversation created for the scenario>.

### <Entry point 1, for example Desktop>

- **<Step name>** (`<map>.<short-name>`)
  - Action: <what the user does, in the user's words>.
  - Command: `node $V <...> --save <name>`
  - Observe: <literal values, and where each is read from>.
  - Evidence: `<NNN-name.json>`, <screenshot>, <snapshot>.
- **<Step name>** (`<map>.<short-name>`)
  - Arrange: <precondition and how it is set up; "arranged, not a product path" when it uses stored-state writes or a test double>.
  - Action: <...>.
  - Command: `<...>`
  - Observe: <...>.
  - Must not appear: <...>, paired with the positive observation above.
  - Evidence: <...>.

### <Entry point 2, for example TUI>

- **<Step name>** (`<map>.<short-name>`)
  - Action: <...>.
  - Command: `<...>`
  - Observe: <screen text, status line field>.
  - Evidence: <...>.

### <Entry point 3, for example API>

- **<Step name>** (`<map>.<short-name>`)
  - Action: <...>.
  - Command: `<...>`
  - Observe: <status code, fields>.
  - Evidence: <...>.

## Gotchas

- <A trap that wastes or invalidates a run, and what to do instead.>
- <Where entry points behave differently on purpose, so a difference is not reported as a bug.>
- <Steps whose precondition depends on an external system's choice, and what to do when it does not hold.>
- <Arranged preconditions in this file, and how to remove them afterwards.>

## Run record

| Sub-feature | Entry point | Result | Version | Date | Note |
|---|---|---|---|---|---|
| `<map>.<short-name>` | <entry point> | PASS | <short commit> | <date> | |
| `<map>.<short-name>` | <entry point> | Not run | | | <why: prerequisite missing, route tried> |
| `<map>.<short-name>` | <entry point> | Blocked | | | <concrete prerequisite: device, account, OS, external state; route tried> |
````

## Before you commit a map file

- [ ] Every sub-feature has a unique ID and lists its entry points.
- [ ] Every listed entry point has a drive step, or a Blocked row that says why.
- [ ] Each step names an action, an exact command, a literal observation and the evidence to keep.
- [ ] Every step has been run at least once on the current version, and the run record says so.
- [ ] The structure check passes.
- [ ] The index lists the file.
