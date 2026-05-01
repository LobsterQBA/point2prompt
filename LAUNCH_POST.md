# LinkedIn Launch Post

AI coding agents are getting better at writing code.

But there is still one surprisingly annoying problem:
telling them exactly where to make a UI change.

I kept taking screenshots, drawing arrows, and writing things like:

> "Change the small text under the second card on the right."

That felt absurd.

If I can point at the element in the browser, why can't that become the
instruction?

So I built **Point2Prompt**.

It is a tiny bookmarklet that lets you:

- select UI elements directly on any webpage
- attach change intent like copy, spacing, hierarchy, contrast, or responsive behavior
- copy an AI-ready prompt with DOM, layout, text, style, and React context
- paste it into Claude Code, Codex, Cursor, or a GitHub issue

The idea is simple:

Humans are good at seeing what feels wrong.
AI agents are good at changing files.
Point2Prompt is the missing pointing layer between them.

No browser extension.
No backend.
No account.

Just point, describe, paste, and let the agent work.

I built it as a bookmarklet because distribution matters. Drag one button to the
bookmarks bar, and it works on the pages you already use.

The repo is open source.

Would love feedback from people who build UI with AI agents every day.

## Shorter Version

I built a small tool for a very specific AI coding problem:

Agents can edit code, but they still need us to explain *where* the UI change
should happen.

Point2Prompt lets you select elements directly in the browser, add a change
instruction, and copy a structured prompt with selector, text, layout, styles,
and React context.

It is a bookmarklet, not an extension.

Point at the UI.
Tell the agent what to change.
Paste a better prompt.

## One-Line Pitch

Point2Prompt turns browser clicks into AI-ready UI change briefs.
