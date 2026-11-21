---
name: agent-prompt-rules
description: Design rules and a change process for prompts written for agents, multi-agent pipelines, SKILL.md files and instruction files (AGENTS.md, CLAUDE.md), based on official sources. Use when writing, changing or reviewing any of them.
disable-model-invocation: true
---

# Design rules for prompts, pipelines, Skills and instruction files written for agents

When you write, change or review any of the following, check it against these rules one by one, and make the change by the process in section 4: prompts that a dispatcher (the agent or script that hands out a task) writes to an executor (the subagent or external agent that receives the task), multi-agent pipelines, `SKILL.md` files (including the `description` in the frontmatter), Skills the executor will read, and instruction files loaded in every session (`AGENTS.md`, `CLAUDE.md`). The official sources behind each rule are listed by rule number in [references/rule-sources.md](references/rule-sources.md); read it when you check a rule against its source, map a change to a source (4.1) or update these rules (section 5). The archive in [references/sources/](references/sources/README.md) keeps verbatim excerpts of the cited passages, with each document's official URL and the sha256 of its full text; the full texts are kept privately for comparison. When a citation and the live page differ, the archived text is what the rule cites.

## General principles

**Every instruction, every role and every step encodes an assumption about what the model can't do on its own.** As models improve, these assumptions go stale; delete the stale ones. To decide whether something stays, ask: would removing it cause the model to make mistakes? If not, delete it, or have the runtime enforce it instead.

Cutting means cutting constraints on behavior, not context. Context is what only the author knows: the audience, environment facts, the quality bar, and the reasons behind constraints. Give more context rather than less: when a delegated task description is too short, the executor fills the gaps with safe defaults, and duplicates work, leaves parts out or misreads the task. A constraint on behavior is a sentence that tells the executor how to act; test each one before you delete it, as described in 4.5. Always state the goal, the done criteria and the few real boundaries clearly.

**Priority.** The user's explicit instructions take precedence over these rules and over any Skill.

**Advice that holds for one model only.** Where an official guide names a specific model, its advice was measured only on that model. When the advice for different models conflicts, write a requirement on the result that holds for every model, and do not copy one model's specific instruction. Verification is an example: the Opus 5 guide recommends removing verification instructions, while the Fable 5 guide recommends explicitly asking for verification with subagents at intervals on long tasks.

## 1. Prompts from the dispatcher to the executor

1. **Describe the result, the purpose and the done criteria, not the steps.** Say what you want, who it is for, and what counts as done. Prescribe a process only when the user or the pipeline explicitly requires one.

2. **Write the done criteria as observable results and the evidence to hand back.** Verification instructions come in two kinds. Do not write verification rituals such as "double-check your work" or "verify twice before responding". Put real checks that can run into the done criteria: give a command or script that can be run as is, such as the tests, the type checker, the build, or the changed command itself, and ask for its output; when a check cannot run, ask the executor to say which one it did not run and why. Ask the report to keep what was observed apart from what is inferred, and to name what is not yet verified, in a line rather than as caveats throughout. Pass on verification requirements the user stated themselves unchanged.

3. **For each material, say what it is for and when to use it; do not ask the executor to "read everything before starting".** Give the paths and let the executor read what it needs. Require a full read only when the user or the pipeline explicitly asks for the full text. Where you know the answer is likely to be found, or which source to try when one comes up empty (the feedback id first, then the logs, then a reproduction from the description), say so: that is context only you have, not a method.

4. **Write only the one or two boundaries that prevent real problems, each with its reason, stated once and positively.** The executor follows them literally: a strongly worded boundary makes it stop where it could have continued, and stacked prohibitions and emphasis words dilute the one that really matters. Boundaries that really exist must still be stated.

5. **Authorize the executor to finish the work unattended.** It does reversible work within its authorization without asking, first completes the parts that no open question blocks, and hands back to the dispatcher only decisions that the user alone can make, and destructive or irreversible actions. To keep a kind of decision that will come up again out of that set, hand over the criterion you would decide it by, such as "fix it if the change is small, leave it if it is large", and what to assume when no one can be asked; the executor applies it and reports the assumptions it made.

6. **Do not prescribe the method.** Leave algorithms, libraries, command order and the number of tests to the executor, unless the user specifies them. What must hold are the invariants, not the implementation. Whether to use subagents is also the executor's decision; when the harness does not spawn subagents by default, or the executor tends to spawn too many (for example, its own reviewer subagents), write one condition for when to spawn or not, with its reason, for example that each extra agent costs more tokens and time, or that some part of the work needs an isolated context.

7. **Do not ask the executor to reproduce its reasoning in the response; ask for a short explanation, the evidence behind a result, or a summary of the actions it took.** Reproducing reasoning includes a `<thinking>` or scratchpad section, a `reasoning`, `thinking` or `trace` field in JSON output or a tool input, a running log of its reasoning, and reasoning asked for verbatim or in full, whether the wording sits in a prompt, a Skill or a tool description; such requests may be refused as reasoning extraction. The evidence that 1.2 asks for is of the allowed kind.

8. **An end of turn with text and no tool call is a report, not proof that the task is done.** When the executor hands back with items still open and no blocker stated, the dispatcher names those items in the same session and has it continue; continue the same task at most 2–3 times.

9. **Do not describe the grader to the executor; state every requirement the grader checks.** Phrases such as "someone will review this later" or "there are hidden tests" describe the checking apparatus, not the requirement, and push the executor's effort toward being watched. Write every item the verifier will check directly into the done criteria.

## 2. Pipeline design

1. **Start with one agent; split only for a clear benefit.** Splitting is worth it in only four cases: contexts would pollute each other, the work can genuinely run in parallel, parts need different tools or conflicting instructions, or the work needs independent verification. Multiple agents typically use 3–10 times more tokens.

2. **Split along context boundaries, not by type of work.** The role that already holds a context does the next step that depends on it; do not split the planning, implementation and testing of the same work across different roles, or each handoff loses part of the information. Three kinds of boundary can be split: independent research paths, components with clean interfaces, and verification that looks only at results. Example: the checker that verified how the review findings were resolved goes on to write the revised plan, rather than a new role being dispatched to read the dispute from the start.

3. **Hand checks to a new session; do not let the author check its own work.** An author evaluating its own output tends to approve it. The verifier gets only the done criteria, the artifact and the original materials, not the discussion along the way; the verifier only reports problems and does not change the artifact, and the author makes the changes from the report.

4. **In the verifier's prompt, state item by item what to check and what counts as a failure, and have it report only problems that affect correctness or the stated requirements.** Write only "check it", and the verifier takes a quick look and approves; ask it instead to "find gaps", and it will report some even when the work is sound, and chasing every finding leads to over-engineering, so mark the other comments as optional. This does not conflict with 1.2: verification is itself the verifier's task.

5. **Add independent verification as the task needs it; do not add repeated checks by the same author.** Add an independent verifier only when the task sits beyond what the model does reliably on its own (long runs, large documents, consistency across several sources). What to delete are the extra rounds in which the author rereads and confirms its own output; the author running tests or scripts and fixing what they show is a real check under 1.2, and stays.

6. **In reviews, report everything first, then filter.** The first-pass review prompt sets no severity threshold and does not say "be conservative", or the model follows that literally and reports less; filtering belongs in a later cross-examination or checking step.

7. **Independent perspectives must really differ, and evidence settles the conclusion.** Several agents on the same model with similar contexts make the same mistakes; discussion tends to converge on what everyone already knows, and a key fact that only one of them holds gets ignored. Agreement among several reviewers is not evidence; when they disagree, an independent role decides on the evidence, not by majority vote or negotiation.

8. **Give every loop a convergence condition and a maximum number of rounds.** Automatic continuation or revision usually gets 2–3 rounds; at the limit, stop, keep the open items and the evidence, and do not fake a pass.

9. **Stop to ask only when the user must decide**, and keep going on all other work the question does not affect; for anything that needs the user's approval, first carry it to the point where the user can approve it directly.

10. **Have the runtime or a tool enforce actions that must happen every time; do not write them as prompt rules.** For example: installing dependencies, verifying commits, checking source SHAs.

11. **When work must be picked up again, continue in the same session by default.** Open a new session only when that session is unavailable, and hand off through the repository, the git history and progress notes. Do not show the model its remaining context budget, and do not say things like "you have no memory and will hand off soon": this prompts it to wrap up early.

## 3. SKILL.md, the description and instruction files

1. **The description says only "what it does" and "when to use it".** Use the words users actually say as triggers, and keep it as short as possible; do not pile up synonyms, and do not describe the scope as wider than it is.

2. **Use SKILL.md as a router.** Content needed every time goes in the body; content needed only in some cases goes in `references/`, with a one-line pointer in the body that says when to read it. Keep the body under 500 lines. Put the most important constraints, the ones that apply throughout, at the top of the body: a Skill is not re-read after it loads, and after context compaction only its beginning may be kept (in Claude Code, the first 5,000 tokens).

3. **Assume by default that the model is already very smart, and write only what it does not know:** the project's own conventions, the reasons behind choices, and the gotchas you have run into.

4. **Match the degree of freedom to the risk.** Steps where mistakes are costly and that must be consistent every time are "narrow bridges", for example dispatching, resuming, concurrent writes and delivery checks in the dispatch control plane: use exact commands and runtime checks. The executor's implementation, review and writing are "open fields": give the goal, not the route.

5. **Say each thing in one place only; save emphasis for the one line that is in fact ignored again and again.** When everything is emphasized, nothing is.

6. **Review Skills the executor will read against these rules too.** Newer models are more sensitive to instructions in Skills and AGENTS.md, and unclear or conflicting instructions can make them stop early; a Skill is read by different models, so it must hold for every model that will use it.

7. **Write rules as current requirements, without their history.** Do not turn one slip directly into a permanent rule: first confirm that the same problem would occur in most sessions, then add it under 3.3 as a gotcha you have run into. The rule text says only what to do now: no incident narrative, PR numbers or dates, and no phrasing relative to an older version such as "no longer" or "changed to": the executor never saw the older version, and such words make it guess at an alternative that does not exist. When special cases of one kind pile up, merge them into one principle.

8. **Decide who invokes each Skill, and keep the list the model sees within its budget.** A workflow the user always starts by hand, because it has side effects or the user controls its timing, is a manual Skill: only the user invokes it, and its description stays out of the model's context. Every other Skill is model-invoked, and its name and description sit in the context of every session. These descriptions share one budget; when it overflows, the client shortens or drops descriptions, and the model has less to choose a Skill by. So register as a separate Skill only what must be found on its own, let a router (3.2) reach the workflows that only it needs, and put the key use case first in each description. The manual setting belongs to the client, not to the Skill format, for example `disable-model-invocation` in the frontmatter for Claude Code and `policy.allow_implicit_invocation` in `agents/openai.yaml` for Codex: set it for every client the Skill is installed in, and check in each that the Skill is absent from the model's Skill list. A client without such a setting lists the Skill like any other, so write a manual Skill's description by 3.1 as well.

9. **In an instruction file, keep only what applies to most tasks in the repository.** `AGENTS.md` and `CLAUDE.md` are loaded in every session, so every line costs context in every task, and a bloated file makes the model ignore the instructions that matter. Keep what the model cannot find by reading the repository: commands it cannot guess, conventions that differ from the defaults, and gotchas. Use the file as a map: point to the documents and Skills that hold the detail and say for each when to read it (1.3), rather than asking for all of them before every edit. Move what only some tasks need into a Skill or a document the file points to. Rules 3.3, 3.5 and 3.7 apply to instruction files as written; revisit each line regularly with the test in the general principles.

## 4. Change process

Work in order, and finish each step before starting the next:

1. **List the changes.** For every instruction, role or step you add or change, write down which shortcoming of the model it makes up for, and map it to a rule here or a section of a source. Do not add anything that maps to neither.
2. **Check the related existing content.** For each existing instruction the change touches, confirm whether the current model still needs it, and delete it if not. When two rules in the same Skill conflict in some cases, state which one takes precedence in which case, rather than leaving the executor to reconcile them.
3. **Remove one component at a time.** When cutting roles or steps from a pipeline, change one thing at a time, and record in the project's change log the basis for the change and the data to watch in the next run.
4. **Record the basis.** The PR description or the change log cites the rules in this Skill.
5. **Compare runs.** When a change deletes or rewrites an instruction that tells the executor how to act, run a few real requests in new sessions against the version before and the version after (or with and without the Skill), compare the behavior, and write the results into the same record. Run each request at least three times on each version and compare how often each case behaves as intended, not only the overall result: one run per version can be noise. Asking the model "do you still need this?" is not verification; a new session keeps leftover context from authoring from masking gaps in the written text. For a change of any other kind (new content, reference material, a script covered by its own tests, wording that keeps the meaning), a comparison is optional: try the changed part on one real request when that is practical, and otherwise say in the record that it was not run and why. In every case the record gives the requests, the number of runs and the models used; a result from fewer than three runs per version, or from one model family when another will also read the text, is an indication: record it with that limit stated, and list the missing runs as open.

Done criteria: every change maps to a rule here or a section of a source; where advice for different models conflicts, the text has been rewritten to hold for every model; rules in the same Skill that may conflict have a stated precedence; every deleted or rewritten instruction has before-and-after comparison results from repeated runs, and every other change has either a run or a stated reason for none.

## 5. Updating these rules

When a vendor releases a new model or a new prompting guide, update the sources, [references/rule-sources.md](references/rule-sources.md) and these rules as described in the [source list](references/sources/README.md#updating-a-source).
