---
title: "own your (technical) writing"
date: 2026-06-01
tags: [ai, writing]
description: the case for doing a little more writing
---

I beg: do your own technical writing. If you need to summarize a conversation, or transfer a context from one agent to another, or something else, using AI makes sense. But if your target audience is humans, like in a pull request, or a user guide, or public documentation[^1], don't force someone else to read the output of AI.

## Why It Matters

- You establish that you have actual understanding of what you're writing about
- You can write for the intended audience, avoiding overexplaining or skipping important details
- You can preemptively answer the same questions readers will have
- Your audience gains trust in you as an individual

Each of these comes from the same place: the act of explaining something to a reader is how you learn what the reader needs. That understanding is a byproduct of doing it, not something you can easily receive pre-made.

## Especially Pull Requests

Especially for pull requests, where the main goal is to evaluate if the description (intent) matches the implementation (impact) – it's important that the intent is well written and correctly conveys what compelled the author to make the pull request in the first place and why they would want this. AI often blurs the line between intent and impact to the point where it simply regurgitates the changes made, making it harder for humans.

While you might save a few minutes by asking Claude to draft an entire pull request, those savings are then immediately spent by your fellow reviewers who then need to read a blob of text that is often overly verbose, strongly imperative[^2], and sometimes repetitive.

## One Small Change

If there’s any change to your workflow, it’s that you start at least drafting your own technical writing, and then let AI tooling fix your grammar. The understanding underlining the words written should be your own.

[^1]: I am not making any claims about the future – it could be the case that in 3 years from now, all pull requests and public documentation are intended to be consumed by only LLMs, and user guides are considered obsolete in favor of AGENTS.md. But that’s not today.

[^2]: i.e., simply restating what was changed instead of what the intent was
