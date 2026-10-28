# Slimming or regrouping a whole document

Use this when the user asks to shorten the document or regroup its chapters while keeping everything it decides. In the case behind it, the review fixes had grown the body by a third, and half of the document's statements appeared in two or more places; the pass below cut the body by 11 % with none of 479 listed statements lost, and the answerability probe at the end found nine contradictions between sections that the rewrite had kept or introduced.

1. **Propose first.** In the reply, say what can go (statements in two places, basis and process written into the body, rejected approaches written into the body), what stays at full length (contracts, fields, acceptance criteria, open items: what implementers check line by line), and the expected saving. Measure length in characters of the body, not bytes or words. Wait for the user to confirm.
2. **List.** Save the current version. Have a subagent split it into atomic statements, each with its kind (decision, rule, number, interface, acceptance item, fact, evidence, boundary, risk, open item) and its location, as a table.
3. **Rewrite against the list.** Give each statement one home (rule 12 of SKILL.md) and work through the list while rewriting, so the list drives the rewrite rather than only checking it afterwards.
4. **Check.** In parallel:
   - a subagent marks every listed statement as kept, weakened, changed or missing in the new version, with the new location; restore every weakened, changed or missing one;
   - the answerability probe from [reader-rehearsal.md](reader-rehearsal.md), with the questions reviewers have asked so far and questions drawn from the list.
5. **Follow the numbers.** Renumbered sections and figures break whatever cites them: section labels in companion pages, `// Sources:` comments in figures, captions, anchors in published copies. Update each, and regenerate the copies from the source.
6. **Report** the length before and after, the counts from the check, and what was restored.
