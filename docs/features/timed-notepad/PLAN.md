# Plan: Timed notepad

**Status:** shipped
<!-- draft → building → queued | staged → shipped | dropped -->

## Approach

- Three files in the repo root and no dependencies: `index.html` (the timer bar, the notepad, the stamp column and a hidden measuring mirror), `style.css` (a sticky timer bar and a two-column notepad; the textarea and mirror metrics must match exactly) and `app.js`, one IIFE that exports `Scribe`.
- The pure core never reads the clock or the DOM; time comes in as `now`. It holds `formatTime`, `createTimer` (`play`, `pause`, `toggle`, `seek`, `time`, `max`), `splitLines`/`joinLines`, `reconcile`, `sortLines` and `selfTest`. `wire(document)` adds the events, rendering and a tick of about 100 ms while running.
- Data: `Line = { text, stamp: { t, seq } | null }`, with `t` in ms, rounded down to a whole second. The lines joined with `\n` always equal the textarea's value. Line objects survive edits and the active line is tracked by object identity, so "did the caret leave the line?" is a reference comparison.
- `reconcile` matches the unchanged lines at the start and the end and keeps their objects; the first changed line keeps its object and inherits the first stamp in the changed range. `sortLines` fills the stamped slots in `(t, seq)` order, skipping the active line, and the selection is restored as (line object, column) at both ends.
- Editor: one `<textarea>` that grows to its content inside a scrolling `.pad`, beside a hidden mirror `<div>` with one child per line whose `offsetTop` places each stamp. Rejected: `contenteditable` (browsers normalize Enter, paste and merges inconsistently, so mapping DOM changes back to lines is fragile), one `<input>` per line (Enter, merges, paste, selection and arrow keys rebuilt by hand) and `wrap="off"` (long lines would scroll sideways).
- Events: `input` reconciles and re-renders; `selectionchange`, `keyup`, `mouseup` and `focus` check the active line and sort when it changed; `blur` sorts with no active line; `resize` re-measures. A `mousedown` on blank `.pad` space focuses the textarea at the end, and the caret's row, measured with a `Range` on the mirror, is scrolled fully into `.pad`, because Chrome's own reveal stops a couple of pixels short.

## Tasks

Each task is a vertical slice: its own tests, its own code, and an app that still runs afterwards.

- [x] **T1: Skeleton**, covering no criterion on its own
  - Tests: the Node self-test command exits 0 with a stub `selfTest`
  - Runnable after: the page opens with the timer bar and an empty notepad, with no console errors
- [x] **T2: Timer and seek bar**, covering AC-1 to AC-12
  - Tests: `app.js` `selfTest`, with the `formatTime` table and the "T …" timer cases
  - Runnable after: the timer plays, pauses and scrubs
- [x] **T3: Line model**, covering AC-13 to AC-44
  - Tests: `app.js` `selfTest`, with "S1" to "S19" and the O cases that need no page
  - Runnable after: every stamp and ordering rule is proven in Node; the page looks like T2
- [x] **T4: Editor wiring**, covering AC-45 to AC-51, with AC-13 to AC-44 now on the page
  - Tests: run by T5's page test
  - Runnable after: the full app works by hand
- [x] **T5: Verification**, covering every criterion on the real page
  - Tests: `tests/page-test.js`, with checks named after the S and O rows; screenshots reviewed at 900 px and 500 px wide
  - Runnable after: every check passes, with no console errors

## Progress

One line per finished task or fix, newest last. The orchestrator writes these, never a builder.

<!-- - T1 ✅ `abc1234`: <what was built>. Next: <anything the next task should know> -->
- T1 ✅ `23e9e6b`: `index.html`, `style.css` and `app.js` (IIFE, `window.Scribe`, `module.exports`).
- T2 ✅ `23e9e6b`: `formatTime`, the timer, Play/Pause, the tick and the seek bar bound to the high-water mark.
- T3 ✅ `23e9e6b`: `reconcile` and `sortLines`, with a `selfTest` case for every S and O row that needs no page.
- T4 ✅ `23e9e6b`: textarea and mirror, stamp column, reconcile on input, active-line check, sort on leave and caret mapping.
- T5 ✅ `c8edc03`: verified 2026-11-09 in headless Chrome for Testing 153 (Linux) only. `selfTest` passes 60/60 in Node 22 and in the page. `tests/page-test.js` passes 35/35 with real keyboard and mouse input: Play/Pause, seeking paused and running, typing, Enter, Backspace, Delete, a multi-line selection delete, paste, sort on leave (arrow key, Enter, clicking Play, clicking the seek bar), caret preservation, wrapping at 500 px and 900 px, resize and a long scrolled document; it fails on any console error. Paste is simulated with `execCommand('insertText')`, because the headless clipboard is unavailable on `file://`, and most stamp times are set by moving the seek bar programmatically (two use real clicks). Added while verifying: the caret's row now scrolls fully into view (AC-50), and AC-50 and AC-51 were written into the spec. Not verified: Edge and Firefox (never run), a real clipboard paste, and timer accuracy with the tab in the background.
