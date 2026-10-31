# Routing

Each gap gets one destination, choosing by the first row that fits; an entry may add deleting a rule the fix makes redundant.

| Destination | When | What landing it means |
|---|---|---|
| No change | Clear guidance already exists and was not followed, and the cause was execution, not the guidance | Record it only, with one line on how to avoid it next time |
| Repository: mechanism | Seen for the second time, and a command can decide it: quality commands, lint, tests, control commands, the smoke set | A branch and a Draft MR in the product repository, with the check failing before and passing after |
| Repository: verification assets | A feature map out of step with the product, a gap in the verification tooling, a verification capability written for one requirement and left outside the shared tooling | The same; a change to a verification tool also shows that a known failure still fails |
| Repository: docs | AGENTS.md or other lasting docs that disagree with the code | The same; may join the repository MR above |
| Development Skills | A problem in the process, a Skill or a Skill's script that will happen again with a different requirement | One PR per change: before-and-after runs as agent-prompt-rules section 4 requires for text, a failing-then-passing test for a script |
| Local configuration | The user's agent instructions, hooks, agent types or model choices | Changed after approval; the final text shown to the user |
| New requirement | Changing a verification method, overturning a settled decision, or work large enough to need its own definition | A short request for the next core-grill |
| Product defect | A problem in the product itself | An issue draft; the user decides whether to file it |
| Upstream | The runtime, a host tool, a provider | A ledger entry and a report draft for the upstream owner |

## Rules that apply to every entry

- **A second occurrence of something a command or hook can decide becomes a mechanism.** More text has already failed once.
- **Where a rule lives decides whether it works.** A preference that holds across repositories goes into the user's shared agent instructions, one that holds for one repository into that repository's AGENTS.md; a single client's memory reaches only that client. Before adding, look for a conflicting or duplicate entry and replace it, so one version remains.
- **Deletion is a destination.** When an existing instruction the gap touches no longer carries weight, the entry is to delete it.
- **A rule of the user's agent instructions outranks a Skill's "the user must decide" clause** when they conflict; when a gap shows a Skill stopping against the user's standing instruction, the destination is that Skill.
