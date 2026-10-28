---
name: feedback
disable-model-invocation: true
description: Runs stage D after a requirement is delivered, or over a span of time. Gathers what the sessions, the MR and the delivery records show, has a model from another family mine them for lasting gaps too, routes each gap to where it gets fixed, records it in the feedback ledger, and lands what the user approves. Use after an MR is mergeable or merged, or to review collaboration over the last weeks.
---

# Feedback: turn what a delivery exposed into fixes

A delivery leaves signals that its owner did not act on: context the user had to supply, checks that were self-reported, CI comments nobody read, rules that were ignored or contradicted each other, hours spent waiting. Left alone, they come back in the next requirement. This Skill finds them, decides where each one is fixed, writes them into a ledger that outlives the session, and fixes what the user approves. It is not a gate: it sets no quota of findings and blocks nothing.

Write the routing table, the ledger entries and your report in the language the user writes in.

## Inputs

The user gives one of these; find the rest yourself:

- **A requirement**: an MR or PR link, a requirement directory, a plan.md, or a few session ids for work that had no MR.
- **A time window**: for example "the last two weeks". This reviews collaboration across all sessions in the window instead of one requirement; see "Time-window runs".

**The ledger.** Read its location and its own conventions from the user's agent instructions (AGENTS.md, CLAUDE.md). When they name none, ask once, and use [the default format](references/ledger-default.md) for a new ledger. The ledger's conventions decide its file layout; this Skill decides what goes in it. When those conventions give feedback duties of its own, such as archiving the requirement's card, session list and snapshots, do them in step 1; numbers they record are checked in step 3 like the others.

Run in a new session, not in the session of the owner who delivered the work: the author should not be the only judge, and a new session carries none of the delivery's leftover context.

## Step 1: Gather the signals

Starting from the input, read what the requirement left behind. Where something cannot be read, write down what and why; do not guess its content. When the ledger or the requirement directory is a git repository, look for files removed from it in its history before calling them unreadable.

| Source | What to read |
|---|---|
| plan.md, MR description | The decision list, Surprises & Discoveries, Outcomes & Retrospective and the gaps it names |
| Requirement directory | Decision summary, the revision history of spec and verify, gap-check replies, verification and code review reports |
| MR / PR | Review comments, including automated reviewers in CI; failed pipelines and jobs; rework visible in the commit history |
| Sessions | Every session of the requirement (grill, spec, delivery, take-overs, side sessions): each user message, interrupts, abandoned runs, long waits |

**Which sessions.** Start from the session ids the ledger or plan.md records, passed to [sessions.mjs](scripts/sessions.mjs) `extract` as `--session`. Use `--grep` with the MR number, branch or directory only to find sessions missing from that list: it also matches sessions that merely mention them, so confirm each candidate belongs to the requirement, and drop the rest from the extract before it is counted or handed on. [Session sources](references/session-sources.md) says where each client keeps its sessions and what the extract contains.

**What to read.** The extract holds the user's side. The owner's side, its tool calls, the subagents it started and their models, context size and token usage, is in the session transcripts: search them for these fields rather than reading them whole.

## Step 2: Mine for gaps

Run two passes on the same material:

- A model from another family, read-only, called as [cross-model calls](../core-spec/references/cross-model.md) shows for the gap check, with [the miner brief](references/miner-brief.md) and the paths of the material from step 1. The extract stays outside any repository, so when the working directory is not one, `codex exec` also needs `--skip-git-repo-check`. Accept the reply when each entry has the brief's fields with an evidence location; otherwise resume the same session once and ask for what is missing.
- You, following the same brief, before you read the other pass's reply.

The brief lists the lenses. List every lasting gap you find. A one-off that will not change a later decision is not a gap and is left out of the table and the ledger. For each, write the phenomenon as it would happen again, the evidence and where it is, and why it will recur.

## Step 3: Check the numbers

Every count, rate and duration in the findings goes to a fresh subagent, which may run on a cheaper model than yours, with the extract and the sources the numbers came from (session transcripts and their usage fields, pipeline and job records, the requirement directory): it recomputes each one from the raw material, reports any that differ, and checks that a cause is not credited to a change that came after it. Correct the findings before anyone reads them.

## Step 4: Route

Merge the two passes and the gaps plan.md already names, and remove duplicates. Then for each gap:

1. **Look it up in the ledger.** The same phenomenon with the same cause already there is a recurrence: reopen that entry and count it again; do not create a new one. A match on the symptom alone goes to step 5 as a possible recurrence of that entry, for the user to settle.
2. **Check closed entries.** For entries marked changed or fixed whose closing condition this requirement could show, judge whether it held; a phenomenon that appeared again is a recurrence. List the others in one line as not observable here.
3. **Choose where it goes**, by [the routing table](references/routing.md): no change, the product repository (mechanism, verification assets, docs), the development Skills, the user's local configuration (agent instructions, hooks), a new requirement, a product defect, or upstream. A gap seen for the second time that a script or hook can decide goes to a mechanism, wherever that script or hook lives, not to more text.
4. **Recheck the rules it touches.** For each existing instruction the gap involves, ask whether it still carries weight. When it does not, or a new mechanism replaces it, deleting it is part of the entry.

## Step 5: Confirm once

Show the user a summary table first (phenomenon, new or recurring, destination), recurrences first, then by impact: the time or tokens it cost, the risk it puts on users or on what gets merged, and how often it would recur. Below it, one short block per entry following [explain-as-fool](../explain-as-fool/SKILL.md): the phenomenon in one sentence, one scenario from this requirement, and what landing it would change. The user may change a destination, reject an entry or reorder; a plain yes accepts the table. Pushing branches and opening Draft MRs or PRs for the accepted entries is confirmed in the same answer.

## Step 6: Land and record

After the confirmation:

- **Product repository**: a branch, the change, evidence that it fails before and passes after, a Draft MR separate from the requirement's MR. A change to a verification tool also shows that a known failure still fails.
- **Development Skills**: one change per PR, compared before and after in new sessions as [agent-prompt-rules](../agent-prompt-rules/SKILL.md) section 4 requires; the other approved entries stay in the ledger as not yet landed.
- **Local configuration**: change agent instructions or hooks as approved, and show the user the final text.
- **New requirement**: write a short request for the next core-grill; do not start it here.
- **Product defect, upstream**: write the issue or report as a draft; sending it is the user's.
- When this run's own entries are landed, you may land one more from the ledger's backlog: the one seen most often whose destination is clear.

Then write the ledger: this requirement's entries, the recurrences and closings in the index, and the run (session, mining model, confirmation time). Commit it as the ledger's conventions say.

## Time-window runs

For a window, run `sessions.mjs extract` over the window and `sessions.mjs stats` on the result, and compare the numbers with the previous window recorded in the ledger. [Session sources](references/session-sources.md) says what each number measures. Then mine, check, route, confirm and land as above, with the window's sessions as the material. The miner brief has two lenses meant for windows: decision points by root cause, and rules that were written but not followed.

## Done criteria

- Every gap in the confirmed table has an entry in the ledger with a destination and a state: changed (with its commit), MR or PR opened, not yet landed, or no change with the reason.
- Every number in the report was recomputed in step 3.
- Repository MRs carry before-and-after evidence; Skill PRs carry before-and-after runs.

## Report

Following explain-as-fool: how many entries are new, recurring and closed; what landed, with links; what waits on the user; for a window, the numbers next to the previous window's.
