# Reader rehearsal

Fresh readers ask the questions the author cannot see, because the author reads the draft with everything the draft leaves out already in mind. In the case behind this file, one fresh subagent given only a second draft raised, in under three minutes, most of the questions the requester later asked over three rounds of review, including a commit-order defect the requester found five hours later. What it could not raise needs the code (whether a default already exists) or the requester's expectations (which competitors to compare); step 1's confirmed list and the design check cover those.

## Roles

Start two or three readers in parallel, each a fresh subagent:

| Role | Knows | Looks for |
|-|-|-|
| Requester or tech lead | The product and its current behavior; not the design | Whether the problem, the goal and the scope hold; whether existing and new are told apart; whether the numbers can be trusted |
| Owner of a neighboring module | Their own module; the shared terms of the product | Boundaries, terms used with a different meaning, decisions the document takes from them |
| Implementer | How to build systems; not this design | Interfaces, stored formats, triggers, failures, the order of writes |

Use real role names from the materials when they exist (the owner of the dispatch design, the owner of memory).

## Brief

Give each reader the document path and its figures, and nothing else: no conversation, no research notes, no code. Tell them:

- Your role, and what you know and do not know (from the table).
- Read the whole document as a reviewer who has to approve or reject it.
- Write 15 to 30 annotations. Each quotes the passage (`> quoted text`) and then asks the question or states the doubt. Separate annotations with a line of `----------`.
- Look especially for: terms used before they are explained; numbers without a basis; mechanisms without a trigger, a write location, a failure path or a concurrency story; features whose status (existing, changed, new) is unclear; places where a principle stands in for a concrete artifact; additions whose cost is not justified; figures that leave out a path; structure that hides the main line.
- End with three to five overall comments.
- Ask; do not answer on the author's behalf, and do not propose a redesign.

## Answerability probe

Free annotation finds what a reader does not understand; it misses what the reader cannot find and what two sections say differently. After each revision, start one fresh subagent with the document only and a list of questions: every question the user and reviewers have asked so far, plus questions about each mechanism the revision touched. It answers each in one to four sentences and names the sections it used, or writes "the document cannot answer" and what is missing; then it lists every contradiction between sections it noticed. Every unanswerable question, wrong answer and contradiction is a fix. In the case behind this, the probe took three minutes and found nine contradictions, including a design error that a review fix had introduced.

## Design check

When the design changes stored state or runs work concurrently, start one more reviewer with the document and read access to the code. Brief it with the document's hash, the code commit the document cites and the current branch head, the distance between them read from git, and these finding kinds: wrong facts about current code, mechanisms that would not work as written, contradictions inside the document, contradictions with the source designs, criteria that would pass a broken implementation, and trade-offs for the user. Ask it to walk, for every mechanism that writes stored state, one concrete interleaving step by step (start, the user's next message, the result arriving, the commit) and report every validation rule or write time that fails, with the section and the code it read. A model from another family, set up the way [cross-review](../../cross-review/SKILL.md) starts its second reviewer, sees different defects from your own model.

## Sorting the questions

Sort every annotation into one of three outcomes, and keep the list for the delivery reply:

| Outcome | When |
|-|-|
| Fix the document | Other reviewers need the answer to judge the design: a term, a basis, a trigger, a failure, a scope, a missing path, a concrete artifact |
| Answer in the reply only | The reader lacked background that the document's audience has |
| No change | The question rests on a misreading the text already rules out, or asks for something out of scope; say why |

Group the fixes by the rule in SKILL.md step 3 they fall under, and rewrite the affected sections as a whole. Then rehearse again with fresh readers. Stop when a round raises no new annotation under rules 1 to 7.
