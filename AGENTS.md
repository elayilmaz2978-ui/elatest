# AGENTS.md

Static detective-game website ("ELAGENCYLER"). Vanilla HTML/CSS/JS, no modules, no dependencies, no build/test/lint tooling. It is a git repository.

## Git workflow

- Always start by checking git state (`git status`, `git log --oneline -10`) and proceed logically from there.
- The AI manages git autonomously: decide on your own when to commit, branch, or merge. Do not ask the user for git decisions.
- The user is a beginner developer and does not know git. Before/after each git operation, briefly explain in plain Turkish what you are doing and why (no jargon).
- Make small, logical commits with clear messages that describe each change.
- Never lose the user's work: no destructive operations (force push, discarding uncommitted changes) unless explicitly requested.

## Run / verify

- Serve the directory with any static server; `server.log` shows the usual setup is WEBrick on port 8000: `ruby -run -e httpd . -p 8000`
- No automated tests — verify by opening the page in a browser and playing the case through to the verdict.

## Structure

- `js/cases.js` — data only: global `CASES` array. Case schema is documented in the file's header comment; follow it exactly when adding/editing cases.
- `js/game.js` — UI and game flow; reads the global `CASES`. Keep data out of this file.
- Script order in `index.html` matters: `cases.js` must load before `game.js`.

## Gotchas

- Cache busting is manual: assets are referenced as `css/style.css?v=N`, `js/cases.js?v=N`, `js/game.js?v=N`. When you edit any of them, bump `v` in all three places in `index.html`.
- `scene.model3d` / `scene.modelSpace` in `cases.js` are NOT consumed by `game.js` (data for an unimplemented 3D view). Only `scene.objects` (SVG) is rendered.
- All UI text and case content is Turkish — keep new content in Turkish.
- `server.log` is a runtime artifact, not source.
