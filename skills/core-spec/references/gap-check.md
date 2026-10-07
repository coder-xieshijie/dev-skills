# Gap check brief

For the gap checker. In the command, the caller gives the paths and sha256 of spec and verify, and the paths of the source agreements and the related repository. The source agreements include the request text, accepted ADRs, and the user's final decisions in their own words together with the questions and options they answered.

## Purpose

After the user confirms these two files, they are frozen; then an agent implements fully automatically and judges whether it got things right only by these two files. Your job is to find, before confirmation, the problems that would make delivery go wrong or impossible to judge. You cannot see the author's reasoning or drafts; this is deliberate: judge only by these two files, the source agreements and the repository.

Read only; do not modify any file. Write the results in your final reply.

## What to check

1. **The spec itself**
   - Self-contradiction: two provisions cannot both be satisfied.
   - Undecided behavior: how a feature the spec touches behaves at some entry point or in some state (default, loading, empty, error, disabled, cancelled, triggered repeatedly, concurrent, after restart) is not decided, and different reasonable choices would change how some scenario is judged.
   - Ambiguity: two reasonable implementations that both match the letter would be judged differently.
   - Missing items: there is no purpose; the spec is for automated delivery but has no delivery and authorization (which repository and branch to deliver to, whether the agent may push and open an MR); a specific adjacent matter would materially change the delivery scope, yet the spec does not say whether it is done.
2. **spec → verify**: every normative item in the spec (behavior, defaults, conditions and exceptions, things that must not happen, existing behavior that must be kept, non-goals, accepted costs) maps to a requirement and a way to prove it; every relevant entry point has a scenario, or the reason none is needed is stated.
3. **verify → spec**: there are no requirements, thresholds or semantics beyond the spec.
4. **Discriminating power**: checkpoints take the spec's literal values, not values computed by the code under test; the scenario fails if the implementation does nothing, returns empty, has only the interface without the interactive effect where the spec prescribes interaction, or follows the decoy implementation listed in the scenario; every "must not appear" has a matching positive checkpoint; the baseline expectation agrees with the direction of change in the spec.
5. **Executable**: the entry points, commands and feature map entries a scenario references exist at the repository's current commit, or are marked "bind command after implementation" or listed as tooling gaps; checkpoints the tools cannot see are listed as coverage blind spots.
6. **Existing facts**: check each existing product fact that spec or verify mentions (keyboard shortcuts, UI text, entry names, defaults, settings) against the repository's current code, and cite where it is; report as an issue anything that does not match the code, and also report anything you could not check.
7. **Source agreements ↔ spec**: every decision, limit, exception and accepted cost the user confirmed in the source agreements has a place in the spec; every normative item in the spec has a basis in the source agreements, and no assistant suggestion has been written as a requirement.

## What to report

Write the report in the language of spec.md, including the fixed phrases quoted below ("optional", "No issues found"). At the start of the report, state the sha256 of spec and verify that the caller gave, to show which version you checked. Report only problems that would make delivery go wrong or impossible to judge. Do not report wording, layout or style preferences; give at most three other improvement suggestions, marked "optional". When there are no problems, write "No issues found" directly, and list the scope you checked.

Write each issue with the following fields:

```text
Type: spec contradiction / spec undecided / spec ambiguous / spec missing item / fact mismatch / departs from source agreements / missing coverage / beyond spec / insufficient discriminating power / not executable
Location: file and section, or requirement or scenario ID
Issue: one sentence
Basis: quote the source text
Impact: which reasonable implementation would be wrongly judged as passing, or wrongly judged as failing
Suggestion: the concrete change to verify; for a problem in the spec, give the change when the source agreements have a basis for it, and when they do not, write it as a question for the user to decide, with the options
```
