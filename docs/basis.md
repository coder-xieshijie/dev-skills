# Why the workflow looks the way it does

This document explains the reasoning behind the development workflow in this repository: the three Skills [core-grill](../skills/core-grill/SKILL.md), [core-spec](../skills/core-spec/SKILL.md) and [deliver](../skills/deliver/SKILL.md), and the rules we use to write them. It is for engineers who want to check the reasoning before they adopt the workflow or argue with it.

The workflow rests on three sources:

- **OpenAI:** the Harness engineering article, the ExecPlan guide, the long-horizon Codex post, and Codex documentation and samples.
- **Anthropic:** two engineering articles on long-running harnesses, the Claude Code docs, the prompt-audit guide, and the model prompting guides.
- **Lauren Tan:** her pstack plugin for Cursor and her two-part guide to it.

Every quote below is verbatim from an archived copy of the original and links to the official page. pstack links point to one pinned commit, so the quoted lines stay where they were. Where a claim is our judgment rather than a source's, we say so. Terms such as *owner*, *gap check* and *decision list* have one meaning each; see the [glossary](glossary.md).

## 1. The problem and the bet

Coding agents can now write most of the code for a change. The slow part has moved to the people around them. OpenAI's team put it plainly: "As code throughput increased, our bottleneck became human QA capacity." ([Harness engineering](https://openai.com/index/harness-engineering/))

In practice, people get pulled in at two kinds of moment:

- **The agent stops to ask.** Many of its questions are ones the code, the docs or a quick experiment could answer.
- **Someone has to check the result.** An agent that judges its own work tends to approve it. Anthropic: "When asked to evaluate work they've produced, agents tend to respond by confidently praising the work—even when, to a human observer, the quality is obviously mediocre." ([Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps))

**The bet is a self-verifying loop.** People define the work at the start and decide at the end. In between, one agent, the owner, does the work and proves its own result: it starts the app, drives it from the entry points users actually use, observes what happens, and keeps the evidence. Before anyone is asked to merge, a model from another family reviews the final code and then verifies it independently, while the owner runs its own final check. Lauren Tan describes the same idea: an agent with verification "can keep going until it succeeds at its task, because it can now close the loop without you being the bottleneck." ([The Complete Guide to pstack Pt. 1](https://x.com/i/article/2094151284949688320))

The workflow has four stages:

| Stage | What happens | Skill |
|---|---|---|
| A. Repository readiness | Agents can start, drive and observe the app: control commands, a feature map, a smoke set, quality commands | Per repository |
| B. Definition | Questions until the decisions are made; then spec and verify, a gap check by another model family, one confirmation, freeze, handoff | core-grill, then core-spec |
| C. Delivery | One owner has another family preview how the plan will be judged, implements and runs the scenarios at each milestone, has another family review the code and then give an independent verdict, and brings the MR to mergeable | deliver |
| D. Feedback | Gaps found during delivery go back into stage A or into the Skills | By hand |

The person takes part at three points only:

1. Answering core-grill's questions and confirming its decision summary.
2. Confirming spec and verify once, at freeze.
3. Reading the decision list at the top of the MR and merging.

Between the first two, core-spec may ask a few more questions: only when it finds behavior that would change how a scenario is judged and the person's earlier answers do not settle it. After freeze, nothing is asked until merge.

**What the bet costs (our judgment).** A wrong default decision is found only at merge time, and reworking it may cost more than one question would have. We reduce this in three ways. The owner asks another model family before making decisions that affect the result. The decision list is sorted by impact. And each entry says what would change if it were overturned and which scenarios would need to run again.

## 2. What OpenAI, Anthropic and Lauren Tan agree on

The three sources come from different places: a team that shipped an internal beta with no hand-written code, a model vendor's guidance, and one engineer's own toolkit. On the points below they agree. Each point has one or two quotes; the other sources are linked.

### Describe outcomes, constraints and evidence, not steps

- Anthropic: "State outcomes, constraints, and how to verify; keep numbered steps only where order truly matters" ([prompt-audit](https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/prompt-audit.md)).
- OpenAI: "Anchor the plan with observable outcomes." ([ExecPlan](https://cookbook.openai.com/articles/codex_exec_plans))
- Lauren Tan's guide opens the same way: give the agent a goal and a way to check it ([pstack guide](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/docs/guide/README.md)).

### Keep few boundaries, and make them real

- OpenAI: "When everything is “important,” nothing is." ([Harness engineering](https://openai.com/index/harness-engineering/))
- Anthropic warns that this cuts both ways: "inflated emphasis causes over-triggering and rigid behavior, while leftover hedges ("try to", "if possible") are now read literally as permission to under-deliver." ([prompt-audit](https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/prompt-audit.md))
- OpenAI's prompting guide says to focus on the one or two boundaries that matter most ([Prompting](https://learn.chatgpt.com/docs/prompting)). Lauren Tan keeps only prose that changes a decision ([authoring-a-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md)).

### Enforce by mechanism what must always happen

- OpenAI: "When documentation falls short, we promote the rule into code" ([Harness engineering](https://openai.com/index/harness-engineering/)).
- Lauren Tan: "Encode recurring fixes in mechanisms (tools, code, metadata, automation) instead of textual instructions." ([principle-encode-lessons-in-structure](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-encode-lessons-in-structure/SKILL.md))
- Anthropic says the same about hooks versus instructions ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)) and in prompt-audit's rule to enforce in code what code can enforce ([prompt-audit](https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/prompt-audit.md)).

### Check the real thing, at the real interface

- Anthropic: Claude did well at end-to-end checks "once explicitly prompted to use browser automation tools and do all testing as a human user would." ([Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents))
- Lauren Tan: "Verify every task output by checking the real thing directly. Do not infer from proxies, self-reports, or "it compiles."" ([principle-prove-it-works](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-prove-it-works/SKILL.md))
- OpenAI made the app bootable per git worktree so the agent could drive one instance per change ([Harness engineering](https://openai.com/index/harness-engineering/)).

### The author should not be the only judge

- Anthropic: "Separating the agent doing the work from the agent judging it proves to be a strong lever to address this issue." ([Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps))
- Lauren Tan: "Safe means a verdict from an agent that did not write the code. CI green is not a verdict, and an approving bot review is not a verdict." ([shipping](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/shipping.md))
- OpenAI has Codex request additional agent reviews and has moved almost all review to agent-to-agent ([Harness engineering](https://openai.com/index/harness-engineering/)).

### Let the agent finish; ask people only what only people can answer

- OpenAI: "Escalate to a human only when judgment is required" ([Harness engineering](https://openai.com/index/harness-engineering/)). The ExecPlan guide says: "Resolve ambiguities autonomously, and commit frequently." ([ExecPlan](https://cookbook.openai.com/articles/codex_exec_plans))
- Lauren Tan: "Make reasonable decisions, proceed, and let the human course-correct after the fact." ([principle-never-block-on-the-human](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-never-block-on-the-human/SKILL.md))
- Anthropic's suggested prompt pauses only for destructive or irreversible actions, real scope changes, or input only the user can give ([Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5)).

### Keep the state of long work on disk

- OpenAI: "it should always be possible to restart from _only_ the ExecPlan and no other work." ([ExecPlan](https://cookbook.openai.com/articles/codex_exec_plans))
- Anthropic: a new session needs "a way for agents to quickly understand the state of work when starting with a fresh context window, which is accomplished with the claude-progress.txt file alongside the git history." ([Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents))
- Lauren Tan's orchestrate playbook keeps a run's state in files (units, a verification ledger, a decision trail) and derives status from them instead of narrating it ([orchestrate](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/orchestrate.md)).

### Change instructions by experiment, not by reflex

- OpenAI: "Do not turn a particular example, past failure, or personal preference into a universal requirement." ([skill-creator](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/skill-creator/SKILL.md))
- Anthropic: "Asking the model whether it needs an instruction is not a measurement." ([prompt-audit](https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/prompt-audit.md))
- Lauren Tan: in one pstack change she cut 19 instructions, and each cut "held up in A/B runs on tasks that exercise it, with and without the text." One line that no A/B task exercised was kept ([cursor/plugins#419](https://github.com/cursor/plugins/pull/419)).

## 3. Where they disagree, and what this workflow chose

The agreements set the direction. The disagreements are where we had to choose.

| Question | OpenAI | Anthropic | Lauren Tan | This workflow |
|---|---|---|---|---|
| Is there a written definition before code? | Spec, plan, constraints and status in Markdown files; the plan is a living ExecPlan | Interview, then "write a complete spec to SPEC.md", then a fresh session ([best practices](https://code.claude.com/docs/en/best-practices)). In the long-running harness, the spec stayed at product level and left the path to the agents ([Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)) | No up-front spec: "personally, i don't believe in planning. the best spec is code." ([pstack README](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/README.md)). The agent gets runnable checks instead | A written spec and verify, confirmed once and frozen. Nobody is watching during delivery, so the frozen files are what "done" means. Lauren Tan's runnable checks become verify's scenarios |
| Can the definition change during the work? | The ExecPlan is revised as work proceeds; decisions go into its Decision Log | Sprint contracts were negotiated per sprint, then removed when models improved ([Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)) | "never relax the predicate to declare victory" ([autonomous-run](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/autonomous-run.md)) | spec and verify do not change during delivery. plan.md is a living ExecPlan that the owner revises freely |
| Should the agent be told to verify? | Yes: "Validation is not optional." ([ExecPlan](https://cookbook.openai.com/articles/codex_exec_plans)) | The guides differ by model. For one model: remove explicit verification instructions, because they "cause over-verification" ([Prompting Claude Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5)). For another: fresh-context verifier subagents. For a third: run real checks and "don't launch reviewer sub-agents unless the user asked for a review" ([Prompting Claude Sonnet 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5)) | Delegate the verdict to a non-author | No generic instruction to check the work. Instead, an evidence requirement: every scenario runs on the final code, and a non-author on another model family gives the verdict |
| Who decides to use subagents? | Codex delegates "when you ask directly or when applicable `AGENTS.md` or skill instructions request it" ([Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)) | Do not self-dispatch reviewers unless asked | An explicit model per role, configurable at setup ([poteto-mode](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/SKILL.md)); code-coupled work goes to one owner, and a unit's verifier runs on a different model family | The Skill names the subagent roles; the owner chooses. Since v0.32, the role decides the agent type, and each machine's agent definitions decide the model (see deliver below) |
| Should instructions give reasons? | We found no direct statement in the OpenAI sources we read | "Give the reason, not only the request" ([Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5)) | "Tell it to do the thing and skip the reason." ([authoring-a-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md)) | Each real boundary carries a one-line reason. Elsewhere, write a reason only when the model could not guess it, such as the reason behind a project's own choice |
| How much background? | "Include only information that changes its decisions or improves its work." ([skill-creator](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/skill-creator/SKILL.md)) | prompt-audit's keep list: "give the model more context than seems necessary, not less." ([prompt-audit](https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/prompt-audit.md)) | Only prose that changes a decision | Cut behavior constraints, not background. Facts about the task and the repository stay |
| Scripts or text? | Text by default: scripts "only when correctness, safety, permissions, or a genuinely fragile workflow requires them" ([skill-creator](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/skill-creator/SKILL.md)) | Hooks and scripts for what must always happen | "Default to building the lever." ([principle-build-the-lever](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-build-the-lever/SKILL.md)) | What must happen every time goes to a script, but only checks on results (section 6) |
| When does the agent stop for a person? | Only when judgment is required | Destructive or irreversible actions, real scope change, input only the user can give. For unattended runs, "keep your own confirmation step for risky or irreversible actions" ([Prompting Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5)) | "**Always pause** for irreversible writes" ([poteto-mode](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/SKILL.md)). Under a full-autonomy grant, a call only the operator can make gets a default, reported with "the one word that reverses it" ([poteto-mode](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/SKILL.md)) | Lauren Tan's version. The owner stops only before irreversible operations. A scope or product question is decided, recorded in the decision list and reviewed at merge |
| How are long runs kept on track? | One uninterrupted run of about 25 hours, guided by spec, plan and status files in Markdown ([long-horizon post](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex)) | A progress file and a feature list ([Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)); for unattended runs, stop after "two or three automatic continuations on the same task" ([Prompting Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5)) | Run state kept in files (units, a verification ledger, a decision trail), with status derived from them ([orchestrate](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/orchestrate.md)) | One owner, resumable from plan.md and git alone. Independent verification runs in fixed-length cycles, resumed in the same session |

In short:

- **The skeleton is mostly OpenAI's:** one agent owns the change end to end, keeps a living plan, and does not wait on people.
- **The layering of checks is Anthropic's and Lauren Tan's:** a separate judge, fresh context, and a verifier from another family.
- **The stopping rule is Lauren Tan's:** pause only before irreversible writes, and decide everything else with a default that is reported.
- **The prompt style is also Anthropic's and Lauren Tan's:** few boundaries, no rituals, and changes tested by runs.
- **Freezing spec and verify for the whole delivery is our own addition.**

## 4. What this workflow adds that none of them do

As far as we found in these sources, three things are new. Each has close neighbours, listed so you can judge for yourself.

**1. A human-confirmed acceptance contract, locked by a script for the whole delivery.**

- The person confirms spec and verify once. A script prints their sha256 values, which go into the handoff commit as trailers.
- The delivery check fails if either file has changed since. The owner cannot edit them: a wrong fact or an unjudgeable checkpoint goes into the decision list instead.

Neighbours:

- Anthropic's long-running harness let agents change only a `passes` field in the feature list, with the instruction "It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality." ([Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents))
- Anthropic's sprint contracts were agreed between agents before each sprint, then dropped ([Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)).
- Lauren Tan says to "never relax the predicate" ([autonomous-run](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/autonomous-run.md)).
- OpenAI's ExecPlan goes the other way: the plan changes and the change is logged.

None of these, as far as we found, combines human confirmation, a hash check and a ban on edits for the full run.

**2. Acceptance scenarios that must be able to fail, written before plan and code.**

Each scenario in verify.md records:

- a *baseline expectation*: what the old code shows;
- a *decoy implementation*: a plausible wrong implementation the checks must reject, written out when the old code does not already cover a key risk.

Every entry point gets a scenario or a stated reason why it needs none.

Neighbours:

- Lauren Tan's verifiers compare "parent versus head" ([shipping](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/shipping.md)).
- Some of her Skill cuts were tested on diffs with planted issues ([cursor/plugins#419](https://github.com/cursor/plugins/pull/419)).

We did not find these ideas written into the fields of an acceptance document.

**3. A cross-family gap check of the definition, before any code.**

- A model from another family reads spec, verify, the source agreements and the repository in a new session, without the author's reasoning.
- It reports gaps that would make delivery wrong or impossible to judge.
- It compares clause by clause: a script numbers the spec's clauses, and the report maps each clause to the requirements in verify and counts the clauses with none.
- It also checks every existing fact the documents mention against the code: shortcuts, copy, entry names, defaults and settings.

Neighbours:

- Lauren Tan runs a unit's verifier on another model family, and gets second opinions from a different model ([orchestrate](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/orchestrate.md), [poteto-mode](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/SKILL.md)). Both look at work, not at a definition.
- Her architect skill uses several model families before code: each sketches a competing design (types, signatures, module boundaries), and the best parts are merged ([architect](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/architect/SKILL.md)). That produces a design; it does not check a written definition for gaps.
- She explicitly avoids adversarial review of plans: "I never bother with reviewing abstract plans adversarially." ([The Complete Guide to pstack Pt. 2](https://x.com/poteto/article/2097732320606507506))

Our judgment is that a frozen acceptance contract is not an abstract plan. The gap check reads concrete scenarios against the real repository, and reports only problems that would make delivery wrong. We have not tested this against her objection at scale.

**Borrowed, not new.** Some parts may look new but come from the sources:

- the decision list (ExecPlan's Decision Log, plus Lauren Tan's default with a reversing word);
- asking another model about a decision (Lauren Tan's second opinion);
- tying a verdict to a head SHA (Lauren Tan's shipping playbook);
- stopping only before irreversible operations (Lauren Tan, close to OpenAI and Anthropic).

## 5. Rule-by-rule basis

Each table lists a Skill's rules in short paraphrase, the principle or failure each rule answers, and the sources. "Our runs" means something we saw in our own work: making an existing feature drivable from its user entry points (stage A), or delivering the first or the second real requirement with earlier versions of these Skills (section 7). "Our design" means no source states the rule directly.

### core-grill

[core-grill](../skills/core-grill/SKILL.md) asks the person questions until the decisions are made, then hands a confirmed decision summary to core-spec. It was adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT) but does not depend on it: upstream asks about every branch, while core-grill asks only about decisions that change what the user sees.

| Rule | Why | Sources |
|---|---|---|
| Collect four inputs first: goal, done criteria, authorization, scope. Look up what the repository or platform can answer | An unattended run needs the goal, the finish line and the permissions up front | "A good handoff has the goal, the finish condition, permissions, and an escape hatch." ([pstack guide](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/docs/guide/07-overnight.md)); the model "performs best when given the complete task specification up front" ([Prompting Claude Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5)) |
| Ask in numbered rounds. Each round holds every question whose premises are decided, with options, consequences and a recommendation | Fewer round trips; a recommendation makes each answer cheap | Interview first, then write the spec ([best practices](https://code.claude.com/docs/en/best-practices)); the rounds are our design |
| Ask only about decisions that change what the user sees: UI and interaction, copy, defaults, entry points, data loss, coexistence with existing features. The rest become default decisions, each with a reason and a way to overturn it | Every extra question waits on a person | "Reserve the question for a genuine product or preference call no experiment can settle." ([poteto-mode](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/SKILL.md)) |
| Find facts yourself, with subagents if useful. Point out where the user's account conflicts with the code | A question the code can answer wastes the person's time; a wrong premise becomes a wrong spec | "Interview the repo, not the user" ([create-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/SKILL.md)) |
| Settled terms go into `CONTEXT.md`. Write an ADR only when a decision is costly to reverse, surprising without context, and a real trade-off | Durable knowledge in the repository, without noise | Adapted from mattpocock/skills; "give Codex a map, not a 1,000-page instruction manual." ([Harness engineering](https://openai.com/index/harness-engineering/)) |
| End with one decision summary: the four inputs, the answered decisions in the user's own words, and the default decisions. Confirming it confirms the defaults | One confirmation point; the summary becomes the source agreements for the gap check | Our design |

### core-spec

[core-spec](../skills/core-spec/SKILL.md) turns the decisions into `spec.md` and `verify.md`, has another family check them, and hands them off frozen. The verify rules are in [verify.md](../skills/core-spec/references/verify.md).

| Rule | Why | Sources |
|---|---|---|
| Find the final agreements. Code can confirm the current state but cannot decide the target behavior. Suggestions and drafts keep their status | A suggestion or a stale draft silently becoming a requirement | Our design |
| Keep constraints, not implementation advice | Wrong detail in a spec spreads into the code | Anthropic kept its planner at product level because errors in a detailed spec "would cascade into the downstream implementation" ([Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)) |
| Write purpose, non-goals, hard constraints, and delivery and authorization. Do not fill gaps for the user | Without them an unattended agent guesses, widens the scope, or stops | The handoff elements in the [pstack guide](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/docs/guide/07-overnight.md); a real scope change is one of Anthropic's pause reasons ([Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5)), so non-goals settle it in advance |
| Pyramid: three to five core decisions, then the full rules | The person scans; the agent needs every rule | "put the most important instructions near the top of `SKILL.md`." ([Claude Code skills](https://code.claude.com/docs/en/skills)), applied to specs |
| Test completeness by counterexample: could a reasonable implementation fit the text yet break a confirmed agreement? No separate author self-review | Text that reads as complete but admits a wrong implementation | "Self-review is not a substitute." ([show-me-your-work](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/show-me-your-work/SKILL.md)) |
| Walk every entry point and state (default, loading, empty, error, disabled, cancel, repeat, concurrency, after restart), using the feature map if there is one, after first bringing the map for these features in line with the product | Behavior defined only for the convenient entry point; entry points missed because the map is stale | Lauren Tan's Feature Map ([Pt. 1](https://x.com/i/article/2094151284949688320)); "A feature map rots the moment the app changes." ([maintain-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/maintain-verification-skill/SKILL.md)); our runs (v0.15) |
| Write verify before plan and code | Omissions in plan or code cannot shrink the acceptance scope | Agreeing "on what "done" looked like for that chunk of work before any code was written." ([Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)) |
| verify: scenarios run from the entry points users use; internal setters only set up preconditions. The proof fits the change type: exit code, in-app flow, read-back from another view, replay of real inputs, run on the target, baseline measurement | Checks that pass on internals or proxies while the product is broken | "Every serious project needs a scripted way to drive the real app and prove behavior" ([create-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/SKILL.md)); "Have Claude show evidence rather than asserting success" ([best practices](https://code.claude.com/docs/en/best-practices)) |
| verify: assertions must be able to fail. Literal values from the spec; each must-not-appear item paired with a positive check; ask whether it would pass if the implementation did nothing | Checks that always pass | "Now the agent has three checks it can run, not a mood to satisfy." ([pstack guide](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/docs/guide/06-verify-and-ship.md)) |
| verify: a baseline expectation per scenario, and a decoy implementation for risks the baseline misses | A scenario for new or changed behavior that passes on unchanged code proves nothing; one for behavior that must be kept passes both before and after | Parent-versus-head verdicts ([shipping](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/shipping.md)); the fields are our addition (section 4) |
| verify: every entry point gets a scenario or a reason. Constrain only what the spec says. List tooling gaps and coverage blind spots; each blind spot names the test or check that judges it instead, and its checkpoints are reported as UNVERIFIED | Silent gaps reported as passes; blind spots that nothing judges; invented requirements | "Only if no real check can run here, say which one you did not run and why instead of reporting the change as done." ([Prompting Claude Sonnet 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5)) |
| Gap check by another family in a new session, with spec, verify, source agreements and the repository, but not the author's reasoning. It reports only, for at most two rounds over the author's revisions, and checks existing facts against the code. When the user's answers change requirements, one more check covers the changed clauses, so the version sent for freezing has always been checked. It also reports over-specification, and a finding is added only when a wrong implementation would otherwise pass It gets the spec's clause list from `clauses.mjs`, compares clause by clause rather than section by section, and attaches a table mapping each clause to requirements | Authors miss their own omissions; one family shares blind spots. A section that already has some requirements looks covered: on the second real requirement's spec, a section-by-section check reported none of six known missing clauses, and the clause list with the mapping table reported all six. A check that looks only for omissions makes verify grow: on a later requirement all 24 findings of two rounds were adopted, verify reached 641 lines, and a subtraction review then removed a third of it without losing discriminating power. On another, the user's last answer added and changed requirements after the second round, and that version was frozen unchecked | "Run a unit's verifier on a different model family from its worker." ([orchestrate](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/orchestrate.md)); "tuning a standalone evaluator to be skeptical turns out to be far more tractable than making a generator critical of its own work" ([Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)); "every component in a harness encodes an assumption about what the model can't do on its own, and those assumptions are worth stress testing" ([Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)); "Subtraction comes before scaffolding." ([principle-foundational-thinking](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-foundational-thinking/SKILL.md)); our runs (v0.30, 2026-10-08) |
| If no other family is available, try another CLI. Otherwise record the gap check as not done and do not ask for freeze, unless the user relaxes this | A same-family check passed off as independent | Our design |
| `freeze.mjs` prints the sha256 values for the one confirmation; never copy them by hand | Confirming one version and handing off another | Hooks "are deterministic and guarantee the action happens." ([best practices](https://code.claude.com/docs/en/best-practices)) |
| A handoff commit with only spec and verify and the `Frozen-Spec` and `Frozen-Verify` trailers, then a Draft MR. If pushing is not allowed, local paths and hashes | deliver can start in any worktree from the MR link | Our runs (v0.16) |

### deliver

[deliver](../skills/deliver/SKILL.md) takes the frozen spec and verify to a mergeable MR.

| Rule | Why | Sources |
|---|---|---|
| One owner to a mergeable MR. After the handoff, only the owner writes to the feature branch | Handoffs between agents lose information, and nobody owns the whole | "Codex can end-to-end drive a new feature" ([Harness engineering](https://openai.com/index/harness-engineering/)); "Code-coupled work (one feature, one migration) goes to a single owner with the checkpoint inline." ([feature](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/feature.md)) |
| Never stop, except before irreversible operations: merge, force-push a shared branch, delete shared data, send messages outside, change a shared environment | Waiting costs more than correcting at merge. In the second real requirement, none of the stops was an open product question | "corrections are cheap, and waiting is expensive." ([Harness engineering](https://openai.com/index/harness-engineering/)); poteto-mode's "Always pause" rule ([poteto-mode](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/SKILL.md), section 3) |
| For work it cannot do, write why and what was tried, finish the rest, and list it | One blocked part stalls the rest | "If one part turns out to be blocked, complete every other part in full and say exactly what you left out and why" ([Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1)) |
| Before a decision that affects the visible result or the acceptance judgment, ask another family read-only, without the owner's preference. One more round if they disagree, then the owner decides. Implementation choices are decided alone | One model's blind spot becoming a product decision nobody saw | "A second opinion is the same prompt against a different model. Agreement is high-signal." ([poteto-mode](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/SKILL.md)) |
| A decision list at the top of plan.md and the MR, sorted by impact: product choices, changed judging methods, fact corrections, parts not done. Each entry gives the reason, the other model's view, what changes if overturned, and which scenarios to rerun | The person cannot see what was decided for them | "Record all decisions in the `Decision Log` section." ([ExecPlan](https://cookbook.openai.com/articles/codex_exec_plans)); a default reported with "the one word that reverses it" ([poteto-mode](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/SKILL.md)) |
| spec and verify never change during delivery | An agent relaxing acceptance to finish. In the second real requirement, a misstated existing shortcut led to two stops and a second freeze | [autonomous-run](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/autonomous-run.md)'s "never relax the predicate"; Anthropic's rule against editing tests (section 4) |
| Start with `check-delivery.mjs --frozen`. Keep plan.md as an ExecPlan, resumable from plan.md and git alone | Building on edited acceptance files; losing the thread after an interruption | [ExecPlan](https://cookbook.openai.com/articles/codex_exec_plans) |
| Before the first milestone, another family reads plan.md against verify and the verifier brief, read-only: how the final verification will judge each done criterion and coverage blind spot, and where the plan would fail or could not be judged. Its view is handled like a decision during delivery. verify does not change, and nothing beyond verify is adopted | Substitute tests and missing verification capability found only at the end. In the second real requirement, the rule that every blind spot's substitute test must pass was first noticed in the fourth verification cycle, and the missing tests were written on the critical path. On that requirement's plan, the preview found 21 blind spots with nothing scheduled, in 3.5 minutes | "The pilot exists to falsify the brief template, the verify recipe, and the unit size while that costs one agent instead of fifty." ([orchestrate](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/orchestrate.md)); Anthropic's sprint contracts agreed on "done" before any code ([Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)); our runs (v0.34) |
| At each milestone, run its scenarios on the running app from the written entry points, plus the quality commands. Fill missing verification capability minimally and reusably. Keep the evidence | Failures piling up at the end | "Run validation after each milestone (fix failures immediately)" ([long-horizon post](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex)); "what capability is missing, and how do we make it both legible and enforceable for the agent?" ([Harness engineering](https://openai.com/index/harness-engineering/)) |
| After each milestone, a fresh-context subagent checks it against the spec and reports only, including the substitute tests for the blind spots this milestone covers | Late discovery forces reruns. In the first real requirement, one milestone check was put off until the next milestone was done, and all three entry points were rerun | "Separate, fresh-context verifier subagents tend to outperform self-critique." ([Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5)) |
| Subagents by role. Code, integration and milestone checks inherit the owner's model and effort. Running scenarios, collecting evidence and reading logs may go to a runner type, which can use a smaller model. The machine's agent definitions pick the models | Checks silently on a weaker model; model IDs in Skill text that nothing enforces | "Call-mechanics instructions in skill prose do not change agent behavior" ([pstack commit for #167](https://github.com/cursor/plugins/commit/04166ac89136d36de2a87f24429e6cc307594953)); with no model configured, a Codex subagent "inherits the parent agent's model and reasoning effort." ([Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)) |
| Before independent verification, another family reviews the code read-only against the spec and the decision list, without starting the app and without a verdict. The owner checks each finding against the code, fixes those that hold with a test that fails before the fix and passes after it, writes why for the rest, and fixes one round only | A code problem found during independent verification means verifying a new head again | Codex is told to "request additional specific agent reviews both locally and in the cloud" ([Harness engineering](https://openai.com/index/harness-engineering/)); pstack triages a review bot's findings the same way: "Verify each claim against the code" ([babysit](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/babysit.md)); one round is our design (v0.34) |
| The owner's full self-verification and independent verification by another family start at the same time, on the same head: a separate session, a dedicated checkout of the head, and each side its own app instance (profile, port, data directory). The verifier reports only. It runs in fixed-length cycles, resumed in the same session | The author approving its own work; agents interfering through one instance; findings delayed by waiting for the owner's run. In the second real requirement, starting the other family without waiting brought its findings about three hours earlier, and the owner's run found no product problem it had missed; our runs, where a time limit was taken for a CLI failure | [Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps); the [shipping](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/shipping.md) and [orchestrate](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/orchestrate.md) playbooks; "At that SHA, fan out parallel independent verifiers" ([autopilot-full](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/autopilot-full.md)); one app instance per change ([Harness engineering](https://openai.com/index/harness-engineering/)); our runs (v0.33) |
| Re-verify after code changes, but not after changes only to Markdown, tests, or the plan and evidence | Stale verdicts, or full reruns for a typo | "Record the verdict head SHA, base SHA, and stable `git patch-id` of that PR's base-to-head diff." ([shipping](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/shipping.md)); the file-type rule is our simplification |
| Code quality and test coverage comments do not change the verdict. The owner fixes each or explains in the MR | Style comments blocking a correct change, or being ignored | Our design |
| Done means: every item of verify's done criteria is met on the final code (smoke set, regression scope and all scenarios pass; blind-spot checkpoints are UNVERIFIED and their substitute tests run and pass), and the quality commands pass; another family gives PASS; the result check passes on the real MR head; Draft removed, CI green, every review comment answered | A finish line the agent can check itself | "Give the agent a goal and a way to check it" ([pstack guide](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/docs/guide/README.md)) |
| One result check, [`check-delivery.mjs`](../skills/deliver/scripts/check-delivery.mjs): frozen files match the handoff hashes; the report's head is the MR head, or an ancestor followed only by Markdown, test or plan changes; `verdict: PASS`; the verifier's family differs from the owner's | The two things that must happen every time and are easiest to skip | "Enforce in code what can be enforced in code; delete what nothing enforces and nobody misses" ([prompt-audit](https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/prompt-audit.md)); "A deterministic script turns "trust me" into "run this"." ([principle-build-the-lever](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-build-the-lever/SKILL.md)) |
| Fix only CI failures this change caused or that block delivery. A review comment asking to change spec-defined behavior goes to the decision list. Wait for long tasks in the background | Scope creep; a reviewer overriding the person's decisions; polling | Our design |

## 6. How the Skills are written

The Skills follow [agent-prompt-rules](../skills/agent-prompt-rules/SKILL.md), our rules for writing prompts, multi-agent pipelines and SKILL.md files. Four ideas carry most of the weight.

**Outcomes and boundaries, not steps.**

- Say what done looks like and how it will be checked. Give each real boundary a one-line reason, and write down the reasons behind project choices the model could not guess.
- Do not prescribe the method, and do not ask the agent to retell its reasoning.
- Put the most important rules at the top. Say each thing once. Write only what the model would not know.

Sources:

- "For open-ended work, describe the outcome and relevant decision criteria." ([skill-creator](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/skill-creator/SKILL.md))
- "Only add context Claude doesn't already have." ([Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices))
- Lauren Tan's [authoring-a-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md) playbook.

**Enforce in code what code can enforce.**

- If something must happen every time, a script or hook does it, and the text does not repeat it.
- Lauren Tan states the corollary sharply: "If the fix is structural, only use the structural fix. The instruction is the symptom." ([principle-encode-lessons-in-structure](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-encode-lessons-in-structure/SKILL.md))
- This is why core-spec ships `freeze.mjs` and deliver ships `check-delivery.mjs`.

**Check results, not process.**

- Scripts check what was delivered: frozen files unchanged, the final head verified by another family. They do not check the order in which the agent did things. core-spec's `clauses.mjs` only numbers the spec's clauses for the gap check; it checks and blocks nothing.
- Anthropic removed its per-sprint structure once models improved: "I started by removing the sprint construct entirely." ([Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps))
- Lauren Tan records each verdict with the head SHA it was given for ([shipping](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/shipping.md)).
- As far as we found, none of the three sources uses a script to check the order in which an agent did its work. Section 7 shows what happened when we tried.

**Deletions are hypotheses, tested by runs.**

- Every instruction encodes an assumption about what the model cannot do. Anthropic: "every component in a harness encodes an assumption about what the model can't do on its own, and those assumptions are worth stress testing, both because they may be incorrect, and because they can quickly go stale as models improve." ([Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps))
- prompt-audit's last step is titled "removal is a hypothesis, not a conclusion". It also lists "Patch accretion" as a failure: "many narrow conditionals, each traceable to one incident" ([prompt-audit](https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/prompt-audit.md)).
- Lauren Tan: "A skill edit affects every future session, so test it like the experiment it is" ([make it yours](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/docs/guide/09-make-it-yours.md)).
- We change one component at a time, record the basis for each change, and compare in a new session.

## 7. How it got here

The workflow went from v0.1 to v0.35 in ten days. The main turns are below. Versions are from our own change log; "real requirement" means a real product change delivered end to end with the Skills of the time.

| Version | What changed | Why |
|---|---|---|
| v0.1–v0.4 | spec, verify and plan written in one questioning session, then a cross review in a new session. The spec was the single source of truth, with a separate Skill for verify | The starting point |
| v0.4–v0.5 | The self-verifying loop chosen as the direction. End-to-end scenarios became the unit of acceptance | OpenAI's and Anthropic's long-running harnesses, and Lauren Tan's workflow |
| v0.7 | Rebuilt from scratch on the three sources. The person defines spec and verify at the start, as completely as possible; after that, everything runs on its own to one MR | A deliberate restart: keep only what the three sources support, and ask the person as little as possible |
| v0.8 | Stages A to D. The gap check moved to another model family in a new session. Every milestone runs its scenarios in the app | Cross-family checking; results over speed |
| v0.9 | spec gained purpose, non-goals, hard constraints, and delivery and authorization. deliver was created. sha256 made the definition read-only | An unattended owner needs these to decide without asking |
| v0.10 | spec and verify merged into one Skill, still two files | None of the three sources separates writing a spec from writing its acceptance |
| v0.12 | Milestone checks by a subagent that inherits the owner's model; final verification by another family in a separate session | Milestone checks are cheap and frequent; the final verdict is the last gate, so it goes to another family |
| v0.15 | User-visible behavior must be verified at the entry points users use, here a TUI and a desktop app; API checks only add to them | Adding those entry points surfaced five product problems that were visible only there |
| v0.16 | Handoff through a Draft MR on the feature branch | The first real requirement: deliver no longer has to run in the worktree that wrote the spec |
| v0.17–v0.24 | Each problem found in a run got a paragraph of text and a script. deliver's text grew from 4,687 characters (the version merged at v0.15) to 7,945 (measured on the Chinese text), and its scripts grew from 3 to 11 | In the first real requirement, one milestone check was put off until the next milestone was done, so all three entry points were rerun. The answer at the time was a script that checked the order of milestone checks |
| (same period) | The process gates kept failing in the second real requirement | Milestone records broke under rebase. An owner could re-hand off edited acceptance files itself and still pass every mechanical check. Three stops for the person were mismatches between checkpoint wording and the observation tool, not product questions. A hand-picked rerun missed a scenario. A review found the gates still passed with 20 items missing from a verification report, and a verification time limit was treated as a CLI failure |
| v0.25–v0.27 | Everything the workflow needs moved into this repository. core-grill was brought in as its own Skill | Upstream asks about every branch, the opposite of core-grill's boundary; depending on it would give the model two contradicting instructions |
| v0.28 | Quality and coverage comments no longer block the verdict. Verification runs in fixed-length cycles, resumed in the same session | Quality comments need owner handling, not a gate; a cycle ending is not a failure |
| v0.29 | Never stop except before irreversible operations. Decision list at the top. Ask another family before decisions. A light process | Lauren Tan's rule to always pause for irreversible writes, and to decide everything else with a default. The stops so far had not been product questions |
| v0.30–v0.31 | One result check. deliver's text was cut by more than half (7,945 to 2,986 characters, measured on the original Chinese text). Scripts went from 11 to 1 (236 lines), and its 20 test cases run in CI. The gap check gained the existing-facts check | The process checks missed real gaps and blocked valid work. A misstated existing shortcut had caused stops and a second freeze |
| v0.32 | Subagents chosen by role. Skills name roles and agent types, not model IDs | In the second real requirement, the owner and every subagent ran on one top model; only execution work should move to a smaller one. pstack's #167 made a similar cut: model choice lives in configuration, not in Skill prose |
| v0.33–v0.35 | Constraints at both ends. At the start of delivery, another family previews how the plan will be judged; before independent verification, it reviews the code read-only and the owner fixes one round; the owner's final self-verification runs at the same time as independent verification. The gap check compares clause by clause. All text changes; the only new script lists clauses and blocks nothing | The review of the second real requirement: what the final verification would check was learned only at the end; the other family's findings came earlier when nobody waited for the owner's run; a section-by-section gap check missed clauses. The person set the premise: settle results and boundaries at the start and the end, leave the middle to the model, and avoid rigid script checks |

Three lessons stand out (our judgment):

- **Process gates grew faster than they helped.** Each one answered a real failure, but the rules began to contradict each other in places, and the gates still missed failures that mattered. A single check on results replaced them.
- **Stopping to ask cost more than it saved.** Most stops were not product questions. Recording a decision and reviewing it at merge time cost less.
- **Entry points matter more than coverage counts.** The problems that would have reached users were found by driving the product the way users do.

## Read next

- The Skills: [core-grill](../skills/core-grill/SKILL.md), [core-spec](../skills/core-spec/SKILL.md) and its [verify rules](../skills/core-spec/references/verify.md), [deliver](../skills/deliver/SKILL.md), and the [delivery check](../skills/deliver/scripts/check-delivery.mjs).
- The prompt rules: [agent-prompt-rules](../skills/agent-prompt-rules/SKILL.md).
- Terms: [glossary](glossary.md).
