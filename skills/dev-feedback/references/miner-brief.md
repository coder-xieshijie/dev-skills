# Miner brief

You are reading what one delivered requirement, one or a few sessions, or one span of time left behind: session extracts, plan.md, the MR, CI and review results, the requirement directory. You did not take part in the work. Find what in the process (rules, Skills, tools, handoffs, the user's agent instructions) will make the next delivery cost the user again unless something changes. Do not change any file.

Defects in the product's code are not your subject. When you come across one, note it in one line under "Found in passing" and move on.

## What you are given besides the material

- **Topics**: what the user suspects went wrong or wants improved, restated as questions. Test each against the material.
- **Open fixes**: earlier changes with the condition that shows whether they worked. Judge each one.

## The four questions

Read the material with each in mind. Every lasting gap you report sits under one of them.

1. **Did the last fixes hold?** For each open fix: did the phenomenon appear again, did the closing condition hold, or does the material not show it?
2. **Where did the user step in?** Context the user supplied that the agent could have found itself; corrections; status checks ("where is it now", "is it done"); stops and interrupts; bare "continue" after the agent paused; questions about terms the agent used without explaining; carrying information or task text from one session to another. For each place the agent stopped for the user, say whether it could have been avoided (a go-ahead for reversible work, a fact the agent could look up, a choice with a recommendation it could have taken), moved to the start (a premise the user already had), or needed the user (scope, priority, taste, an irreversible step).
3. **What was caught late?** Name the gate that should have stopped it and the gate that did: local checks against CI, verification against review, review against after merge; checks skipped, self-reported instead of backed by an artifact, or a PASS later contradicted; failed CI checks and automated reviewers' comments the owner did not read.
4. **Where did time go without producing anything?** Waiting for the user or for CI, rework rounds, switching or restarting sessions, one-off scripts and helper code written several times, the largest token costs. Give orders of magnitude.

Behind many gaps is a **rule that did not work**: two rules that contradict each other; a rule ignored; a rule that cannot be judged as written; text that only grows. For each rule that was written but not followed, say which of these it was: it lives where this session does not read it (one client's memory, another repository); several versions of it exist; it was lost in a long context; it is text where a check or hook was needed; a Skill's clause overrode the user's standing instruction.

## Output

```text
## Topics
### <topic>
Verdict: confirmed | partly confirmed (which part) | not supported
Evidence: <file and line, session id and time, MR comment, pipeline or job; counts and durations>
Cause: <the rule, tool or handoff that made it happen>
Suggested change: <the smallest change that removes the cause>

## Open fixes
- <fix>: held | did not hold | not observable — <evidence or why not observable>

## Gaps
### <short title>
Question: 2 | 3 | 4
Phenomenon: <written as it would happen again, not as the story of this run>
Evidence: <location>
Cost: <user interventions, wall time, tokens; what you counted>
Why it will recur: <what in the rules, tools or setup makes it happen again>
Suggested destination: <see routing.md, or "unsure">

## Found in passing
- <product defect, one line, with evidence>
```

List every gap you find; the ranking happens after you. A one-off that will not change a later decision is not a gap. Keep what you observed apart from what you infer, and say which counts you could not check. End with what you could not judge, and why (for example: no session extract for the delivery session).
