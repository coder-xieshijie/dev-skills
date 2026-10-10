# Contributing

Thanks for trying the Skills. They are under active change, so reports from real runs are the most useful contribution.

## Report how a Skill behaved

Open an issue with the **Skill behavior or defect** form. Include:

- the command you called, such as `/dev-skills:core-spec Write spec.md and verify.md from the decision summary`;
- the agent and model: Claude Code or Codex, its version, and the model and reasoning effort;
- what you expected and what happened instead, with the relevant output, file excerpts or session log. Remove anything private first.

For installation trouble, use the **Installation or setup problem** form. For questions and ideas, use [Discussions](https://github.com/coder-xieshijie/dev-skills/discussions).

## Change a Skill

- Changes to rules follow [agent-prompt-rules](skills/agent-prompt-rules/SKILL.md): say which rule or source each change rests on, change one component at a time, and compare runs in a new session before and after. Put the basis in the PR description.
- Write Skill text in English, using the terms in [docs/glossary.md](docs/glossary.md). [AGENTS.md](AGENTS.md) has the remaining repository rules.
- Keep [README.md](README.md) and [README.zh-CN.md](README.zh-CN.md) in step.
- When a change to `skills/` or `.claude-plugin/` should reach installed users, raise the version and add an entry to [CHANGELOG.md](CHANGELOG.md).

Before you open a PR, run the checks CI runs:

```bash
node scripts/check-links.mjs
node skills/agent-prompt-rules/scripts/check-links.mjs
node --test skills/agent-prompt-rules/scripts/check-links.test.mjs
node --test skills/deliver/scripts/check-delivery.test.mjs
node --test skills/deliver/scripts/stall-guard.test.mjs
node --test skills/core-spec/scripts/clauses.test.mjs
node --test skills/repo-readiness/assets/verify-skill/scripts/test/*.test.mjs
node --test skills/repo-readiness/references/adapters/test/*.test.mjs
```

If you changed `.claude-plugin/`, also run `claude plugin validate .`.
