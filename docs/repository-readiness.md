# Repository readiness: stage A

The workflow in this repository, [core-grill](../skills/core-grill/SKILL.md), [core-spec](../skills/core-spec/SKILL.md) and [deliver](../skills/deliver/SKILL.md), proves each change by running the app. core-spec writes acceptance scenarios that run at the entry points users use, and deliver runs them. Neither Skill builds that capability from scratch: deliver adds the smallest missing piece a scenario needs, but it relies on a base that already exists. An agent must be able to start your app, drive it from those entry points, and see what happened, with no person in the loop. Stage A makes that true for one repository. You do it once per repository, and it grows with each requirement.

This guide is for engineers who want to run those Skills on their own app. It comes from our own stage A: making an existing agent product drivable by agents. The product has a desktop app, a terminal UI (TUI) and a local HTTP API, all backed by one local runtime. We then delivered two real requirements on it with the Skills. "Our runs" below means that work. Where advice is our own judgment, we say so. Terms follow the [glossary](glossary.md). The reasoning behind the whole workflow is in [Why the workflow looks the way it does](basis.md).

Fill-in templates from our first setup: [control commands](templates/control-commands.md) and [feature map](templates/feature-map.md). A de-identified example from our runs: [feature map example](examples/feature-map-example.md).

## This guide and the repo-readiness Skill

The [repo-readiness](../skills/repo-readiness/SKILL.md) Skill builds this setup in a repository, with a runnable kit: a verification Skill to copy, a runner, judging primitives, a structure check and an HTTP adapter, with their own tests. This guide records how our first setup came about and why each part exists; the Skill holds where our setup ended after the rebuild described in step 5. Where the two differ, follow the Skill:

| Part | This guide, our first setup | The Skill |
|---|---|---|
| Criteria | Each step says what to read and the value it should have | Each criterion has an ID, `<sub-feature>#<n>`, and names the wrong implementation it rules out; scenario scripts cite each ID exactly once |
| Results | A run record in each map: PASS, FAIL, Not run, Blocked | No run record. Results stay in each run's evidence directory and the MR description, as PASS, FAIL, BLOCKED, UNVERIFIED or TO-CONFIRM, one per sub-feature and entry point |
| What is left out | Blocked rows in the run record | A Not covered section in every map, naming each spec ID no sub-feature references and why |
| Control commands | A command table per entry point (step 2), with `poll` for waiting | `verify.mjs` with one adapter per entry point (`up`, `doctor`, `do`, `down`), `run` for scenario scripts with one instance per scenario, and waiting inside the scripts' primitives or `run --detach` with `wait` |
| Structure check | Four checks, including one run-record row per sub-feature and entry point (step 5) | Keeps the index and ID checks; links criteria, scenario scripts and spec IDs both ways; rejects scripts that read files or set timers themselves; rejects a run record instead of requiring one. CI runs it; live runs are still not a gate |
| How much to build | "Start small, then grow" | Levels L0 to L3 with the trigger for each next level ([levels](../skills/repo-readiness/references/levels.md)) |
| Templates | [templates/](templates/) and the [example](examples/feature-map-example.md) in this directory | The Skill's [map template](../skills/repo-readiness/assets/feature-map.template.md) and the kit's [maps.md](../skills/repo-readiness/assets/verify-skill/references/maps.md) |

The Skill's [lessons](../skills/repo-readiness/references/lessons.md) give the failure behind each change.

## What "ready" means

A new agent session that has never seen the app, working in its own git worktree, can do five things by reading files in the repository:

1. Start an instance of the app that does not interfere with anyone else's.
2. Check that the instance is worth driving.
3. Operate a feature from each entry point users use, the way a user would.
4. Keep evidence of what the user saw and of what happened underneath: requests sent, state stored, files written.
5. Stop what it started, and keep the evidence.

Why this comes first:

- deliver runs each milestone's scenarios on the running app. A model from another family then runs all of them again on its own instance. Without a way to drive the app, agents fall back to unit tests and API calls. Anthropic saw this: "Claude tended to make code changes, and even do testing with unit tests or `curl` commands against a development server, but would fail recognize that the feature didn’t work end-to-end." ([Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents))
- The fix was the real interface. Claude did well at end-to-end checks "once explicitly prompted to use browser automation tools and do all testing as a human user would." (same article)
- In our runs, we drove the HTTP API first. When we added the TUI and the desktop app as entry points, driving them showed five product problems the API did not. One example: in all four runs, the TUI printed an error on a successful completion, and its status line read `state=fail`.

## What stage A produces, and which step uses it

All of it lives in a project-local **verification Skill**: a Skill directory in your repository that holds the control commands, the feature map and the instructions for using them. Lauren Tan's [create-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/SKILL.md) generates one. We wrote ours by hand, following its text.

| Item | What it is | Which Skill step relies on it |
|---|---|---|
| Control commands | Commands that prepare, start, check, drive, read, snapshot, reset and stop the app | core-spec step 6: [verify.md](../skills/core-spec/references/verify.md) section 4 locates them, and scenarios reference them. core-spec step 7: the [gap check](../skills/core-spec/references/gap-check.md) (item 5) confirms that referenced commands exist at the current commit. deliver, "Milestones": scenarios run with them. The [plan format](../skills/deliver/references/plan-format.md), "Validation and Acceptance", lists the actual commands |
| One isolated instance per agent | Its own profile, port and data directory, and safe handling of anything shared | deliver, "Independent verification": "You and the verifier must both start the app, each with your own checkout directory and instance (profile, port, data directory)." The [verifier brief](../skills/deliver/references/verifier-brief.md) gives the verifier "the instance, profile, port and data directory given to you" |
| Feature map | For each feature: entry points, actions, what to observe, what evidence to keep, and a run record | core-spec step 5 brings it in line with the product, then walks every entry point it lists. verify.md section 3: a scenario's "Entry point" names a map entry. Section 4: scenarios reference map entries instead of rewriting drive steps. Gap check item 5 |
| Smoke set | A few short journeys, at least one per entry point, that pass on the base branch | verify.md section 5, item 3: each requirement's own smoke set builds on it. The plan format's "Validation and Acceptance" says how to start the app and run the smoke set. The verifier runs it (verifier brief, step 2) |
| Quality commands | Lint, type check, tests | deliver, "Milestones" and done criterion 1 |
| Test doubles at the integration layer | Stand-ins placed where your app connects to an external system | verify.md section 3: the scenario's "Test double" field, and "Make internal rules observable first" |
| Read-only views | Logs, events, stored state, the requests the app sent out | verify.md section 3, "Observe the actual result" |
| Evidence location | Where commands write evidence, and what each file records | deliver, "Milestones": evidence goes in `evidence/` next to plan.md. The verifier appends to `results.md` in its evidence directory (verifier brief, step 3) |

Stage D closes the loop. deliver lists "Verification capabilities you added, and repository gaps you found" in the MR description. You decide which of them go back into stage A.

## Where it lives

Put it in the target repository, versioned with the code. A layout that worked for us:

```text
<skills dir>/verify-<app>/
  SKILL.md              prepare, start, doctor, smoke, drive, evidence, clean up, maintenance
  references/           one file per entry point (desktop, TUI) and per heavy tool (fault injection, stored data)
  scripts/              the control commands and their tests
  features/README.md    feature map index and shared conventions
<feature docs dir>/<feature>/feature-map/<map>.md    one map file per feature area
```

Why in the repository: the map describes the product at one commit. A branch that changes behavior has to change the map in the same MR. A map kept on one machine cannot follow branches, and parallel branches would overwrite each other. We first proposed a local-only copy for speed, and dropped it for this reason.

Where the map files sit is a choice. pstack puts them under the Skill's `features/` directory. We put each feature's map next to that feature's own docs, with the index in the Skill: the feature already had a docs directory its owners kept current, and the map refers to the feature spec's IDs. pstack's issue-reproduction automation also keeps the map elsewhere and points to it by a configured path ([control-adapter](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md)). What matters, in our judgment: the map is in the repository, versioned with the code, and reachable from SKILL.md.

The verification Skill is a tool agents use on demand. In our repository it is not a CI gate and not an end-to-end suite.

## Step 1. Answer five questions from the code

create-verification-skill starts with five questions, and the rule "Answer these from the codebase and only ask the user what you cannot observe". It also says: "If the checkout doesn't build or start as-is, fix that first (or report it precisely) before generating; a skill written against a broken base teaches wrong steps."

| Question | What to find | What we found |
|---|---|---|
| Surface | What does a user touch? List every entry point | A desktop app, a TUI and a local HTTP API; also a web UI and a CLI |
| Run | How does it start locally? | Dev scripts per surface. A fresh worktree needed builds the dev script did not run. The CLI started a new embedded runtime on every call, so it could not keep long-running work alive between calls |
| Drive | How can an agent operate it? Existing harnesses first | Playwright can launch the desktop app (it is an Electron app); a pseudo-terminal can run the TUI; the API takes plain HTTP. The feature's existing browser tests mocked its whole API, so they could not prove runtime behavior |
| Observe | What evidence can be read? | A built-in request inspector that saves each request sent to the model; a runtime event stream; a machine-readable TUI status line; stored state |
| Isolate | Can two instances run side by side? | Profiles already separated port, data directory and process, but the dev scripts chose the profile from the branch name |

Several facts in the right-hand column came out only when we ran things. Because of the CLI's behavior, we wrote a small server that hosts the runtime the way the desktop app does, so the API entry point can drive long-running work.

## Step 2. Write the control commands

Control commands are the agent's way into the app. Lauren Tan's advice is to build a tool, not more prose: "we prefer to give agents tools rather than just markdown. For verification skills, this means creating a small CLI that scripts interaction and debugging of your app in a small, agent friendly utility." ([The Complete Guide to pstack Pt. 1](https://x.com/i/article/2094151284949688320)). Anthropic's long-running harness had an initializer agent "write an init.sh script that can run the development server" ([Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)).

We started with a thin script that calls the repository's existing scripts, with SKILL.md documenting every command. We chose this over prose alone, because long commands get copied wrong, and over a tool server, which we did not need.

### The commands

| Command | What it does | Notes from our runs |
|---|---|---|
| `prepare` | Builds what a fresh worktree needs | The repository's dev script left packages unbuilt in a new worktree, and start failed with "module not found" |
| `up` (start) | Starts an instance. Prints the run ID, address and evidence directory | Refuses to start when sources are newer than the build. An override flag exists, and its use must be reported |
| `doctor` | Read-only check: is this instance worth driving? | Process alive; health endpoint echoes this run ID; instance belongs to this worktree; build newer than sources; credentials present. Each failed check prints its fix |
| Drive commands, per entry point | Do what a user does | Desktop: click, type, fill, hover, upload, wait, read text, count. TUI: type, paste, keys, read screen, wait for text or status. API: send a request |
| `poll` | Wait until a field has a value, or confirm it keeps it | `--until`, `--hold <seconds>`, `--timeout`. No fixed sleeps |
| `snapshot`, screenshot | Save state as evidence | API responses, workspace files with sha256, the run's events, the requests sent to the model. Desktop: screenshot, accessibility tree, video |
| Read-only queries | Read stored state and logs without changing them | A query on a stopped copy of the data directory; a per-turn summary built from a snapshot. The same data tool can also write stored state to arrange a precondition, and such writes are reported as arranged |
| Reset | Return to a known state | A new instance always gets an empty data directory. `--from-data` starts from a copy of a saved one. Each scenario uses a new conversation |
| `down` (stop) | Stop what this run started and clean up | Stops recorded process IDs only. Copies runtime logs into the evidence directory, deletes scratch data, keeps evidence, and lists what it kept. An empty list counts as a failed cleanup |
| `list` | Shows all instances, including stopped ones | |

These follow create-verification-skill's sections: Launch, Doctor, Drive, Evidence, Cleanup and Helpers. Doctor is "one read-only check that answers "is this instance worth driving?"". Run it before the first action and after anything surprising.

### The contract

Agents read command output and branch on exit codes. Each property below answers something we saw go wrong, or a source's advice.

| Property | Rule | Why |
|---|---|---|
| Output | One JSON object on stdout with an `ok` field. Progress and streamed events go to stderr | Lauren Tan lists "outputs returned in machine readable form (eg JSON)" among the properties of an agent-friendly CLI (Pt. 1) |
| Exit code | Non-zero whenever `ok` is false. When the app answers 4xx or 5xx, print the status and body, and still exit non-zero | An agent cannot miss a failure that stops its script |
| Errors | Say what went wrong and what to run next | "error messages should be very descriptive and tell the agent what it should do instead" (Pt. 1). OpenAI writes custom lint errors "to inject remediation instructions into agent context" ([Harness engineering](https://openai.com/index/harness-engineering/)) |
| Idempotence | `up` always creates a new instance with a new run ID; it never adopts an old one. `down` on an instance that is already stopped succeeds and does nothing beyond the cleanup it still owes (for example, data kept earlier with `--keep-data`). `prepare` is incremental | Retries after a failure must not make things worse. We required the repeated `down` to be tested |
| Targeting | A command acts on the latest live instance of its entry point in this worktree. With more than one running, `--run <runId>` is required | Otherwise a later instance silently takes the commands |
| Waiting | `poll --until … --timeout`, and `--hold` to confirm a state stays. No fixed sleeps | Fixed waits were among the defects our map review found (step 5) |
| Destructive actions | Stop only process IDs this run recorded. Delete only directories this run created, inside the script | "Never kill by process name; kill what you started." ([create-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/SKILL.md)). Our cleanup failure is below |
| Environment | Refuse an ambiguous environment, and ask for an explicit flag | Our proxy failure is below |
| Evidence | Each saved file records the run ID, the time, the commit, and whether the working tree had uncommitted changes | verify.md's done criteria require "the evidence matches the code and running instance of the delivered version" |
| Documentation and tests | Every command appears in SKILL.md with a real invocation, and the scripts have their own tests | "A helper the reader has to reverse-engineer is not a helper." (create-verification-skill). "Keep it well maintained and tested!" (Pt. 1) |

Two failures from our runs shaped this contract:

- **Cleanup by hand.** In the second real requirement, nothing told agents how to delete a kept instance's data. Subagents wrote `rm -rf` with unguarded shell variables. The agent CLI asks before such a deletion even in its most permissive mode, and the parent session cannot see a subagent's prompt. Subagents were blocked for 37 seconds, 12.5 minutes and 22 minutes. Our fix: point agents to `down --run <id>`, which deletes inside the script, so no `rm` appears on the command line.
- **Proxy variables.** The session's environment carried proxy variables for a proxy that could not reach internal services. The TUI's moderation calls failed and its replies were withdrawn; the desktop app hung at startup with no window. Now, when proxy variables are set, the TUI and desktop start commands refuse to run until you pass `--no-proxy` or `--keep-proxy`.

## Step 3. Give each agent its own instance

During delivery the owner and the independent verifier run the app at the same time, from two checkouts. OpenAI built for this: "we made the app bootable per git worktree, so Codex could launch and drive one instance per change." Their observability is per worktree too: "Codex works on a fully isolated version of that app—including its logs and metrics, which get torn down once that task is complete." ([Harness engineering](https://openai.com/index/harness-engineering/))

When something cannot be isolated, the commands should say so and refuse: "refusing to double-drive a shared instance beats corrupting the user's session." ([create-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/SKILL.md)). Lauren Tan differs from OpenAI on the means. She recommends against adding worktree support and prefers cloud agents that "have access to a real computer" (Pt. 1). Either way, each agent gets its own instance.

| Resource | What we do | What happened before |
|---|---|---|
| Data directory | A new temporary directory per run, deleted by `down` unless `--keep-data` is given | |
| Port | A free port on 127.0.0.1. The health endpoint echoes the run ID, and every response carries it in a header, so doctor can tell the instance is ours | |
| App profile and settings | The desktop instance gets a temporary user-data directory | Reading the dev scripts, we found that a verifier on a detached HEAD would get no branch name, fall back to the shared profile, and quit the installed app |
| Shared credentials | A lease rule: the shared login is refreshed only when no desktop instance holds it. Every refresh is logged. `down` reports authentication failures, and a run with any does not count | Starting desktop instances could refresh the shared login, which invalidated the token held by instances already running. Four scenario runs in one round were voided, and the plan had to allow only one desktop instance at a time |
| The user's screen | A small shim, loaded only in the test instance, stops the app from activating its window. The commands sample the foreground app around each action, and a run where the test window took focus is rerun | Test windows took keyboard focus from the person working at the machine |
| The user's real files | A guard watches the tool calls of the model inside the test instance. It stops the instance when a path leaves the instance directory or a write lands outside the workspace, and keeps the raw call | The product's own checking sub-agent searched the data directory. Outside a test instance, that is the user's real data. The guard sees a call only after it is sent: it stops the run and keeps the record, it cannot block in advance |
| Accounts with shared state | Scenarios that change a test account's quota run alone | A quota change would hit every other scenario running on that account |

Write down the real services an instance uses, because they are not isolated. In ours, model calls and content moderation are real and consume quota, and the desktop app logs in to a real account. Agents operate only the feature under test.

## Step 4. Add a smoke set

The repository's smoke set is a few short journeys, at least one per entry point, that must pass on the base branch at all times. It answers one question: is this environment and this build working at all?

Anthropic's harness ran one at the start of every session: "It also helps to ask the initializer agent to write an init.sh script that can run the development server, and then run through a basic end-to-end test before implementing a new feature." That way "Claude could quickly identify if the app had been left in a broken state, and immediately fix any existing bugs." ([Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents))

Ours:

- **API**, in the verification Skill. In a new conversation, send `Reply with exactly the word PONG and nothing else.` The history must have an assistant message `PONG`, and the stream must have no rewind frame. A rewind frame, together with a moderation 401 in the server log, meant the login and the moderation backend were in different environments.
- **TUI and desktop**, added in the second real requirement's smoke set. TUI: send the same message; the screen shows `PONG`, and the TUI's result log marks that turn as succeeded. Desktop: run the main feature's create step to completion, following the map.

Our judgment: put a smoke journey for every entry point in the verification Skill itself, so every requirement starts from the same checks. The PONG check reads a model reply, which is acceptable here because it only asks whether the path works. Scenario checks judge by state, events and files.

Each requirement's verify.md then has its own **smoke set**: a few core user journeys chosen by the risk of the change, preferring existing features the change touches (verify.md section 5, item 3). As the [verify example](../skills/core-spec/references/verify-example.md) puts it, the smoke set "holds only existing features that should pass before work starts". In our second real requirement, the smoke set had five items across the three entry points: two used the PONG check, and three pointed at map entries.

## Step 5. Map one feature

### What goes in the map

Lauren Tan describes the Feature Map as "an easily searchable map of all the features available in your app, what it does, and how to get to it from a user's perspective." (Pt. 1). Each step in it goes **entry point → action → observation → evidence**: where the user is, what they do (with the exact command), what to read and the value it should have, and which files to keep.

The map is not part of any single requirement:

| | What it covers | Belongs to | Changes |
|---|---|---|---|
| spec.md | What this requirement changes in the product | One requirement | Frozen at confirmation |
| verify.md | How to judge that this requirement is done right | One requirement | Frozen at confirmation |
| Feature map | What the product does now, how to reach each feature, how to prove it works | The repository | Kept in line with the product |

A map has an index and one file per feature area. The index holds the baseline state, driving conventions, proof rules and the list of features. Each feature file has, in order: a title and one paragraph; sub-features; entry points from the user's view; drive steps, one subsection per entry point; gotchas; and a run record. pstack's [example map](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/references/feature-map-example/README.md) uses the same parts without the run record. We added the run record after the review described below. The [template](templates/feature-map.md) has both files.

### Rules for writing entries

From the sources:

- Write from the user's view. "Keep implementation details out of the map." ([example map](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/references/feature-map-example/README.md))
- List every entry point. "The map is the repo's maintained verification source; a proof that drives one convenient entry point is incomplete when the map lists others." ([create-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/SKILL.md))
- "Prefer stable handles (ARIA labels, data attributes, prompt strings, route paths) over coordinates and tab order." (same)
- "Mutation proof includes a read-only second view of the stored value." (example map)
- An entry point you cannot drive is reported with the command you tried and the missing precondition: "Do not report a skipped entry point as verified through a different path." (example map)

From our runs:

- Give every sub-feature a unique ID, `<map name>.<short name>`, and split behaviors with different results into different IDs.
- Write commands that can be copied as they are. No `poll ...` with the arguments left out.
- Judge by state, events and files, not by model wording.
- Label arranged preconditions, such as a database trigger that makes a write fail, as arranged, both in the step and in the report. They set up the test; they are not a product path.
- When a step depends on the model choosing to do something, either fix the model's reply with a test double (step 8), or say that a run where the precondition did not hold does not cover the sub-feature.
- Add a visual checkpoint only where the screen itself is the result, such as a banner or a confirmation dialog. Name the screenshot, the reference and what counts as a pass.
- Keep run status out of the prose. It goes only in the run record, one row per sub-feature and entry point, with PASS, FAIL, Not run or Blocked. Not run and Blocked carry the reason. pstack's maintenance pass sets the bar: a feature that cannot be reached counts as unreachable "only with the concrete prerequisite (auth, entitlement, OS, external state) and the route attempted" ([maintain-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/maintain-verification-skill/SKILL.md)).
- Keep sub-feature IDs and section names stable. A frozen verify.md points at them. In our rebuild we keep every section and step name a frozen verify.md refers to, so its verifier can still find the steps.

### How core-spec, verify and deliver use the map

- **core-spec step 5** goes through each feature the spec touches, entry point by entry point and state by state (default, loading, empty, error, disabled, cancelled, triggered repeatedly, concurrent, after restart). With a map, it first brings the map for those features in line with the product, then walks every entry point the map lists. An example of the kind of gap this finds: a spec says long-running work continues after a background task ends, but not whether the same holds when the work was started from the TUI. That cell becomes a question at definition time, not a surprise at merge.
- **verify.md**: a scenario's "Entry point" names the map entry, and its steps refer to the map's drive commands instead of copying them (verify.md section 4). An entry that does not exist at the recorded commit is marked "bind command after implementation" or listed as a verification tooling gap.
- **Gap check**: item 5, "Executable", checks that the entry points, commands and feature map entries a scenario references exist at the current commit.
- **deliver**: the owner drives each milestone's scenarios from the map. A missing capability is added as "a reusable entry point that follows the repository's rules". verify.md section 4 gives examples: an extra observation in a control command, a read-only query or metric, or an entry in the feature map. The independent verifier loads the same verification Skill. In our second real requirement, one regression check ran every sub-feature the map listed as run, on the baseline and after a migration, and compared the final states, events and files.

The owner and the verifier share one verification Skill, so their methods match and results can be compared. The flip side, from our notes: if the Skill is wrong, both are wrong in the same way. That is one more reason to keep the map current, and why the verifier also reviews the code against the spec (verifier brief, step 5).

### Keeping it in line with the product

"A feature map rots the moment the app changes." ([maintain-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/maintain-verification-skill/SKILL.md)). Three moments keep it honest:

1. **In the same MR.** When a change alters a feature's user-visible behavior or entry points, the MR updates that feature's map and run record.
2. **Before each requirement.** core-spec step 5 brings the map for the features the requirement touches in line with the product, following your verification Skill's maintenance section if there is one. We chose this moment instead of a schedule. Lauren Tan recommends running /maintain-verification-skill "at least once a day" (Pt. 1). OpenAI runs a recurring "doc-gardening" agent that "scans for stale or obsolete documentation that does not reflect the real code behavior and opens fix-up pull requests" ([Harness engineering](https://openai.com/index/harness-engineering/)). A scheduled pass is worth adding when many people change the app at once (our judgment).
3. **A full pass**, when you want the whole map rechecked.

Write the maintenance section of SKILL.md as a done criterion, not a procedure. Ours: the structure check passes, and every sub-feature has been run at every entry point on this version, or its run record says why not. Edit only the maps and the verification Skill. pstack's rule on what you find: "a behavior the map describes that the app no longer does is either doc drift (fix the map) or a product regression (report it, don't paper over it in docs)." Every pass includes a live run. pstack's maintenance pass marks it "Required even when source looks clean." (maintain-verification-skill)

The structure check is a small read-only command. Ours checks four things: the index and the map files match one to one; sub-feature IDs are unique and start with their map's name; every declared entry point of every sub-feature has exactly one run-record row; no run-status text appears outside the run record. It does not check that the map matches the product. Only live runs do that.

What drift looked like for us. We reviewed the map after the second real requirement:

- The run status in the index had not been updated for the delivered version.
- About 10 of the 44 acceptance scenarios had no steps in the map.
- A set of specified behaviors had no map steps at all.
- Sub-feature IDs were not unique. In one file, 6 of 8 sub-features carried the same spec ID.
- Some steps used fixed waits, or could not be copied as written.

Earlier, during final verification of that requirement, a map step that nobody had ever run turned out to be missing a precondition, and the verifier gave FAIL on it in its second cycle. We changed the map format because of these findings: unique IDs, the run record, and the structure check. That rebuild was still in progress when this guide was written.

## Step 6. Prove it with a fresh session

create-verification-skill ends with a real run: launch, doctor, drive one mapped feature, capture evidence, clean up, then confirm the evidence still exists. "A generated skill that was never executed is a draft, not a deliverable." ([create-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/SKILL.md))

We added one more condition: a new session that has not seen the conversation, reading only the verification Skill, runs the same flow. The first such session got from prepare to cleanup and named 9 places where the docs were unclear, for example a wait time that contradicted the no-sleep rule and a snapshot whose output was incomplete. Two more sessions repeated the flow on the TUI and the desktop app. They found that the idle TUI needed Enter twice, that `down` typed the quit command into the TUI's input box, and that proxy variables made runs fail silently. We fixed all of them and ran again.

## Step 7. One command for the quality commands

Quality commands are lint, type check and tests. deliver runs them at every milestone, and done criterion 1 requires them to pass.

Give the agent one command that runs what CI would run for the changed paths. In our second real requirement, the owner chose checks by package, while CI chose jobs by the changed paths, and the two sets differed. Of the first 16 fix commits, 6 were for checks the owner had not run, such as a dead-code check and two migration tests. CI, milestone checks or other subagents found them later. Our recommendation, from that one run: if CI already has scripts that pick checks by changed path, expose them as the local quality command.

Keep this separate from the control commands. Quality commands judge the code; the verification Skill drives the app. When you change the control commands, run their own tests as well.

## Step 8. Test doubles only at the integration layer

Scenarios sometimes need an external system to fail, rate-limit, or answer in a fixed way. Put the test double at the integration layer, where your app connects to that system, and leave the rest real. verify.md section 3 says to trigger such conditions "with a test double placed in the layer that connects to the external system; a test double proves only the behavior inside its boundary." create-verification-skill allows "mocks only where a production boundary already isolates the external system."

What we built:

- **A fault-injection proxy** between the runtime and two external services: the model provider and the content moderation service. A rule replaces one matching request: an error such as a rate limit, a response without its usage field, a held or hanging response, or a scripted reply. Every other request goes to the real provider, and every request is logged.
- **Scripted replies.** One scenario's precondition depended on what the model chose to reply. With the real model it held in 2 of 14 runs. A scripted reply at the proxy fixes the precondition, while the runtime under test stays real.

A related tool is not a double: a **request barrier** in the desktop app holds real requests between the UI and the runtime and releases them on command. We use it to produce version conflicts and timeouts. The requests stay real; only their timing changes.

A counter-example from our repository: the feature's existing browser tests mocked its whole API. They showed that the UI renders a response, not that the runtime behaves.

Arranging a precondition is fine; producing the result under test is not. pstack's control contract: "Arranging a precondition is not permission to inject the reported symptom." ([control-adapter](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md)). When the spec requires a real provider, device or platform, the scenario runs there. If you cannot provide it, the map records that entry as Blocked with its prerequisite, and verify.md lists the affected checkpoints as a coverage blind spot, naming the test or check that judges them instead and where it runs. This is different from an environment that fails during a run: the verifier marks those checkpoints UNVERIFIED with "Environment blocked". Our map records three such cases as Blocked: real quota exhaustion, a phone app with no driver, and a platform we had no machine for. In the second real requirement, real quota exhaustion was also a coverage blind spot in verify.md.

## Step 9. Make what happened underneath readable

Some results cannot be seen at the entry point: the parameters actually sent, the state actually stored, the wiring under default startup. verify.md section 3 asks scenarios to read these back ("Observe the actual result"), and to add observability first when it is missing ("Make internal rules observable first"). OpenAI: "From the agent’s point of view, anything it can’t access in-context while running effectively doesn’t exist." ([Harness engineering](https://openai.com/index/harness-engineering/))

The read-only views we use:

- the request inspector: each request the app sent to the model, and the final response, per conversation;
- the runtime event log, one JSON object per line;
- workspace files in a snapshot, with sha256;
- a read-only query on a stopped copy of the data directory;
- a per-turn summary built from a snapshot: which turn did what, with which tool calls and how many requests.

Keep reading and changing apart. "Inspection is read-only. If a query changes state, it belongs in `drive UI` and must represent a real user action." ([control-adapter](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md))

## Step 10. Decide where evidence goes

- **Location.** The caller chooses. Our commands take `--evidence-dir`, and default to the instance directory under the system temp directory, which the system cleans. deliver points it at `evidence/` next to plan.md, and plan.md keeps only the path and a one-sentence conclusion. The independent verifier appends to `results.md` in the evidence directory it is given.
- **Contents of each file.** Run ID, time, commit and dirty flag (step 2), plus the sub-feature ID and the entry point used.
- **Per scenario.** Report the scenario ID, the sub-feature ID, the entry point, the commands, what was seen, the evidence paths and the commit.
- **Cleanup keeps it.** "Cleanup removes instances and scratch state, never the evidence" ([create-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/SKILL.md)). Our `down` lists the evidence it kept, and an empty list counts as a failed cleanup.
- **Video.** We record each desktop instance. During the second real requirement, a failure message was replaced after about 0.2 seconds: one screenshot, taken at 168 ms, caught it; another, at 183 ms, did not. Video is for people: to check a UI behavior before merging, or to jump to the moment a scenario failed. Agents still judge by state, events and files. Lauren Tan asks for "a video and screenshots as proof" (Pt. 1). OpenAI's agent records a video of the failure and a second one of the fix ([Harness engineering](https://openai.com/index/harness-engineering/)).
- **What to commit.** Follow the repository's rules. pstack: "Keep captures, recordings, logs, and tokens out of source control." ([reproduce-and-fix-issues](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/automations/benny/skills/reproduce-and-fix-issues/SKILL.md)). We keep videos local, and keep plans and reports in version control.

## Start small, then grow

You do not need all of the above before the first requirement. The order that worked for us:

1. **One entry point.** Pick the quickest to drive; for us, the HTTP API. Get prepare, start, doctor, smoke and cleanup working.
2. **One feature.** Map the feature your next requirement touches. Lauren Tan suggests "the top 3-5 to start", and proving the Skill by driving one of them: "one is enough; the map exists so later runs can cover the rest". We started with one feature. Its map was six files, one per area of the feature.
3. **A fresh session** runs it from the docs alone (step 6).
4. **The entry points users use.** We added the TUI and the desktop app the next day, once it was pointed out that those are the entry points users actually use. Driving them found the five problems described at the top. Do this step early: user-visible behavior must be verified where users see it.
5. **More features, one at a time, just before you change them.** Map by feature, not by requirement. The map records current behavior. Good sources for a first draft: the feature's spec, its existing end-to-end tests, its fix commits (good gotchas), and any manual test notes. Run every step at least once before relying on it.
6. **Let delivery fill gaps.** deliver adds the smallest missing capability as a reusable entry and lists it in the MR. OpenAI's question for every failure is the right one here: "what capability is missing, and how do we make it both legible and enforceable for the agent?" ([Harness engineering](https://openai.com/index/harness-engineering/))

Our judgment: do not write the whole map up front. A step nobody has run is worse than no step, because a later agent trusts it.

## Is the repository ready?

Ready for core-spec and deliver when all of these hold for the features the next requirement touches:

- [ ] A new session, reading only the verification Skill, starts an instance in its own worktree, passes doctor, runs the smoke set, drives one mapped feature, and cleans up with the evidence kept.
- [ ] Two instances from two checkouts run at the same time without interfering: separate data directories, ports and profiles; shared credentials handled; commands refuse what they cannot isolate.
- [ ] Every control command prints JSON, exits non-zero on failure, and says what to do next. `down` twice is safe. Nothing kills by process name.
- [ ] The smoke set passes on the base branch at every entry point users use.
- [ ] The features the next requirement touches have map entries for every entry point. Each step has been run on the current version and is recorded in the run record, or has its reason.
- [ ] The map's structure check passes, and SKILL.md has a maintenance section with done criteria that core-spec step 5 can follow.
- [ ] One command runs the quality commands CI would run for the changed paths.
- [ ] External systems that scenarios need to misbehave can be made to, at the integration layer; everything else stays real.
- [ ] Evidence goes where the caller says, records the commit and the run ID, and survives cleanup.

## Sources

- OpenAI, [Harness engineering](https://openai.com/index/harness-engineering/).
- Anthropic, [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents).
- Lauren Tan, [The Complete Guide to pstack Pt. 1](https://x.com/i/article/2094151284949688320) (cited as Pt. 1).
- Lauren Tan, pstack at commit `ecc249f`: [create-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/SKILL.md), its [example map](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/references/feature-map-example/README.md), [maintain-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/maintain-verification-skill/SKILL.md), [control-adapter](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md), [reproduce-and-fix-issues](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/automations/benny/skills/reproduce-and-fix-issues/SKILL.md).
- This repository: [core-spec](../skills/core-spec/SKILL.md), [verify.md](../skills/core-spec/references/verify.md), [gap check](../skills/core-spec/references/gap-check.md), [deliver](../skills/deliver/SKILL.md), [plan format](../skills/deliver/references/plan-format.md), [verifier brief](../skills/deliver/references/verifier-brief.md).
