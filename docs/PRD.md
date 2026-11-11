# Scribe — PRD

Scribe is a timed notepad for personal use that runs by double-clicking a file. A video-style timer at the top plays, pauses and scrubs with a seek bar up to the furthest time it has reached, at 0.25× to 2× speed, and the keyboard drives it while the seek bar is focused. Below the timer, every non-empty line of the notepad is stamped with the timer's time at the moment the line became non-empty, to the frame (1/30 s, shown as `M:SS.FF`), and stamped lines move into time order when you leave them. Each note stays tied to the time it was written, even after you seek back and add notes at earlier times.

## Users

- One person, for their own use. They write notes against a running timer, sometimes seek back to add notes at earlier times, and need every line to keep the time it was written and stay in time order.

## Global constraints

These are rules every feature must respect.

- Stack: plain HTML, CSS and JavaScript in three files in the repo root (`index.html`, `style.css`, `app.js`), with no dependencies.
- The app runs by double-clicking `index.html` and is served from `file://`. There are no installs, servers, build steps or network requests.
- `app.js` is one classic `<script>` written as an IIFE, because browsers block ES modules on `file://`. It sets `window.Scribe`, and also `module.exports` when that exists, so Node can run the self-test.
- Logic that doesn't touch the page lives in pure functions that take the time as an argument. `Scribe.selfTest()` exercises them and returns `true` or `false` in both the browser and Node.
- `tests/page-test.js` drives the real page in headless Chrome and fails on any console error. Its `puppeteer-core` is installed outside the repo, never in it.
- Target browsers are the latest desktop Chrome and Edge. Firefox is best-effort, and there is no mobile layout.
- Personal use only: accessibility and public-release polish are not goals.

## Shipped features

One line per feature, added when it ships.

<!-- - `<name>`: <one-line summary>. Spec in docs/features/<name>/SPEC.md (shipped <YYYY-MM-DD>) -->
- `timed-notepad`: a play/pause timer with a seek bar, and a notepad that stamps each line and sorts stamped lines when you leave them. Spec in docs/features/timed-notepad/SPEC.md (shipped 2026-11-09)
- `frame-precision`: stamps, labels and the seek bar to the frame (1/30 s, `M:SS.FF`), with a label that refreshes every animation frame. Spec in docs/features/frame-precision/SPEC.md (shipped 2026-11-09)
- `keybinds`: seek-bar keyboard shortcuts, `Tab` between the notepad and the seek bar, and 0.25×–2× speed. Spec in docs/features/keybinds/SPEC.md (shipped 2026-11-10)
