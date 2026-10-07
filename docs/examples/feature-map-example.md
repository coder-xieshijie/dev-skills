# Example: a feature map from our runs

This example is adapted from the feature map we wrote during our own stage A. It follows the [feature map template](../templates/feature-map.md); the reasons behind each part are in [Repository readiness](../repository-readiness.md).

**The product.** An agent app with three entry points: a desktop app, a terminal UI (TUI), and a local HTTP API. All three are backed by one local runtime.

**The feature.** A user gives a conversation an **objective**. The runtime keeps working on it, turn after turn, until a completion check inside the product says it is met. The user can pause, resume and edit the objective.

**What we changed for this page.** The product, the feature, paths, test IDs, API routes, event names and UI text are renamed. Commands are shortened. The real map splits this feature into six files by area; this page is one file with a few sub-features taken from two of them. The sections, what each step does and checks, the gotchas and the smoke set come from our work. Two things are reshaped to match the template: each step is split into Action, Command, Observe and Evidence, and a States section is added. In the run record, commits and dates are placeholders, and the results only show the format.

## The index entry

The index lists the map and adds conventions specific to this product:

```markdown
| Feature | Map | Covers |
|---|---|---|
| Objectives | docs/objective/feature-map/objective.md | create, pause, resume, edit, completion check |

- Desktop elements are located by test ID and role. Where UI text is needed, steps give the English text.
- When a step depends on how the model replies, start the instance with `--fault` and script the reply (SKILL.md, "Fault injection"). Say which requests were scripted.
- Model replies vary. Judge by objective state, runtime events and workspace files, never by reply wording.
```

## The feature file

Everything between this line and the next horizontal rule is the map file `objective.md`.

---

# Objectives: lifecycle and completion check

A user gives a conversation an objective. The runtime keeps working on it, turn after turn, until a completion check inside the product says it is met. The user can pause it, resume it and edit it from the desktop app, the TUI or the API. The behavior rules are in the feature's spec, OBJ-01 to OBJ-15. This file says how to reach, drive and judge them.

## Sub-features

- `objective.create` (OBJ-01; desktop, TUI, API, phone): with no unfinished objective, setting one creates it as `active`, and the first turn starts at once. In the desktop app, the composer returns to normal mode after sending.
- `objective.pause` (OBJ-04; desktop, TUI, API): pausing an `active` objective gives `paused(user_requested)`. The running turn stops, and nothing resumes on its own. The desktop pause request carries no version.
- `objective.resume-start` (OBJ-04; desktop, TUI, API): resuming starts one new turn bound to the objective, even when the user clicks Resume twice.
- `objective.resume-wait` (OBJ-04; TUI, API): resuming while a background task the objective depends on is still running keeps the objective `active` and waiting. The next turn starts after the task ends, once.
- `objective.edit-conflict` (OBJ-03; desktop): when the objective changed in the background while the user was editing it, the desktop app refreshes to the latest state, keeps the user's text, shows a notice and does not retry on its own.
- `objective.check-not-met` (OBJ-10; API): when the completion check answers "not met", the objective stays `active`, and the next turn receives the gap the check named.

Related sub-features in other maps: request limits and budgets in `objective-limits`; the background tasks themselves in `background-task`.

## Entry points (user view)

| Entry point | What the user does | Driven by | What the app sends or calls |
|---|---|---|---|
| Desktop: composer on the home screen or in a conversation, `/objective <text>` | Types and sends | desktop | `POST /api/v1/session/<id>/objective` when there is no unfinished objective; otherwise `PATCH .../objective` with the version the user saw |
| Desktop: objective banner, Pause, Resume and Edit buttons | Clicks | desktop | `PATCH .../objective` with `status` or `objective` |
| TUI: `/objective <text>`, `/objective pause`, `/objective resume` | Types the command | TUI | An in-process call to the same runtime owner; no HTTP |
| HTTP API: `/api/v1/session/<id>/objective` | A client sends `POST`, `PATCH` or `DELETE` | API | The same request |
| Phone app (remote control) | Taps in the phone app | none: no driver | Calls back into the desktop runtime |

The desktop app sends the version the user saw (`expected_objective_id` and `expected_updated_at`) with edits and resumes, and treats 60 seconds without an answer as a timeout. Pause sends no version.

## States

Our real map has no States section; the template added it later. It is filled in here from the real map's sub-features to show the format.

| State | Applies? | Sub-feature, or why not |
|---|---|---|
| Default | yes | `objective.create` |
| Loading | yes | the first turn starts at once (`objective.create`); waiting for a background task (`objective.resume-wait`) |
| Empty | yes | an empty objective is rejected with 400 (`objective.create-rejected`, not shown on this page) |
| Error | yes | the completion check says not met (`objective.check-not-met`); a resume the runtime cannot queue (`objective.resume-failed`, not shown) |
| Disabled | yes | the feature switched off in configuration (`objective.feature-off`, not shown) |
| Cancelled | yes | pausing stops the running turn (`objective.pause`) |
| Triggered repeatedly | yes | clicking Resume twice starts one turn (`objective.resume-start`) |
| Concurrent | yes | edited in the background while the user edits (`objective.edit-conflict`) |
| After restart | yes | objectives saved by an older version keep their state after an upgrade (`objective.upgrade`, not shown) |

## Driving it with verify-app

Preconditions: an instance for the entry point you use, started per the verification Skill's SKILL.md; doctor passes; a new conversation for each scenario. `V` is the control script. `$S` is the conversation ID.

### Desktop

Start with `node $V desktop up --config <config with permission mode set to always allow>` unless the step tests permissions. Close the first-launch dialog.

- "Send `/objective <text>`" means `node $V desktop type --testid message-input --value "/objective <text>"`, then `node $V desktop click --testid send-button`.
- `$S`: run `node $V api GET /api/v1/session --on desktop` and take the conversation with the newest `created_at`.

Steps:

- **Create** (`objective.create`)
  - Action: on the home screen, send `/objective Write the numbers 1 to 3 into count.txt, one number per line, then stop.`
  - Command: `node $V desktop wait --testid objective-banner --timeout 60 --save d-create`
  - Observe: the banner appears. `node $V desktop text --testid objective-banner-status` is `Running`. `node $V desktop count --testid objective-mode-tag` is `0`, so the composer is back in normal mode.
  - Evidence: `NNN-d-create.json` and its screenshot.
- **Run to completion** (`objective.create`)
  - Command: `node $V poll /api/v1/session/$S/objective --on desktop --until objective.status='complete|paused|blocked' --show objective.status,objective.status_reason --interval 3 --timeout 420 --save d-run`
  - Observe: the final state is `complete(check_met)`. `objective-completion-marker` starts with `Objective completed`. `objective-banner-status` is `Finished`.
  - Evidence: `NNN-d-run.json`, which holds the state trajectory, and a screenshot.
- **Pause** (`objective.pause`)
  - Action: on the home screen, send `/objective Run the shell command sleep 30 in the foreground, then write done.txt containing ok.` When the banner appears, click Pause.
  - Command: `node $V desktop barrier add --method PATCH --path-contains /objective --record-only`, then `node $V desktop click --testid objective-banner-pause`
  - Observe: `objective-banner-status` is `Stopped`. `node $V poll /api/v1/session/$S/objective --on desktop --until objective.status=paused --timeout 30 --save d-pause` gives `paused(user_requested)`. `node $V desktop barrier list --save d-pause-body` shows the request body `{"status":"paused"}`, with no `expected_objective_id`.
  - Evidence: `NNN-d-pause.json`, `NNN-d-pause-body.json`.
- **Resume** (`objective.resume-start`)
  - Action: click Resume, and click it again at once while the button is still shown.
  - Command: `node $V desktop click --testid objective-banner-resume`, the same click again, then `node $V desktop wait --testid stop-button --timeout 10` and `node $V snapshot --session $S --on desktop --save d-resume`
  - Observe: `objective-banner-status` is `Running`. The snapshot's events have exactly one new `objective.turn_started` after the first click, and its `payload.objectiveUpdatedAt` equals `updated_at` from `GET .../objective`.
  - Must not appear: a second new `objective.turn_started` from the second click.
  - Evidence: `NNN-d-resume.json`, `NNN-d-resume-runtime-events.jsonl`.
- **Edit conflict** (`objective.edit-conflict`)
  - Arrange: pause an objective as in "Pause". Run `node $V desktop barrier add --method PATCH --path-contains /objective`, so the next request is held. The barrier holds the real request; it does not answer in the runtime's place.
  - Action: click Edit on the banner, change the text, send, and confirm the replace dialog. While the request is held, change the objective through the API. Then release the held request.
  - Command:
    1. `node $V desktop click --testid objective-banner-edit`
    2. `node $V desktop fill --testid message-input --value "Write the word mine into mine.txt."`, then `node $V desktop click --testid send-button`
    3. `node $V desktop click --selector '[data-testid="objective-replace-confirm"] >> button >> nth=-1'`
    4. `node $V desktop barrier list --save d-conflict-held`
    5. `node $V api PATCH /api/v1/session/$S/objective --on desktop --data '{"objective":"Write the word other into other.txt."}' --save d-conflict-other`
    6. `node $V desktop barrier release`
  - Observe: the held request in step 4 carries `expected_objective_id` and `expected_updated_at`. After release, the page shows `The objective was updated in the background and has been refreshed. Your changes are kept and can be submitted again.` The banner shows the text set through the API. `node $V desktop text --testid message-input` still holds the user's text.
  - Must not appear: a second, automatic `PATCH` in `node $V desktop barrier list`.
  - Evidence: `NNN-d-conflict-held.json`, `NNN-d-conflict-other.json`, a screenshot of the notice.

### TUI

Start with `node $V tui up`. The TUI has no HTTP API: read values from the screen, the status line, and the events in `tui snapshot`.

- **Create** (`objective.create`)
  - Action: type `/objective Write the numbers 1 to 3 into count.txt, one number per line, then stop.`
  - Command: `node $V tui type "/objective Write the numbers 1 to 3 into count.txt, one number per line, then stop."`, then `node $V tui wait --text "◎ Objective · Active" --timeout 30 --save t-active`
  - Observe: the screen shows `Objective started.`
  - Evidence: the `t-active` screen capture.
- **Pause** (`objective.pause`)
  - Command: `node $V tui type "/objective pause"`, then `node $V tui wait --text "◎ Objective · Paused" --timeout 30 --save t-paused`
  - Observe: the running turn shows `Interrupted`, and the status line has `state=cancel`.
  - Evidence: the `t-paused` screen capture.
- **Resume and run to completion** (`objective.resume-start`)
  - Command: `node $V tui type "/objective resume"`, `node $V tui wait --text "Objective complete" --timeout 420 --save t-complete`, then `node $V tui snapshot --save t-lifecycle`
  - Observe: the screen shows `Objective resumed.`, then the turn's output, then `✓ Objective complete · … · <N> requests`. `count.txt` in the snapshot's workspace holds 1 to 3.
  - Evidence: the `t-complete` screen capture, the `t-lifecycle` snapshot.
- **Resume while a task runs** (`objective.resume-wait`)
  - Command:
    1. `node $V tui type "/objective Start a background subagent task that waits 40 seconds and then writes sub.txt containing sub-done. End your turn right away without waiting. The objective is met only when sub.txt contains sub-done."`, then `node $V tui wait --text "◎ Objective · Waiting for background tasks" --timeout 150`
    2. `node $V tui type "/objective pause"`, `node $V tui wait --text "◎ Objective · Paused" --timeout 30`. The task is still running: `node $V tui wait --status agents=1/1 --timeout 15` passes.
    3. `node $V tui type "/objective resume"`, `node $V tui wait --text "◎ Objective · Waiting for background tasks" --timeout 15 --save t-resume-wait`
    4. `node $V tui wait --text "Objective complete" --timeout 600`, then `node $V tui snapshot --save t-resume-wait-done`
  - Observe: after step 3 the screen says `Waiting for background tasks` and not `Objective resumed.` Between the resume and the end of the task, the snapshot has no new `objective.turn_started`; after it, exactly one. `sub.txt` contains `sub-done`.
  - Evidence: the `t-resume-wait` screen capture, the `t-resume-wait-done` snapshot.

### API

Start with `node $V up`, or `node $V up --fault` for steps that script the model's replies. Create a conversation with `node $V api POST /api/v1/session --data '{"title":"objective"}' --save session`; `$S` is `body.session_id`. A 4xx or 5xx answer gives `ok: false` and a non-zero exit, with the status and `body.code` still printed.

- **Create** (`objective.create`)
  - Command: `node $V api POST /api/v1/session/$S/objective --data '{"objective":"Write the numbers 1 to 3 into count.txt, one number per line, then stop."}' --save a-create`
  - Observe: status 200; `objective.status` is `active`.
  - Evidence: `NNN-a-create.json`.
- **Pause, and confirm it stays paused** (`objective.pause`)
  - Command: `node $V api PATCH /api/v1/session/$S/objective --data '{"status":"paused"}' --save a-pause`, then `node $V poll /api/v1/session/$S/objective --until objective.status=paused --hold 8 --show objective.status,objective.requests_used --save a-still-paused`
  - Observe: `status_reason` is `paused(user_requested)`. The hold passes, so nothing resumed on its own.
  - Evidence: `NNN-a-pause.json`, `NNN-a-still-paused.json`.
- **Resume and run to the end** (`objective.resume-start`)
  - Command: `node $V api PATCH /api/v1/session/$S/objective --data '{"status":"active"}' --save a-resume`, then `node $V poll /api/v1/session/$S/objective --until objective.status='complete|paused|blocked' --show objective.status,objective.status_reason,objective.execution.wait_reason --interval 4 --timeout 420 --save a-run`, then `node $V snapshot --session $S --save a-final`
  - Observe: the trajectory goes `active`, then `execution.wait_reason` `checking`, then `complete(check_met)`. `count.txt` in the snapshot holds 1 to 3.
  - Evidence: `NNN-a-run.json`, the `a-final` snapshot.
- **Resume while a task runs** (`objective.resume-wait`)
  - Command:
    1. `node $V api POST /api/v1/session/$S/objective --save a-wait-create --data '{"objective":"Start a background subagent task that waits 40 seconds and then writes sub.txt containing sub-done. End your turn right away without waiting. The objective is met only when sub.txt contains sub-done."}'`
    2. `node $V poll /api/v1/session/$S/objective --until objective.execution.wait_reason=required_background --timeout 150 --save a-wait-deferred`, then pause as above.
    3. `node $V api PATCH /api/v1/session/$S/objective --data '{"status":"active"}' --save a-wait-resume`
    4. Poll to a final state with `--timeout 600`, then `node $V snapshot --session $S --save a-wait-done`.
  - Observe: the response in step 3 is `active` with `execution.wait_reason` `required_background`. No new `objective.turn_started` before the task ends; exactly one after. `sub.txt` contains `sub-done`.
  - Evidence: `NNN-a-wait-resume.json`, the `a-wait-done` snapshot.
- **Completion check says not met** (`objective.check-not-met`)
  - Arrange: start with `node $V up --fault`. Script the first completion check's answer at the model provider boundary, so it is the same in every run while the runtime under test stays real: `node $V fault add --session $S --role checker --times 1 --action reply --script '{"content":[{"type":"text","text":"The work is not finished yet.\n- count.txt was not read back after writing\nVERDICT: FAIL"}]}' --save a-nm-rule`
  - Command: create the `count.txt` objective as in "Create" (`--save a-nm-create`), poll to a final state with `--timeout 900` (`--save a-nm-run`), then `node $V snapshot --session $S --save a-nm`.
  - Observe: the first `objective.check_decided` event has verdict `not_met`, and at that point the trajectory still shows `active`. Then comes a new `objective.turn_started`, whose first request to the model contains `count.txt was not read back after writing` (read from the request inspector in the snapshot). Then a second `objective.check_dispatched`.
  - Evidence: `NNN-a-nm-rule.json`, `NNN-a-nm-run.json`, `NNN-a-nm-runtime-events.jsonl`, the `NNN-a-nm-inspector/` directory.

## Gotchas

- Entry points edit differently on purpose. Editing a paused objective in the desktop app also resumes it; the TUI and the API change only the text and leave it paused. Do not report this difference as a bug.
- The first turn starts the moment the objective is created. Even a pause within 200 ms is too late. To know which objective actually ran, read the files at the end.
- Resuming and editing produce no state-transition event. Judge a resume by the response, a new `objective.turn_started`, and the trajectory after it.
- Some steps depend on the model doing what the text asks, such as starting a background subagent. If it does not, that run does not cover the sub-feature. Start again in a new conversation, or script the reply as in `objective.check-not-met`.
- The replace dialog's buttons have no test IDs. Steps select them by position (last is confirm, second to last is cancel), which breaks if the order changes.
- In the desktop app's default permission mode, a folder permission card appears once for the working turn and once for the completion check. Time spent waiting on a card counts toward the elapsed time on the banner, and `poll` waits until it times out. Start with the always-allow configuration unless the step tests permissions.
- Removing an objective while a turn runs hides the banner, but the turn keeps running. Click Stop to end it.

## Run record

| Sub-feature | Entry point | Result | Version | Date | Note |
|---|---|---|---|---|---|
| `objective.create` | desktop | PASS | `<commit>` | `<date>` | |
| `objective.create` | TUI | PASS | `<commit>` | `<date>` | |
| `objective.create` | API | PASS | `<commit>` | `<date>` | |
| `objective.create` | phone | Blocked | | | No driver for the phone app in this repository. The API and desktop rows do not stand in for it |
| `objective.pause` | desktop | PASS | `<commit>` | `<date>` | |
| `objective.pause` | TUI | PASS | `<commit>` | `<date>` | |
| `objective.pause` | API | PASS | `<commit>` | `<date>` | |
| `objective.resume-start` | desktop | PASS | `<commit>` | `<date>` | |
| `objective.resume-start` | TUI | PASS | `<commit>` | `<date>` | |
| `objective.resume-start` | API | PASS | `<commit>` | `<date>` | |
| `objective.resume-wait` | TUI | PASS | `<commit>` | `<date>` | |
| `objective.resume-wait` | API | PASS | `<commit>` | `<date>` | |
| `objective.edit-conflict` | desktop | PASS | `<commit>` | `<date>` | |
| `objective.check-not-met` | API | PASS | `<commit>` | `<date>` | Completion check reply scripted at the provider boundary |

---

## How verify.md uses these entries

The smoke set in our second real requirement's verify.md, renamed. Three items point at map entries; two use the PONG check from the verification Skill:

- API: per SKILL.md "Smoke", create a conversation and send `Reply with exactly the word PONG and nothing else.` The history has an assistant message `PONG`, and the stream has no rewind frame.
- API: `objective.create` (API), then "Resume and run to the end" without pausing: the final state is `complete(check_met)`, and `count.txt` holds 1 to 3.
- Desktop: `objective.create` (desktop), "Create" and "Run to completion": the banner reads `Finished`, and `objective-completion-marker` is present.
- TUI: `objective.create` (TUI), then `objective.pause`: `◎ Objective · Active`, then `◎ Objective · Paused`.
- TUI: send `Reply with exactly the word PONG and nothing else.` The screen shows `PONG`, and the TUI's result log marks the turn as succeeded.

A scenario names a map entry and refers to its steps instead of copying them (verify.md section 4). This one is illustrative; the fields are the ones verify.md uses:

```text
S07 Resuming while a background task runs waits for the task  Covers: R21
Entry point: TUI; feature map objective.resume-wait
Preconditions: a new conversation; TUI instance started; doctor passes
Steps: the map entry's TUI steps 1 to 4
Checkpoints:
  1. After /objective resume, the screen shows "◎ Objective · Waiting for background tasks".
  2. Between the resume and the end of the background task, the snapshot has no new objective.turn_started event.
  3. After the task ends, exactly one new objective.turn_started; sub.txt contains "sub-done".
Must not appear: "Objective resumed." before the task ends (checkpoint 1 is the paired positive check)
Baseline expectation: <fails or passes on the code before the change, as the spec's change says>
Decoy implementation: resume sets the state to active and starts a turn at once
Test double: none
Evidence: t-resume-wait screen capture; t-resume-wait-done snapshot
Execution status: entry point exists
```

## What one evidence file looks like

Every file a command saves starts with the same fields, so it can be tied to one run and one commit. This is the file the desktop "Pause" step saves for the click, with values replaced. The file name and the scenario report carry the sub-feature ID and the entry point.

```json
{
  "runId": "20260101-120000-a1b2c3",
  "capturedAt": 1767268800000,
  "git": {
    "head": "<40-hex commit>",
    "dirty": false
  },
  "video": {
    "file": "<evidence dir>/videos/<recording>.webm",
    "offsetMs": 94689
  },
  "action": "click",
  "target": {
    "testid": "objective-banner-pause"
  },
  "result": {
    "ok": true
  },
  "screenshot": "<evidence dir>/screenshot-<time>-d-pause.png"
}
```

`video.offsetMs` is where this action happens in the recording, so a person can jump straight to it.

## What the example shows

| Rule from the guide | Where it appears |
|---|---|
| Every entry point users use, or a stated reason | `objective.create` has desktop, TUI and API steps, and a Blocked row for the phone app |
| Read the result from a second, read-only view | Desktop "Pause" reads the request body from the barrier; desktop "Resume" reads runtime events, not just the banner |
| Assertions that can fail | "Resume" clicks twice and requires exactly one new turn; "Resume while a task runs" requires that `Objective resumed.` does not appear early |
| Confirm a state holds, without fixed sleeps | API "Pause" uses `poll --hold 8` |
| Test doubles only at the integration layer | `objective.check-not-met` scripts one reply at the model provider boundary; everything else stays real |
| Arranged preconditions are labeled | The barrier in "Edit conflict" holds a real request and is described as arranged |
| Judge by state, not wording | Every check reads states, events or files; none reads the model's reply text |
