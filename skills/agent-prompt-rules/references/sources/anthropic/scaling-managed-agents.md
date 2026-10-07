# Scaling Managed Agents: Decoupling the brain from the hands

> Source: [https://www.anthropic.com/engineering/managed-agents](https://www.anthropic.com/engineering/managed-agents) (published 2026-04-08)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-09-28) has sha256 `6a003211e040a7ea1f0a6d20bb6ad8532d70d5b462deb96b04a6649855ed4530`.

A running topic on the Engineering Blog is how to [build effective agents](https://www.anthropic.com/engineering/building-effective-agents) and [design harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) for [long-running work](https://www.anthropic.com/engineering/harness-design-long-running-apps). A common thread across this work is that harnesses encode assumptions about what Claude can’t do on its own. However, those assumptions need to be frequently questioned because they can [go stale](http://www.incompleteideas.net/IncIdeas/BitterLesson.html) as models improve.

As just one example, in prior work [we found](https://www.anthropic.com/engineering/harness-design-long-running-apps) that Claude Sonnet 4.5 would wrap up tasks prematurely as it sensed its context limit approaching—a behavior sometimes called “context anxiety.” We addressed this by adding context resets to the harness. But when we used the same harness on Claude Opus 4.5, we found that the behavior was gone. The resets had become dead weight.

## Don’t adopt a pet

## The session is not Claude’s context window

## Many brains, many hands

## Conclusion

## Acknowledgements
