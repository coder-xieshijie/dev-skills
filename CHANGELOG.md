# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The version lives in [.claude-plugin/plugin.json](.claude-plugin/plugin.json), and plugins installed in Claude Code stay on it until it changes. Raise it whenever a change to `skills/` or `.claude-plugin/` should reach installed users: the patch number for fixes and wording, the minor number for new Skills or changed workflow rules. Changes to the README or `docs/` alone need no new version.

## [Unreleased]

## [0.12.0] - 2026-10-20

### Changed

- **deliver**: when the same requirement fails in a second round of independent verification, the owner lists every place in the code the requirement applies to, following the calls inside each component it names rather than stopping at their entry points, and checks each one before the next round, with the verifier's probes from the evidence directory or the same method, instead of fixing only the places the report names. When the list has no end because the requirement does not say how far down the calls it applies, the owner stops changing code for it as at the round limit and puts the requirement, what each round found and a proposed boundary into the decision list for the user. In the case behind this change, one requirement about calls after close failed four rounds in a row, each verifier going one layer deeper into the call chain, and each round cost about 45 to 60 minutes.

## [0.11.0] - 2026-10-19

### Changed

- **core-grill** quick-path acceptance checks each carry a baseline expectation, and a bug fix has at least one check that fails on the code before the change, run before the code changes or on a checkout of the base. Each check takes its entry point from the project's verification capability after reading what that capability records it cannot do; a check the entry point cannot reach gets another entry point that observes the same result, or is marked unverified with the reason, for the user to confirm with the summary. The evidence is each check's result and what proves it, and a check over many values runs coarse steps plus the values next to each threshold, reruns only the failing combinations while fixing, and runs the full set once on the final head. In the case behind this change, a desktop entry point that could not reach the minimum width ran for 43 minutes, and a 1-pixel width sweep was rerun in full seven times.

## [0.10.0] - 2026-10-18

### Changed

- **deliver** splits work along context rather than by kind of work: the agent that implemented a milestone also writes its scenario scripts and fixes what scenarios, checks and reviews find in that code, and is continued instead of being replaced by a new agent with a brief. New contexts go to checks that look only at results, to code search, and to parts with clean interfaces that genuinely run in parallel. Choosing the agent type by role stays as it was.

## [0.9.0] - 2026-10-18

### Changed

- **core-spec** verify writes one full scenario per behavior, at its main entry point. Another entry point the change touches gets a full scenario only when it has logic of its own for the behavior (its own state, timing, input handling or path into the code); otherwise it gets a wiring scenario that checks the new behavior is wired up there and its key result shows, and a component or integration test, a new "Test" proof method in the requirements table, proves it shows the same results. The gap check asks for this coverage and reports a full scenario at an entry point without logic of its own as over-specification. The example and the glossary follow.
- **deliver** counts a milestone done when its scenarios, the quality commands and the repository's static checks for the touched paths pass (the cheap CI jobs whose path rules match), instead of leaving those checks to the local gate at the end.
- **deliver** pushes first when every milestone is done, so CI and any automated review the repository runs on the MR work during the code review and the local gate. Independent verification starts on a head once the review comments so far are handled.
- **deliver** runs independent verification for at most three rounds; when the third does not pass, the MR stays in Draft and the failing items, their evidence and what was tried go into the decision list and the report.
- **deliver** `ci-watch.mjs` lists, when it returns, the non-system comments posted on the MR since the watched pipeline was created, with author, time, resolved state and first line.

## [0.8.3] - 2026-10-15

### Changed

- **agent-prompt-rules** 1.7: besides not asking for reasoning in the response, it says what to ask for instead (a short explanation, the evidence behind a result, or a summary of the actions taken) and lists the forms that count as reproducing reasoning, including a `reasoning` or `trace` field in JSON output or a tool input. The evidence 1.2 asks for is of the allowed kind. Cites the Refusals and fallback page, newly archived.
- **agent-prompt-rules** 4.5: a before-and-after comparison runs each request at least three times on each version and compares each case, not only the overall result. Cites OpenAI's Harness-aware evaluation of plugins, newly archived, where 21% of cases flipped across three runs of one configuration.

## [0.8.2] - 2026-10-15

### Changed

- **explain-as-fool** can now be selected by the agent as well as invoked by name, in Claude Code and Codex.

## [0.8.1] - 2026-10-15

### Changed

- **core-grill** words each question so a plain yes accepts its recommendation, and tells the user they may answer only where they choose otherwise (from upstream grilling `95249b0`).
- **core-grill** explains in one plain sentence any term a question uses that the user has not used yet, including one the agent coined.
- **core-grill** uses `GLOSSARY.md` and `GLOSSARY-MAP.md` when a repository already keeps its glossary under the names upstream adopted in `d80fa0f`; it still creates `CONTEXT.md` otherwise and renames nothing.

## [0.8.0] - 2026-10-15

### Added

- **core-grill** chooses the path with the decision summary: the quick path, core-spec at light depth, or core-spec at full depth. A requirement that stays inside one feature, has every user-visible decision answered, touches none of persistence or migration, concurrency, metering, permissions or security, or a contract shared with another repository, and is cheap to revert, can take the quick path: the summary carries 3–8 acceptance checks, and after confirmation the same session implements it, runs the checks in the app, has another family review the diff read-only, and pushes once after deliver's local gate. Meeting an unanswered decision or a risky area moves it back to core-spec.

### Changed

- **deliver** may refreeze spec and verify on its own, listing each refreeze in the decision list for review before merging, in two cases: a scenario step whose precondition no entry point can construct, on the baseline or once the spec is implemented, while the spec does not ask to change the code that blocks it, moved with its dependent checkpoints into coverage blind spots with substitute checks, after asking another family; and changes the user's agent instructions (AGENTS.md, CLAUDE.md) authorize in advance, within their conditions. Such a case used to stop the delivery at a question for the user. The verifier brief judges each refreeze against the handoff version and records one beyond these as relaxing acceptance.
- **deliver** looks at the start for what could stop it at the end (spec and verify failing the repository's checks, preconditions that cannot be reached, checkpoints the up-front review says cannot pass) and handles it then; everything else goes into the decision list, not into a question.
- **deliver** at light verification depth writes no plan.md: the decision list and progress go into the MR description, and it may continue in the session that ran core-spec. `check-delivery.mjs` takes `--plan` as optional when `--owner` is given.
- **deliver** no longer names a sensitive-word check as its example of repository content rules or static checks; such repository-specific rules belong in the user's agent instructions.
- **core-spec**, when writing verify, checks that each scenario's preconditions can be produced in the current product, not only that its entry points exist; the gap check reports a step the product stops. At light depth the gap check runs one round.

## [0.7.0] - 2026-10-14

### Changed

- **core-spec** step 5 also works the other way: it finds the existing feature map criteria, scenario scripts and tests that depend on behavior the spec changes while their purpose stays the same: those that assert a value the change alters, and those that set a budget, limit, quota or timeout only as headroom, which it searches for in scenario scripts and test setup. It settles in the spec how each is adjusted, and lists them in verify's regression scope. The gap check reports one that is left unadjusted as a missing item.
- **core-spec** step 5 extends a missing or incomplete map of a touched feature the way repo-readiness builds maps, limited to the features the spec touches; the map changes go into the requirement's MR with the handoff, and the scenario scripts they need are tooling gaps delivery fills in the same MR.
- **deliver** updates the map and scenario scripts of every feature whose user-visible behavior or entry points the change alters, whether or not the spec lists them; verify's done criteria carry this as an item when the project has feature maps, so the independent verifier judges it.

## [0.6.0] - 2026-10-14

### Added

- **merge-gate**: gates a large MR/PR before it merges. It first finds the verified head, the last head an independent verification or a previous gate passed: when only Markdown and test files changed since, it reuses that verification and stops; otherwise it covers what changed since, or the whole MR when there is none. A reviewer from another family and fresh subagents, one per area the scope needs, review it while it is verified in the app; the two sides cross-examine, and fresh checkers that see only the initial reports give the verdicts. Confirmed P0–P2 findings are fixed through sub-MRs into the source branch, merged once CI passes and the diff holds; the head is then rerun and the fix delta reviewed, for at most two recheck rounds. On an MR delivered with deliver, every runtime run is deliver's independent verification, and the gate passes only when deliver's `check-delivery.mjs` passes on the final head. It writes a gate input every brief reads (heads and scope, the head that will merge, CI on it, areas, shared-state isolation, runtime verification), adds its decisions to the MR's decision list, and keeps its evidence outside the repository. Merging the MR itself stays with the user.
- **merge-gate** `scripts/findings.mjs`: checks the findings ledger (`findings.tsv`) and counts it by severity and status; `check --final` fails while a confirmed P0–P2 is neither merged nor blocked. Its tests run in CI.

### Changed

- **deliver** verifier brief: when a merge gate changed the code after delivery, the verification input also gives the gate's decision list, judged like plan.md's.
- **core-spec** cross-model calls list merge-gate's reviews and its independent verification.

## [0.5.0] - 2026-10-11

### Changed

- **deliver** keeps the MR to the product change, spec.md, verify.md, plan.md and reusable verification capabilities. Evidence, verification inputs and reports, replies from other families and one-scenario scripts go in an evidence directory outside the repository: the location the spec names, otherwise `.deliver/<topic>/` in the worktree, excluded through `.git/info/exclude`. plan.md states conclusions without linking into it.
- **deliver** pushes only when CI should run: once when the local gate passes, right before independent verification, and again only with a code change. plan.md updates ride along with code pushes; what happens after the last push (verification results, CI, review handling) goes into the MR description.
- **deliver** runs a local gate before that push: the checks CI runs for the paths the change touches, read from the repository's CI configuration, including cheap static checks such as a sensitive-word diff.
- **deliver** gives code reading to a read-only exploring subagent that returns only its conclusion, so the owner's context stays small.
- **deliver** plan.md has no owner line and no hand-written clock times; the commit carries the time.

### Added

- **deliver** `scripts/ci-watch.mjs`: waits for the GitLab pipeline of one MR head, including a merged-result pipeline, ignores pipelines of other heads, and returns at the first failed job. On GitHub, deliver uses `gh pr checks --watch --fail-fast`. Its tests run in CI.
- **deliver** `check-delivery.mjs --owner <model ID>` gives the owner model on the command line, so plan.md does not name it; plan.md's `- owner:` line is still read when `--owner` is absent.

## [0.4.0] - 2026-10-10

### Changed

- **core-spec** writes a verification depth into verify.md's key points, `Verification depth: light` or `full` with a one-sentence reason, and the user confirms it with the freeze. Full is for work the model does not reliably get right on its own (several entry points or modules, default wiring, persistence, concurrency, metering, recovery, security, migrations, kinds of change that went wrong before) and the choice when in doubt.
- **deliver** reads the depth. At light it skips the up-front review, the milestone checks and the read-only code review; both depths end with the same independent verification. A verify without the line is delivered at full.
- **deliver** no longer has the owner run its own full self-verification beside the independent one. While the verifier runs every done-criteria check on the final head, the owner runs only the quality commands and the scenarios judged by script, and after a fix it runs the affected scenarios.
- **deliver** checks a milestone only when later milestones build on it, before they start; plan.md names those dependencies.
- **deliver** treats done criteria about the MR or the platform (Draft status, description, CI, review comments) as wrap-up items the owner checks on the platform after verification; independent verification runs while the MR is still Draft and marks them "Checked at wrap-up".

### Added

- **deliver** `scripts/stall-guard.mjs`, which runs independent verification and stops it only when it stalls: no output and no change in the evidence directory for the idle limit (default 60 minutes). It replaces the fixed 60-minute `alarm` kill in cross-model calls. Its tests run in CI.
- **repo-readiness**, a manual-only Skill for stage A. It states the end state and leaves the route to the agent: a project-local verification Skill with one isolated adapter per entry point (`up`, `doctor`, `do`, `down`); feature maps whose criteria carry IDs (`<sub-feature>#<n>`) and a Not covered section, checked against the code; scenario scripts that cite each criterion once, judged by shared primitives in five results (PASS, FAIL, BLOCKED, UNVERIFIED, TO-CONFIRM), with a counterexample run per map that gives FAIL; a structure check in CI; and a fresh session that verified a feature from the repository alone and handed back the documentation gaps it met. The kit that repositories copy is only what behaves the same everywhere: the command entry, a runner with one instance per scenario, the primitives, the structure check (which also rejects run results committed to maps or the verification Skill and warns when AGENTS.md or CLAUDE.md does not name it), `record` for entries driven by hand, a hash of itself in every run summary, and an adapter contract test each repository runs on its own adapters (`verify.mjs contract`: two instances side by side, identity, own HOME and TMPDIR, no leaked caller variables, `down` stopping only its own processes and keeping evidence). Adapters are written per repository; working examples for an HTTP service, a CLI and web pages are in `references/adapters/` and pass the contract test in CI. References give one route through the work with a check after each stage, the adapter contract and isolation, how far to build (L0 to L3), checking a map against the code, counterexample runs, and the failures behind each rule. The kit's scripts and the examples have their own tests, which CI runs.

## [0.3.0] - 2026-10-08

### Changed

- **core-spec** gap check also reports over-specification: requirements, scenarios or checks that restate implementation steps, prove again what a test or another requirement proves, or need a tool built only for acceptance. A finding adds to verify only when a wrong implementation would otherwise pass.
- **core-spec** limits the two gap-check rounds to the author's own revisions. When the user's answers add or change requirements, one more check covers the changed clauses, so the version sent for freezing has always been checked.
- **core-spec** has a starting point for behavior-preserving changes (refactoring, slimming, migration): list the kinds of unintended change, and prove equivalence by running the existing scenarios and tests on the baseline and on the new head.
- **core-grill** asks about scope, authorization and the expected gain when user-visible results must not change, and the done criteria state the gain or when to stop. It says when a recommendation departs from research in the conversation or an earlier confirmed decision, never files a decision under discussion as a default, and runs a short trial before asking about a measurable trade-off.

### Fixed

- **core-spec** `clauses.mjs` exited without writing the clause list when called through a symlink, which is how installed Skills are called.

## [0.2.1] - 2026-10-08

### Fixed

- Restore **core-grill** to manual-only invocation in Claude Code and Codex. **core-spec** remains available both manually and automatically, including after the user confirms core-grill's decision summary.

## [0.2.0] - 2026-10-08

### Changed

- **core-grill and core-spec** support both manual invocation and automatic selection by the agent in Claude Code and Codex. Their existing descriptions determine when they apply; the other Skills remain manual-only in these clients.

## [0.1.0] - 2026-10-07

The first versioned release. It records what the Skills already do after [#26](https://github.com/coder-xieshijie/dev-skills/pull/26) to [#33](https://github.com/coder-xieshijie/dev-skills/pull/33).

### Added

- **The development workflow**, three manual-only Skills:
  - **core-grill** asks in rounds about the decisions that change user-visible results, records terms, and hands a decision summary you confirmed to core-spec.
  - **core-spec** writes spec.md and verify.md, brings the related feature map in line with the product first, numbers the spec's clauses so a model from another family can gap-check verify clause by clause, and after one confirmation freezes both, commits them to the feature branch and opens a Draft PR.
  - **deliver** has one owner take the frozen spec and verify to a mergeable PR, stopping only before irreversible operations. Another family previews how the final verification will judge the plan, milestones are run in the app and checked by a fresh subagent, another family reviews the code read-only, and the owner's full self-verification runs in parallel with independent verification by another family against verify's done criteria. Decisions go to the top of plan.md and the PR description, and a script checks that the final head passed independent verification.
- **Cross-model checks** through the CLIs of two model families, Claude Code and Codex by default; the other family is chosen by the session's model, not by the client. With only one family available, the workflow stops at the check instead of using the same family.
- **Supporting Skills** the workflow uses: review-rules, mr-for-human and explain-as-fool. **Standalone Skills**: design-for-review, plan-for-agents, agent-prompt-rules (rules numbered 1.1 to 4.5, each linked to verbatim excerpts of the OpenAI and Anthropic sources it cites) and recon-to-contract.
- **English Skill text**; what the Skills write for people follows the user's language.
- **Install** as a Claude Code or Codex plugin from this repository's marketplace, as an MCode plugin imported from Git, or by linking the Skill directories from a clone. Codex shows a display name and a short description for each Skill.
- **Documentation**: the basis of every workflow rule in [docs/basis.md](docs/basis.md), a [repository readiness guide](docs/repository-readiness.md) with templates and an example, and a [glossary](docs/glossary.md).
- **CI** checks every relative link and anchor in the Markdown files and runs the script tests.
