# Reducing cost and improving performance with Claude Platform

> Source: [https://claude.com/blog/reducing-cost-and-improving-performance-with-claude-platform](https://claude.com/blog/reducing-cost-and-improving-performance-with-claude-platform) (published 2026-09-08)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-10-01) has sha256 `752d38f2dcca13a8940c976a38778e58bcd42d239bc58c4b98ac67b138352257`.

## **Prompt cache**

### How to fix it

## **Instructions**

Prompts can accumulate instructions that patch model weaknesses. These instructions can drift relative to the capabilities of the [latest Claude models](https://x.com/trq212/status/2080710971228918066). Here are common prompting “anti-patterns” that hobble frontier Claude model and can inadvertently increase costs:

- **Verification rituals**. Instructions like "_double-check your work_” or "_verify twice before responding_” are often taken literally by frontier models and can waste tokens.

[…]

- **Contradictory rules**. Frontier models are better at instruction following. Contradictory instructions ("always refund within policy" vs. "never issue refunds without escalation") can be followed more literally by frontier models, resulting in degraded performance.

### **How to fix it**

## **Effort**

### **How to fix it**

## **Automating cost reduction**

## **Getting started**
