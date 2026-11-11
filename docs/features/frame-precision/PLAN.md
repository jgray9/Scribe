# Plan: Frame precision

**Status:** shipped
<!-- draft → building → queued | staged → shipped | dropped -->

## Approach

- `app.js` gains the pure `toFrame(ms)`, `frameStart(f)` and `formatFrames(f)`, and `formatTime(ms)` becomes `formatFrames(toFrame(ms))`. The timer itself still counts ms.
- Stamps become `{ f, seq }`: `reconcile` stamps `toFrame(now)`, and `sortLines` sorts by `(f, seq)`.
- Seek bar: its `max` is `toFrame(high)` with a `step` of 1, and moving it seeks to `frameStart(value)`; `seek()` still clamps to [0, `max`].
- The tick becomes a `requestAnimationFrame` loop while running, replacing the 100 ms interval. Play, pause and seek still render at once.
- `style.css`: the stamp gutter and the time labels are widened to fit `10:00:00.00`.
- No new dependencies.

## Tasks

Each task is a vertical slice: its own tests, its own code, and an app that still runs afterwards.

- [x] **T1: Frame core**, covering AC-1 and AC-2
  - Tests: `app.js` `selfTest`, with every row of the format table, "frameStart round-trip 0..400000" and "frameStart values"
  - Runnable after: labels read `0:00.00` everywhere, and the Node self-test passes
- [x] **T2: Frame stamps**, covering AC-6 to AC-11
  - Tests: `app.js` `selfTest`, with the S and O cases moved to frames, and new "S21", "S22", "O11 frames order within a second", "rounds down to the frame" and "D13 stored as integer frame"
  - Runnable after: every rule is proven in Node, and stamps on the page show frames
- [x] **T3: Seek bar and refresh**, covering AC-3, AC-4, AC-5 and AC-12
  - Tests: run by T4's page test
  - Runnable after: scrubbing moves one frame per step, and the running label counts every frame
- [x] **T4: Verification**, covering every criterion on the real page
  - Tests: `tests/page-test.js`, updated for `M:SS.FF` with new frame checks; screenshots reviewed
  - Runnable after: every check passes, with no console errors

## Progress

One line per finished task or fix, newest last. The orchestrator writes these, never a builder.

<!-- - T1 ✅ `abc1234`: <what was built>. Next: <anything the next task should know> -->
- T1 ✅ `19b352a`: `toFrame`, `frameStart` and `formatFrames`, with `formatTime` rebuilt on them.
- T2 ✅ `19b352a`: stamps stored as integer frames `{ f, seq }`, with `reconcile` and `sortLines` on frames.
- T3 ✅ `19b352a`: a frame-step seek bar, a `requestAnimationFrame` tick while running, and a gutter and labels that fit `10:00:00.00`.
- T4 ✅ `19b352a`: verified 2026-11-09 in headless Chrome for Testing 153 (Linux) only. `selfTest` passes 84/84 in Node 22 and in the page: every row of the format table, a `frameStart` → `toFrame` round-trip for frames 0–400 000, the timer table, and every S and O row, including S21, S22 and O11. `tests/page-test.js` passes 46/46: the `M:SS.FF` labels, 31 distinct label values in 1 s (sampled every animation frame), the seek bar's max and step in frames, each of seek steps 0–31 moving the label exactly one frame, two lines typed at different frames of one second sorting by frame, and an `H:MM:SS.FF` stamp and label past one hour that fit their column (on a page whose `performance.now` runs 2000× fast); it fails on any console error. Stamp times are set by moving the seek bar programmatically, and paste is simulated with `execCommand('insertText')`. Screenshots reviewed at 900 px, at 500 px and at the one-hour mark. Not verified: Edge and Firefox (never run), a real clipboard paste, timer accuracy with the tab in the background, and the frame accuracy of stamps under real typing load (stamps were checked at exact seek positions, not against a stopwatch).
