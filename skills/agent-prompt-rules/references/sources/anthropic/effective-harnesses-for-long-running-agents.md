# Effective harnesses for long-running agents

> Source: [https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-09-28) has sha256 `a9e64074b1806b39b234c9c27b29ddc9addbced757dc8518346a8244d070428f`.

## The long-running agent problem

## Environment management

### Feature list

To address the problem of the agent one-shotting an app or prematurely considering the project complete, we prompted the initializer agent to write a comprehensive file of feature requirements expanding on the user’s initial prompt. In the [claude.ai](http://claude.ai/redirect/website.v1.ed3c2c94-869d-428c-a37c-2ab65ac05d18) clone example, this meant over 200 features, such as “a user can open a new chat, type in a query, press enter, and see an AI response.” These features were all initially marked as “failing” so that later coding agents would have a clear outline of what full functionality looked like.

```
{
    "category": "functional",
    "description": "New chat button creates a fresh conversation",
    "steps": [
      "Navigate to main interface",
      "Click the 'New Chat' button",
      "Verify a new conversation is created",
      "Check that chat area shows welcome state",
      "Verify conversation appears in sidebar"
    ],
    "passes": false
  }
```

We prompt coding agents to edit this file only by changing the status of a passes field, and we use strongly-worded instructions like “It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality.” After some experimentation, we landed on using JSON for this, as the model is less likely to inappropriately change or overwrite JSON files compared to Markdown files.

### Incremental progress

Given this initial environment scaffolding, the next iteration of the coding agent was then asked to work on only one feature at a time. This incremental approach turned out to be critical to addressing the agent’s tendency to do too much at once.

### Testing

One final major failure mode that we observed was Claude’s tendency to mark a feature as complete without proper testing. Absent explicit prompting, Claude tended to make code changes, and even do testing with unit tests or `curl` commands against a development server, but would fail recognize that the feature didn’t work end-to-end.

In the case of building a web app, Claude mostly did well at verifying features end-to-end once explicitly prompted to use browser automation tools and do all testing as a human user would.

[…]

Providing Claude with these kinds of testing tools dramatically improved performance, as the agent was able to identify and fix bugs that weren’t obvious from the code alone.

Some issues remain, like limitations to Claude’s vision and to browser automation tools making it difficult to identify every kind of bug. For example, Claude can’t see browser-native alert modals through the Puppeteer MCP, and features relying on these modals tended to be buggier as a result.

## Getting up to speed

With all of the above in place, every coding agent is prompted to run through a series of steps to get its bearings, some quite basic but still helpful:

1. _Run `pwd` to see the directory you’re working in. You’ll only be able to edit files in this directory._
2. _Read the git logs and progress files to get up to speed on what was recently worked on._
3. _Read the features list file and choose the highest-priority feature that’s not yet done to work on._

This approach saves Claude some tokens in every session since it doesn’t have to figure out how to test the code. It also helps to ask the initializer agent to write an init.sh script that can run the development server, and then run through a basic end-to-end test before implementing a new feature.

In the case of the claude.ai clone, this meant that the agent always started the local development server and used the Puppeteer MCP to start a new chat, send a message, and receive a response. This ensured that Claude could quickly identify if the app had been left in a broken state, and immediately fix any existing bugs. If the agent had instead started implementing a new feature, it would likely make the problem worse.

[…]

| **Problem** | **Initializer Agent Behavior** | **Coding Agent Behavior** |
| --- | --- | --- |
| Claude declares victory on the entire project too early. | Set up a feature list file: based on the input spec, set up a structured JSON file with a list of end-to-end feature descriptions. | Read the feature list file at the beginning of a session. Choose a single feature to start working on. |
| Claude leaves the environment in a state with bugs or undocumented progress. | An initial git repo and progress notes file is written. | Start the session by reading the progress notes file and git commit logs, and run a basic test on the development server to catch any undocumented bugs. End the session by writing a git commit and progress update. |
| Claude marks features as done prematurely. | Set up a feature list file. | Self-verify all features. Only mark features as “passing” after careful testing. |
| Claude has to spend time figuring out how to run the app. | Write an `init.sh` script that can run the development server. | Start the session by reading `init.sh`. |

## Future work

### Acknowledgements

### Footnotes
