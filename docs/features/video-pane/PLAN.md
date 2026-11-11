# Plan: Video pane

**Status:** draft
<!-- draft → building → queued | staged → shipped | dropped -->

## Approach

- `index.html` and `style.css`: the body becomes two flex columns. Left (`#left`): a 16:9 `#vbox` (dashed empty state with a hidden `<input type="file" accept=".mp4,video/mp4">`, and a `<video>` once loaded), then `#bar` as two rows (seek bar; then Play, labels and speed, with `flex-wrap`). Right: the existing `#pad`, unchanged inside.
- `app.js` pure core: the timer gains an optional `limit` (ms, or `null` without a video). `setLimit(ms, now)` clamps the time to it; with a limit, `max()` returns the limit, `seek` clamps to it, and `toggle`/`play` at the limit do nothing. `follow(ms, now)` rebases a running timer onto an outside clock (the video) without changing its running state. Without a limit everything works exactly as today.
- DOM: after every timer change (`renderTimer` callers), `syncVideo()` pushes the state to the video: `playbackRate`, `currentTime` on seeks and pauses, `play()`/`pause()`. While running, each animation frame calls `timer.follow(video.currentTime × 1000, now)`. The video's `ended` and `pause` events pause the timer at the video time (AC-16, AC-18). A rejected `play()` pauses the timer.
- Loading: `URL.createObjectURL(file)` → `loadedmetadata` → `setLimit(duration)`, show the video, seek it to the timer time, focus the seek bar. `error` → the failure message, nothing else changes.
- Tests: new `eq` cases in `selfTest` for `limit` and `follow`; `tests/page-test.js` gains a video section that opens the fixture through the real file picker (`page.waitForFileChooser`) and samples the video and timer together. Fixtures are generated once with ffmpeg and committed; ffmpeg isn't needed to run the app or the tests.
- No new dependencies.

## Tasks

Each task is a vertical slice: its own tests, its own code, and an app that still runs afterwards.

- [ ] **T1: Two-column layout**, covering AC-1 to AC-3
  - Tests: `tests/page-test.js`, with "AC-1: two columns", "AC-2: bar rows and fit at 500 px", "AC-3: empty box text"; every existing check still passes
  - Runnable after: the page shows the empty video box and timer bar on the left and the notepad on the right
- [ ] **T2: Timer limit core**, covering AC-7, AC-13, AC-14 and AC-17 in Node
  - Tests: `app.js` `selfTest`, with "AC-7 …", "AC-13 …", "AC-14 …", "AC-17 …" cases for `setLimit`, `follow`, `seek`, `max`, `toggle` and `applySeekAction` with a limit
  - Runnable after: the Node self-test passes; the page is unchanged
- [ ] **T3: Open a video**, covering AC-4 to AC-9
  - Tests: `tests/fixtures/count-3s.mp4` and `tests/fixtures/broken.mp4`; `tests/page-test.js` with "AC-4" to "AC-9" through the real file chooser
  - Runnable after: clicking the box opens a picker, and a picked .mp4 shows paused at the timer time with the duration as `max`
- [ ] **T4: Sync**, covering AC-10 to AC-20
  - Tests: `tests/page-test.js`, with "AC-10" to "AC-20": play/pause, seek bar and keys, frame steps, speed, end of video, a pause from outside (`video.pause()`), stamps while playing, sound settings
  - Runnable after: the video and the timer move together for every control
- [ ] **T5: Verify and document**, covering every criterion on the real page
  - Tests: the full suite; screenshots at 900 px and 500 px with no video, with a video, and at the end of the video
  - Runnable after: README and PRD-level docs describe the video pane; every check passes with no console errors

## Progress

One line per finished task or fix, newest last. The orchestrator writes these, never a builder.

<!-- - T1 ✅ `abc1234`: <what was built>. Next: <anything the next task should know> -->
