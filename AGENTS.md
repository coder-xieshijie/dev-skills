# dev-skills

This repository maintains personal development Skills. Each Skill's entry point is `skills/<skill-name>/SKILL.md`.

- Scope a new Skill by the real task and use case the user gives; keep changes to existing Skills within the request.
- `name` matches the directory name. `description` states what the Skill does and when to use it; the body holds the judgment criteria and procedure needed at run time.
- Add references, scripts and assets as needed, and say in the entry point when to read them. Facts that can be observed directly come from the actual files or command output.
- Check triggering and results with real requests; any new or changed script must be run to verify it. Say which results are verified and which still need confirmation in real use.
- This repository is the single source; clients reference whole Skill directories through symlinks. When installing or migrating existing Skills, keep the scope the user explicitly chose.
- After adding or removing a Skill, update the navigation and setup status in the README. Each commit should be understandable on its own; examples use de-identified data.
- Write Skill content in English, using the terms in [docs/glossary.md](docs/glossary.md). Text a Skill produces for people (questions, decision summary, spec, verify, plan, decision list, MR description, reports) follows the user's language as each Skill states; keys that scripts read stay as written.
