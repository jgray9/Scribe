# Plan: Keyboard shortcuts and playback speed

**Status:** shipped
<!-- draft → building → queued | staged → shipped | dropped -->

## Approach

- `app.js` pure core: the timer gains `rate` and `setRate(r, now)`, which rebases at the old rate before switching, and `time()` scales the wall-clock delta by `rate`. That keeps the time right in background tabs, where a `setInterval` adding scaled time would drift and stall. New pure `stepRate`, `formatRate`, `seekKeyAction(ev)` (a key event to an action name, or null to leave the event alone) and `applySeekAction(timer, action, now)`.
- DOM: one `keydown` listener on the seek bar and one on the textarea, rather than a global listener with a mode variable, because focus already is the mode. A seek-bar action calls `preventDefault`, then `applySeekAction`, `renderTimer()` and `startTick()`; `switch` focuses the notepad and restores the remembered caret.
- Textarea `Tab` (without Ctrl, Alt or Meta): `preventDefault`, remember both selection ends as (line object, column) plus the direction, then focus the seek bar; the textarea's `blur` runs the usual sort. Raw offsets would point at the wrong lines after that sort, while line objects survive it.
- A Play click toggles, then focuses the seek bar, which is now always enabled.
- `index.html` gains the `#rate` label, and `style.css` a 2 px `:focus` outline on the seek bar.
- No new dependencies.

## Tasks

Each task is a vertical slice: its own tests, its own code, and an app that still runs afterwards.

- [x] **T1: Speed core**, covering AC-2 to AC-6, with the clamps behind AC-38 and AC-39
  - Tests: `app.js` `selfTest`, with the "R …" speed cases, `stepRate` ("stepRate up from 1 (K10)", "stepRate down from 1 (K9)") and `formatRate`
  - Runnable after: the Node self-test passes; the page is unchanged apart from a `1×` label
- [x] **T2: Key core**, covering AC-18 to AC-41 in Node
  - Tests: `app.js` `selfTest`, with the "keys …" mapping cases (case, Shift, Ctrl/Alt/Meta, blocked and unhandled keys) and "K1" to "K12" plus "K7b" through `applySeekAction`
  - Runnable after: every key rule is proven in Node
- [x] **T3: Wiring**, covering AC-1, AC-7 to AC-17 and every key on the page
  - Tests: run by T4's page test
  - Runnable after: every shortcut works on the page
- [x] **T4: Verification**, covering every criterion on the real page
  - Tests: `tests/page-test.js`, with real key presses for every shortcut and K row; screenshots reviewed with the seek bar focused at 900 px and 500 px
  - Runnable after: every check passes, with no console errors

## Progress

One line per finished task or fix, newest last. The orchestrator writes these, never a builder.

<!-- - T1 ✅ `abc1234`: <what was built>. Next: <anything the next task should know> -->
- T1 ✅ `ebb7218`: `timer.rate`, `setRate` and scaled `time`, with `stepRate` and `formatRate`.
- T2 ✅ `ebb7218`: `seekKeyAction` and `applySeekAction`.
- T3 ✅ `ebb7218`: an always-enabled seek bar, `keydown` on the seek bar and the textarea, caret save and restore across `Tab`, Play focusing the seek bar, the `#rate` label and the focus ring.
- T4 ✅ `ebb7218`: verified 2026-11-09 in headless Chrome for Testing 153 (Linux) only. `selfTest` passes 124/124 (40 new) in Node 22 and in the page, all at the pure-function level: speed (scaled time, rebasing without a jump, `max` growth at 2×, the speed kept through pause, seek and play), the `stepRate` clamps, `formatRate`, `seekKeyAction` for every key including case, Shift, Ctrl/Alt/Meta, blocked and unhandled keys, and `applySeekAction` for K1–K12 plus K7b. `tests/page-test.js` passes 90/90 (44 new). Its keyboard section runs on a page whose `performance.now` is a hand-set clock, so times are exact, and sends real key events: every shortcut, K1–K6, K7 while running, K8, K9–K11, K13 (a held key), K14–K17, `Tab` and `Shift+Tab` both ways with the caret and selection restored after a sort, D25, the Play-click focus and focus ring, stamps at 1.5×, and the speed label fitting at 500 px; it still fails on any console error. Mutation check: removing the seek bar's `preventDefault`, the notepad's `Tab` handler or the caret restore each made the page test fail (9, 5 and 1 failures). Spec fix found while building: K7 implied that `.` always advances while running, but at the live edge there is no next frame, so it only pauses; the row was split into K7 and K7b (a spec bug, not an app bug). Not verified: Edge and Firefox, a physical keyboard's auto-repeat (simulated with repeated keydowns), and non-US keyboard layouts (D18).
