# Scribe — design docs

Scribe is a timed notepad. A video-style timer sits at the top and can be played, paused and scrubbed with a seek bar. A notepad sits below it. Every non-empty line is stamped with the timer's time at the moment that line became non-empty, and stamped lines are kept in timestamp order.

## How the app will run

- Double-click `index.html`. No installs, servers, or build steps are needed, and nothing is fetched from the network.
- There are three files, all in the repo root: `index.html`, `style.css`, and `app.js`.
- `app.js` loads as a classic `<script>` because ES modules are blocked on `file://`. It is wrapped in an IIFE and exposes `window.Scribe`. Under Node it exports through `module.exports`.
- The self-test runs in the browser console as `Scribe.selfTest()`, or in Node:
  `node -e "process.exit(require('./app.js').selfTest()?0:1)"`
- A headless-Chrome page test lives in `tests/page-test.js`. It is not needed to run the app; see the root README.

## Documents

| File | What it holds |
|---|---|
| [requirements.md](requirements.md) | Numbered requirements, platform constraints, and the out-of-scope list |
| [behavior.md](behavior.md) | **Source of truth.** Exact behavior, with edge-case tables |
| [architecture.md](architecture.md) | Files, modules, data model, alternatives considered, and known limitations |
| [pseudocode.md](pseudocode.md) | Timer, line reconciliation, sorting, and caret mapping |
| [plan.md](plan.md) | Milestones and the manual test checklist |
| [open-questions.md](open-questions.md) | Decisions made on the user's behalf, each with its alternative |
