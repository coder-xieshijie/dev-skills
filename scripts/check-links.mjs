#!/usr/bin/env node
// Link gate for the whole repository: every relative link and anchor in its
// Markdown files resolves inside the repository. Each Skill also checks its
// own directory where it needs to (agent-prompt-rules has its own gate); the
// checking itself lives in that gate, which must stay self-contained, so
// this entry only passes the repository's options.
// Zero dependencies; run with `node scripts/check-links.mjs` from anywhere.
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkLinks,
  report,
} from "../skills/agent-prompt-rules/scripts/check-links.mjs";

process.exitCode = report(
  checkLinks({
    root: path.dirname(path.dirname(fileURLToPath(import.meta.url))),
    scope: "repository",
    skipDirs: [".git", "node_modules"],
    // Excerpts of official source documents (see skills/agent-prompt-rules/references/sources/README.md).
    archivedOriginals: [
      "skills/agent-prompt-rules/references/sources/anthropic/",
      "skills/agent-prompt-rules/references/sources/openai/",
    ],
  }),
);
