---
name: dev-feedback
disable-model-invocation: true
description: Runs stage D after a requirement is delivered, on one session, or over a span of time. Checks whether earlier fixes held, answers the topics the user brings with evidence, finds the few process gaps that cost the user most, routes each to where it gets fixed, records them in the feedback ledger, and lands what the user approves. Use after an MR is mergeable or merged, after a session worth reviewing, or to review collaboration over the last weeks.
---

# Feedback: make the next delivery cost the user less

Feedback looks at the process (rules, Skills, tools, handoffs, the user's agent instructions), not at the product's code. Defects in the product belong to review and merge-gate; feedback asks only why the process let one through. The scarcest cost is the user's attention, then wall time, then tokens.

Every run answers four questions, in this order of value:

1. **Did the last fixes hold?** Each earlier change carries a closing condition; this material shows whether it held.
2. **Where did the user have to step in?** Context they supplied that the agent could have found, corrections, status checks, bare "continue", questions about unexplained terms, information carried between sessions, decisions the agent stopped for.
3. **What was caught late?** A problem that surfaced at a later gate than the one meant to stop it: CI red after local checks passed, a PASS overturned in review, a fault found after merge. The question is which gate missed it and why.
4. **Where did time go without producing anything?** Waiting, rework rounds, restarted or handed-off sessions, one-off scripts.

The user's own **topics** come first in the report. A topic is a hypothesis to test against the material: confirm it, narrow it, or show the evidence that contradicts it.

Write the report, the ledger entries and any question in the language the user writes in.

## Inputs

The user names a target and may add topics in the same message:

- **Target**: a requirement (an MR or PR link, a requirement directory, a plan.md), one or a few sessions (by id or title), or a time window such as "the last two weeks" (see "Time-window runs").
- **Topics**: whatever follows the target that says what the user wants improved or suspects went wrong, such as "I keep having to watch CI" or "the fix took too long". When the ledger's conventions name a file where topics were noted during delivery, read it too. With no topics, the report starts at the base part.

**The ledger.** Read its location and its own conventions from the user's agent instructions (AGENTS.md, CLAUDE.md). When they name none, ask once, and use [the default format](references/ledger-default.md) for a new ledger. The ledger's conventions decide its file layout; this Skill decides what goes in it. When those conventions give dev-feedback duties of its own, such as archiving the requirement's card, session list and snapshots, do them in step 1.

Run in a new session, not in the session of the owner who delivered the work: the author should not be the only judge, and a new session carries none of the delivery's leftover context.

## Step 1: Gather the material

Read what the target left behind. Where something cannot be read, write down what and why; do not guess its content. When the ledger or the requirement directory is a git repository, look for files removed from it in its history before calling them unreadable.

| Source | What to read |
|---|---|
| plan.md, MR description | The decision list, Surprises & Discoveries, Outcomes & Retrospective and the gaps it names |
| Requirement directory | Decision summary, the revision history of spec and verify, gap-check replies, verification and code review reports |
| MR / PR | Review comments, including automated reviewers in CI; failed pipelines and jobs; rework visible in the commit history |
| Sessions | Every session of the target: each user message, interrupts, abandoned runs, long waits |

**Scope follows the target.** For a requirement, read every source above. For a session target, read that session and what it produced or acted on; read the MR and CI only where the session acted on them.

**Which sessions.** Start from the session ids the user gave, the ledger records or plan.md records, passed to [sessions.mjs](scripts/sessions.mjs) `extract` as `--session`. Use `--grep` with the MR number, branch or directory only to find sessions missing from that list: it also matches sessions that merely mention them, so confirm each candidate belongs to the target, and drop the rest from the extract before it is counted or handed on. [Session sources](references/session-sources.md) says where each client keeps its sessions and what the extract contains.

**What to read.** The extract holds the user's side. The owner's side, its tool calls, the subagents it started and their models, context size and token usage, is in the session transcripts: search them for these fields rather than reading them whole.

## Step 2: Frame the topics and the open fixes

- **Topics.** Restate each topic as the questions the material can answer: how often it happened, what it cost, which rule, tool or handoff caused it. Look it up in the ledger: when it was seen before and changed, a recurrence means that change did not work. Ask the user only when a topic reads two ways that lead to different evidence; otherwise state your reading in the report.
- **Open fixes.** List the ledger entries marked changed, MR or PR opened, or recurred whose closing condition this material could show. Entries this material cannot show go in one line as not observable here.

## Step 3: Mine

Run two passes on the same material, each with [the miner brief](references/miner-brief.md), the topics as written in step 2, and the paths of the material from step 1:

- A model from another family, read-only, called as [cross-model calls](../core-spec/references/cross-model.md) shows for the gap check. The extract stays outside any repository, so when the working directory is not one, `codex exec` also needs `--skip-git-repo-check`. Accept the reply when each entry has the brief's fields with an evidence location; otherwise resume the same session once and ask for what is missing.
- You, following the same brief, before you read the other pass's reply.

Each pass gives a verdict on every topic and every open fix, and lists every lasting gap it finds under the four questions. A one-off that will not change a later decision is not a gap.

## Step 4: Check the numbers that carry a conclusion

Hand each count, duration and token figure that a verdict or the ranking rests on to a fresh subagent, which may run on a cheaper model than yours, with the extract and the sources the numbers came from: it recomputes each one from the raw material, reports any that differ, and checks that a cause is not credited to a change that came after it. Durations and tokens need their order of magnitude, not their last digit. Correct the findings before anyone reads them.

## Step 5: Rank and route

Merge the two passes and the gaps plan.md already names, and remove duplicates. A gap that answers a topic joins that topic.

1. **Settle the verdicts.** Each topic is confirmed, partly confirmed (say which part), or not supported (with the evidence against it). Each open fix held, did not hold, or is not observable. A fix that did not hold is a recurrence of its entry and moves to a stronger mechanism: text that failed becomes a check or a hook.
2. **Pick the base part.** Of the remaining gaps, keep at most three, ranked by what they cost the user: interventions first, then wall time, then tokens, weighted by how often they recur. Recurrences of ledger entries rank above new gaps of the same cost. The rest go to the ledger as not yet landed, without a block in the report.
3. **Look each up in the ledger.** The same phenomenon with the same cause is a recurrence: reopen that entry and count it again. A match on the symptom alone is shown to the user as a possible recurrence.
4. **Choose where it goes**, by [the routing table](references/routing.md). A gap seen for the second time that a script or hook can decide goes to a mechanism, wherever that script or hook lives, not to more text.
5. **Recheck the rules it touches.** For each existing instruction a topic or gap involves, ask whether it still carries weight. When it does not, or a new mechanism replaces it, deleting it is part of the entry.
6. **Give each a closing condition**: what a later delivery would show if the fix worked. The next run checks it in step 2.

Product defects the material reveals are not gaps of the process. List each in one line under "found in passing", with its evidence; whether to file it is the user's.

## Step 6: Report and confirm once

Write the report following [explain-as-fool](../explain-as-fool/SKILL.md), in this order:

1. **Your topics.** One block per topic: the verdict in one sentence; the evidence from this material (times, counts, quotes); the cause in the rules, tools or handoffs; the smallest change that removes it; how the next delivery will show it worked.
2. **Most worth changing.** The base part, at most three blocks of the same shape.
3. **Last fixes.** One line each: held, did not hold, not observable.
4. **Found in passing.** One line each, if any.
5. **What to confirm.** Destinations and what will be pushed or opened, numbered.

Ledger ids, routing categories and the total gap count stay out of the body; give them in one closing line pointing at the ledger. The user may change a destination, reject an entry or reorder; a plain yes accepts everything, including pushing branches and opening Draft MRs or PRs for the accepted entries.

## Step 7: Land and record

After the confirmation:

- **Product repository**: a branch, the change, evidence that it fails before and passes after, a Draft MR separate from the requirement's MR. A change to a verification tool also shows that a known failure still fails.
- **Development Skills**: one change per PR, compared before and after in new sessions as [agent-prompt-rules](../agent-prompt-rules/SKILL.md) section 4 requires; the other approved entries stay in the ledger as not yet landed.
- **Local configuration**: change agent instructions or hooks as approved, and show the user the final text.
- **New requirement**: write a short request for the next core-grill; do not start it here.
- **Product defect, upstream**: write the issue or report as a draft; sending it is the user's.

Then write the ledger: the topics with their verdicts, the base part and the remaining gaps with their destinations and closing conditions, the verdicts on the last fixes, and the run (session, mining model, confirmation time). A topic is an entry like any gap, marked as the user's, so later runs check its closing condition. Commit it as the ledger's conventions say.

## Time-window runs

For a window, run `sessions.mjs extract` over the window and `sessions.mjs stats` on the result, and compare the numbers with the previous window recorded in the ledger. [Session sources](references/session-sources.md) says what each number measures. Then frame, mine, check, rank, report and land as above, with the window's sessions as the material and every open fix in the ledger as a candidate for step 2.

## Done criteria

- Every topic has a verdict with evidence; every open fix the material could show has a verdict.
- The report's base part has at most three entries, each with a cause, a change and a closing condition.
- Every gap in the confirmed result has an entry in the ledger with a destination and a state: changed (with its commit), MR or PR opened, not yet landed, or no change with the reason.
- Every number a verdict or the ranking rests on was recomputed in step 4.
- Repository MRs carry before-and-after evidence; Skill PRs carry before-and-after runs.

## Final message

After landing, following explain-as-fool: what landed, with links; the topics' verdicts in one line each; what waits on the user; for a window, the numbers next to the previous window's.
