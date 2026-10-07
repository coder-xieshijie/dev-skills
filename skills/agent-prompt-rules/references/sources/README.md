# Vendor sources (excerpts)

This folder holds excerpts of the Anthropic and OpenAI documents that [agent-prompt-rules](../../SKILL.md) cites; the design notes under `docs/` in this repository link to the same files. The copyright of each document belongs to its publisher. The excerpts are here only so that each citation can be checked against the words it relies on: apart from its headings, a file keeps only the passages that dev-skills cites, verbatim.

Each excerpt file has:

- the document title, and under it the official URL (with the publication date or source commit where there is one);
- a note giving the sha256 and fetch date of the archived full text;
- every heading of the full text, unchanged and in order, so that every anchor that points into the file still resolves (including GitHub's `-1`, `-2` suffixes for repeated headings);
- under the headings that are cited, the passages the citing text relies on, copied verbatim. Headings nobody cites have no text under them.

`[…]` on its own line marks an omission inside a kept passage, including inside a code block. After a table it means that rows were left out; a partial table keeps its header rows so that it still renders. Neither link checker, this Skill's [`scripts/check-links.mjs`](../../scripts/check-links.mjs) nor the repository's `scripts/check-links.mjs`, checks links inside the excerpt files, but both check the anchors that point into them: this Skill's from files within the Skill, the repository's from every Markdown file, including the design notes in `docs/`.

## Full text

The full text of every document, as fetched and normalized, is kept in the private repository `coder-xieshijie/dev-skills-sources` at commit `07e03e5`: the documents are under `sources/` with the same paths as here, and `SHA256SUMS` lists the sha256 of each one. The sha256 in each excerpt's note and in the tables below identifies that version. For public reading, use the official URL in each file.

Most documents were fetched on 2026-09-28. On 2026-10-01, five were added and four that had changed were fetched again; the Fetched column gives the date of each. The Codex Prompting, Long-running work and Subagents pages have moved to `learn.chatgpt.com`, and the files and tables use the new address; the first two were checked on 2026-10-01, had not changed, and keep the version fetched on 2026-09-28.

## Anthropic

| File                                                                                                       | Title                                                           | Published   | Fetched    | Method | sha256 of the full text                                            |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------- | ---------- | ------ | ------------------------------------------------------------------ |
| [claude-prompting-best-practices.md](anthropic/claude-prompting-best-practices.md)                         | Prompting best practices                                        | living page | 2026-10-01 | A      | `ee34af076fde08c7218a9930af1f6cd79d095471dc52c35388efa0bee17c8ad4` |
| [prompting-claude-fable-5.md](anthropic/prompting-claude-fable-5.md)                                       | Prompting Claude Fable 5                                        | living page | 2026-09-28 | A      | `75455cce6372d543e7eda2bbf14b5cde6c653112e9eb1b11643416ec910bd3be` |
| [prompting-claude-fable-5-1.md](anthropic/prompting-claude-fable-5-1.md)                                   | Prompting Claude Fable 5.1                                      | living page | 2026-09-28 | A      | `d4fe00faa1799c64486670389854ca6e27e6f6dfe2b9553e01f5d5ac6012719f` |
| [prompting-claude-opus-5.md](anthropic/prompting-claude-opus-5.md)                                         | Prompting Claude Opus 5                                         | living page | 2026-10-01 | A      | `370b528c460fda71497a333cb06d08541433da593c97c4f3a8e7a356cd361a78` |
| [prompting-claude-opus-5-5.md](anthropic/prompting-claude-opus-5-5.md)                                     | Prompting Claude Opus 5.5                                       | living page | 2026-09-28 | A      | `5256a8e9a3b4727a29c2be44c6adb6b6558605e089cbb1499456bcc21b3c74aa` |
| [prompting-claude-sonnet-5-5.md](anthropic/prompting-claude-sonnet-5-5.md)                                 | Prompting Claude Sonnet 5.5                                     | living page | 2026-10-01 | A      | `7cf928b1a09732fac6c4e53ad8ab8218982798b46bc5fcba3c1fe09963529a65` |
| [skill-authoring-best-practices.md](anthropic/skill-authoring-best-practices.md)                           | Skill authoring best practices                                  | living page | 2026-09-28 | A      | `f747d44fa4603fd4167c7ac251b6dcd74cf1ee8fce66ae6fb3bf19b17cbb9c30` |
| [claude-code-best-practices.md](anthropic/claude-code-best-practices.md)                                   | Best practices for Claude Code                                  | living page | 2026-09-28 | B      | `258c32ee15b3fd306c53a6b692beeca9c7ba1ba42f1bdd1409d71e32a92e0413` |
| [claude-code-skills.md](anthropic/claude-code-skills.md)                                                   | Extend Claude with skills (Claude Code)                         | living page | 2026-10-01 | B      | `70477a2c0582ee540539f1202e243dcb4168ab8e4f9ad6a977a1bf441522257e` |
| [prompt-audit.md](anthropic/prompt-audit.md)                                                               | Prompt Audit (`shared/prompt-audit.md` in the claude-api Skill) | living page | 2026-10-01 | D      | `77549cf31ac32b2c907afd9ce16151bf8629eccfa114546de12f550447db95f7` |
| [building-effective-agents.md](anthropic/building-effective-agents.md)                                     | Building effective agents                                       | 2024-12-19  | 2026-09-28 | C      | `40dd704271c3e36dbd9a36eb3529d25f35937c44ed142606b1344d8c5cf2a8fb` |
| [multi-agent-research-system.md](anthropic/multi-agent-research-system.md)                                 | How we built our multi-agent research system                    | 2025-06-13  | 2026-09-28 | C      | `b86c9dc1513406d70c2df9ed8855ded1d3d5b079106dddd1d7e99a7987e9c2e9` |
| [effective-context-engineering.md](anthropic/effective-context-engineering.md)                             | Effective context engineering for AI agents                     | 2025-09-29  | 2026-09-28 | C      | `ed8b4a47779deb2568c29aba1277114405e20bfa833dc59d1b770988a475a78c` |
| [effective-harnesses-for-long-running-agents.md](anthropic/effective-harnesses-for-long-running-agents.md) | Effective harnesses for long-running agents                     | not stated  | 2026-09-28 | C      | `a9e64074b1806b39b234c9c27b29ddc9addbced757dc8518346a8244d070428f` |
| [building-multi-agent-systems-when-and-how.md](anthropic/building-multi-agent-systems-when-and-how.md)     | Building multi-agent systems: When and how to use them          | 2026-01-23  | 2026-09-28 | C      | `3be713964ed0228752b36a4992f1504bc9ec815ed007017377c319723315d62f` |
| [harness-design-long-running-apps.md](anthropic/harness-design-long-running-apps.md)                       | Harness design for long-running application development         | 2026-03-24  | 2026-09-28 | C      | `9c3d68ea961941621c72d0cf5952053500542b221bc05b8b0c8492fca0fdf5bd` |
| [scaling-managed-agents.md](anthropic/scaling-managed-agents.md)                                           | Scaling Managed Agents: Decoupling the brain from the hands     | 2026-04-08  | 2026-09-28 | C      | `6a003211e040a7ea1f0a6d20bb6ad8532d70d5b462deb96b04a6649855ed4530` |
| [multiagent-systems-patterns-and-problems.md](anthropic/multiagent-systems-patterns-and-problems.md)       | Patterns and problems in multiagent systems                     | 2026-08-13  | 2026-09-28 | C      | `2d713f6c44200ace06a78e43109d7d6c181524122935ac21c415d97aab0858e6` |
| [reducing-cost-and-improving-performance.md](anthropic/reducing-cost-and-improving-performance.md)         | Reducing cost and improving performance with Claude Platform    | 2026-09-08  | 2026-10-01 | C      | `752d38f2dcca13a8940c976a38778e58bcd42d239bc58c4b98ac67b138352257` |

## OpenAI

| File                                                                                                        | Title                                                         | Published   | Fetched    | Method | sha256 of the full text                                            |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------- | ---------- | ------ | ------------------------------------------------------------------ |
| [rethinking-skills-and-prompts-for-gpt-6-astra.md](openai/rethinking-skills-and-prompts-for-gpt-6-astra.md) | Rethinking skills and prompts for GPT-6 Astra                 | 2026-09-11  | 2026-09-28 | B      | `a8fd3c9959d21ce6902bea825bd59112b2983ee10b599218b4088ca70570f182` |
| [using-gpt-6.md](openai/using-gpt-6.md)                                                                     | Using GPT-6 (includes Prompting best practices)               | living page | 2026-10-01 | B      | `e7ffd1c471a1fcf30f4813279bc99a78c8634a4534228a2d747c085d253d654f` |
| [codex-prompting.md](openai/codex-prompting.md)                                                             | Prompting (Codex / ChatGPT)                                   | living page | 2026-09-28 | B      | `8106241b75202ced279030fbae85455f6df1701b6681f9c6d67fda4c8b7a9549` |
| [codex-long-running-work.md](openai/codex-long-running-work.md)                                             | Long-running work                                             | living page | 2026-09-28 | B      | `c4189b3376e0283dad303c53d6d74ada0eb5dc278b7301e98ad548bf6a8620a3` |
| [codex-subagents.md](openai/codex-subagents.md)                                                             | Subagents                                                     | living page | 2026-10-01 | B      | `dcf6371e3d921f2ba3721dcbd90a8e0aa7c83b028e8f91023f01b066ab19b8d2` |
| [orchestration-and-handoffs.md](openai/orchestration-and-handoffs.md)                                       | Orchestration and handoffs                                    | living page | 2026-09-28 | B      | `f2517801bf6977152e66d8ce14ac2bb3b10fea8d6ea8e5f671953c6daf3be4fd` |
| [codex-skill-creator.md](openai/codex-skill-creator.md)                                                     | Skill Creator (built-in Codex Skill)                          | living page | 2026-10-01 | D      | `197f5ccb054d498d539aa75299b97ed0ceb8136663ff13deb712655c2fbec8f5` |
| [harness-engineering.md](openai/harness-engineering.md)                                                     | Harness engineering: leveraging Codex in an agent-first world | 2026-02-11  | 2026-09-28 | C      | `45e3ae701d362fc215a517ba1829b49c52a17164de18b52c6aa3f8ef31a32bec` |
| [run-long-horizon-tasks-with-codex.md](openai/run-long-horizon-tasks-with-codex.md)                         | Run long horizon tasks with Codex                             | 2026-02-23  | 2026-09-28 | B      | `e4c3cc6f38ce156a57b97009cc739a04171e3bc7e203fe8d124ca8ade197d19e` |

"Living page" means that the page has no publication date and is updated in place.

## Fetch methods

- **A**: The official Markdown (the page URL with `.md` appended). `platform.claude.com` is region-restricted on the machine that fetched it, so it was read through the Jina Reader in Agent Reach.
- **B**: The official Markdown that the site serves when `.md` is appended to the page URL.
- **C**: Markdown produced by the Jina Reader in Agent Reach.
- **D**: A Markdown file in a GitHub repository, fetched with `gh api`. The URL line gives the file's address on the default branch, with the date and hash of the latest commit to the file at the time it was fetched.

## Normalization

All four methods went through the same normalization, which changes no wording:

- Each file starts with `# Title`, and the next line gives the original URL (with the publication date where there is one).
- Site additions are removed: Jina metadata, site navigation, site sections such as "related reading", page anchor tags and icon components. Of the YAML metadata, only the title and the page subtitle are kept (the subtitle becomes the first paragraph of the body).
- Site components become plain Markdown: callouts (Tip, Note, Info, Warning, Callout) become block quotes; step components become numbered bold subheadings; collapsible blocks become bold subheadings; multi-language code groups are listed one language after another, with the language named above each block; cards become a list of "link: description"; in OpenAI documents, blocks that switch by environment become a single "Applies to: …" line; key labels become inline code; HTML headings with an id become Markdown headings, and links to them within the page point to the new anchor; the indentation the components added is removed.
- The contents of code blocks are kept verbatim; only the language label is simplified to the language name, and a code block's title, if it had one, goes on the line above the block.
- Tag names that appear as text in the body (for example `<instructions>`) are wrapped in inline code so that they are not read as HTML.
- Spaces lost during fetching are restored (for example between bold text or links and the words around them), relative links within the site become absolute URLs, links to the page itself become in-page anchors, and lists use the compact format.

## Updating a source

When a vendor publishes a new model or a new prompting guide:

1. Fetch the new version with the methods and normalization above.
2. Commit the full text to the private repository: replace or add the file under `sources/`, update `SHA256SUMS`, and note the new commit.
3. Re-check the rules in [SKILL.md](../../SKILL.md) that cite the changed document, and the design notes in `docs/` that link to it (search the repository for the file name). Change what conflicts with the new text; cite a new document where it supports a rule.
4. Update the excerpt here: keep every heading of the new full text, keep verbatim the passages that the citing text relies on, and update the note's sha256 and fetch date. Update the document's row in the table above, or add a row for a new document.
5. From the repository root, run `node scripts/check-links.mjs`. It checks every Markdown file in the repository, including the design notes in `docs/`, and confirms that every anchor pointing into these files still exists.
6. Following section 4 of SKILL.md, review again the prompts, pipelines and Skills written according to these rules.
