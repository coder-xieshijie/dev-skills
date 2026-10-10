# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The version lives in [.claude-plugin/plugin.json](.claude-plugin/plugin.json), and plugins installed in Claude Code stay on it until it changes. Raise it whenever a change to `skills/` or `.claude-plugin/` should reach installed users: the patch number for fixes and wording, the minor number for new Skills or changed workflow rules. Changes to the README or `docs/` alone need no new version.

## [Unreleased]

### Added

- **repo-readiness**, a manual-only Skill for stage A. It interviews the repository, then builds a project-local verification Skill from a kit: one adapter per entry point with isolated `up`, `doctor`, `do` and `down`; feature maps whose criteria carry IDs (`<sub-feature>#<n>`) and a Not covered section; scenario scripts that cite each criterion once, judged by shared primitives in five results (PASS, FAIL, BLOCKED, UNVERIFIED, TO-CONFIRM); a runner with one instance per scenario and counterexample runs; and a structure check for CI. References cover the adapter contract and isolation, how far to build (L0 to L3), and the failures behind each rule. The kit's scripts have their own tests, which CI runs.

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
