# Roadmap

Point2Prompt starts as a bookmarklet, but the product idea is bigger:

**AI coding needs a visual instruction layer.**

## v0.1 - Visual prompt capture

- Select elements on any webpage
- Shift-click to build a multi-element change brief
- Drag-select visible elements inside a region
- Attach intent presets and custom instructions
- Copy prompts for Claude Code, Codex, Cursor, GitHub Issue, or Markdown
- Include DOM selector, text, bounding box, computed styles, and React hints

## v0.2 - Better agent context

- Add cropped visual snapshots for selected elements
- Include nearby sibling context
- Detect repeated list/card patterns
- Add accessibility metadata such as role, label, and contrast hints
- Add framework hints for React, Next.js, Vue, and Svelte

## v0.3 - Review loop

- Save a before-state for selected elements
- Re-run Point2Prompt after the agent edits the UI
- Generate a verification brief comparing requested changes to the current page
- Export a "review this UI change" prompt

## v0.4 - Team workflows

- Export directly to GitHub issues
- Export directly to Linear tickets
- Share a local change brief as Markdown
- Add project-level prompt templates

## Design principles

- No account required
- No backend required
- No page content leaves the browser
- The shortest path from visual feedback to code change wins
- Prefer a bookmarklet until browser-extension power is truly needed
