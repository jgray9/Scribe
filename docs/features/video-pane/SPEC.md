# Video pane

**Feature:** `video-pane` · **Branch:** `feature/video-pane` · **Started:** 2026-11-10

## Summary

The page splits into two columns: on the left, a video above the timer bar; on the right, the notepad. You open a local `.mp4` by clicking the empty video box, and from then on the video and the timer move together, so play, pause, seeks, frame steps and speed changes all show on the video, and every stamp matches the moment in the video you were watching.

## Scope

**In:**
- A two-column layout: the video pane and timer bar on the left, the notepad (stamp column and text) on the right
- An empty video box that opens a file picker filtered to `.mp4`
- Loading a picked file, and a message in the box when it can't play
- Syncing the video to the timer: play, pause, seek bar, every seek-bar key, frame steps, speed, and stopping at the end
- With a video loaded, a seek range of the whole video instead of the high-water mark

**Non-goals.** This feature never does these:
- Changing how stamps are assigned or sorted
- Changing anything about the app when no video is loaded, apart from the layout

**Parked.** These moved to docs/BACKLOG.md:
- Replacing a loaded video (an "Open video" button) and clicking the video to play or pause. Today, reload the page to pick another video.
- Drag-and-drop to open a video
- Volume and mute controls
- Remembering the video across reloads
- A resizable divider between the columns
- Other formats in the picker (.webm, .mov)
- Matching the frame grid to the video's own frame rate (stamps stay at 30 fps)

## Acceptance criteria

Each criterion must fail if its behavior is missing. Tests are named after these IDs.

Terms: the *duration* is the loaded video's length in ms. *Video time* is `video.currentTime` in ms. `toFrame`, `frameStart`, `max` and the seek-bar keys are as in docs/features/keybinds/SPEC.md.

**Layout**

- **AC-1:** Given the page loads, when it renders at 900 px wide, then there are two columns of about equal width: the left holds the video box with the timer bar directly under it, and the right holds the notepad (stamp column and text), running the full height of the window and scrolling on its own.
- **AC-2:** Given the timer bar on the left, when it renders, then the seek bar fills the bar's first row, and Play, the current time, `max` and the speed sit on a row below it, wrapping if they don't fit. At 500 px wide the seek bar is wider than 200 px and the time and speed labels don't overflow.
- **AC-3:** Given no video is loaded, when the page renders, then the video box is a dashed 16:9 box reading "Click to open a .mp4", and the timer, seek bar, keys and notepad behave exactly as before (every existing self-test and page check still passes).
- **AC-4:** Given no video is loaded, when you click anywhere in the box, then a file picker opens that accepts `.mp4` (`accept=".mp4,video/mp4"`), and choosing nothing (cancel) changes nothing.

**Loading**

- **AC-5:** Given you pick a playable `.mp4`, when it has loaded, then the box shows the video (letterboxed to fit, keeping its aspect ratio) at the frame of the current timer time, the timer is paused, the `max` label shows the duration, the seek bar spans frame 0 to `toFrame(duration)`, and focus is on the seek bar.
- **AC-6:** Given notes with stamps exist, when a video loads, then every line and stamp stays exactly as it was.
- **AC-7:** Given the timer time is past the video's end, when the video loads, then the timer time becomes the duration.
- **AC-8:** Given you pick a file that can't play, when it fails, then the box keeps its dashed look and reads "Can't play this file. Click to try another .mp4", the timer, notes and stamps are unchanged, and clicking the box opens the picker again.
- **AC-9:** Given a video is loaded, when you click the video, then nothing happens; there's no way to open another video without reloading (parked).

**Sync** (all with a video loaded)

- **AC-10:** Given the timer is paused, when you press Play (button, `Space` or `k`), then the video plays from the timer time, and while it runs the timer label follows the video: sampled every animation frame, the timer time is within one frame (34 ms) of the video time.
- **AC-11:** Given the video is playing, when you pause (button, `Space` or `k`), then the video pauses, and the timer time equals the video time to the millisecond, so the label shows the frame the video is on.
- **AC-12:** Given any time, when you seek with the seek bar (drag or click), `j`/`←` or `l`/`→`, then the video time becomes the timer time, and the running or paused state is kept.
- **AC-13 (changes R5, K1, K3):** Given a video is loaded, when you seek, then the limit is the duration, not the high-water mark: you can seek to any point of the video, including past the furthest time the timer has reached, and `l`/`→` and the seek bar clamp to the duration.
- **AC-14 (changes K6, D23):** Given a video is loaded, when you press `,` or `.`, then the timer pauses if running and steps one frame, and the video shows that time; `.` stops at `toFrame(duration)`.
- **AC-15:** Given any speed, when you change it with `<` or `>`, or the video plays, then the video's playback speed equals the timer speed, with the browser's default pitch correction, and the timer time doesn't jump.
- **AC-16:** Given the video is playing, when it reaches its end, then the timer pauses at the duration and the button reads Play.
- **AC-17:** Given the timer is at the duration, when you press Play (button, `Space` or `k`), then nothing happens; after seeking back, Play works again.
- **AC-18:** Given the video is playing, when it stops by itself for any other reason (for example a system media key), then the timer pauses at the video time.
- **AC-19:** Given the video is playing, when you type a new line, then its stamp is the frame of the timer time, which follows the video (AC-10). Seeking, pausing or stepping the video never changes existing stamps.
- **AC-20:** Given a video with sound, when it plays, then its sound is on: the video isn't muted and its volume is 1.

## Decisions

Every Phase 1 answer. Source is `you` if the user chose it, `default` if the user accepted the default.

| # | Question | Answer | Source |
|---|---|---|---|
| 1 | Build this on `feature/video-pane`: video above the timer bar on the left, notepad on the right, synced to the timer? | Yes | default |
| 2 | Column split | 50/50, fixed, no draggable divider, side by side at any width | default |
| 3 | Left side before a video loads | A dashed box reading "Click to open a .mp4"; clicking it opens a picker filtered to .mp4; the timer works as today | default |
| 4 | Seek range with a video | The whole video, 0 to its duration; the max label shows the duration | default |
| 5 | End of the video | The timer pauses at the end; Play does nothing until you seek back | default |
| 6 | Loading a video when notes and a time exist | Notes and stamps kept; timer paused at its current time, clamped to the duration | default |
| 7 | Sound and speed | Sound on; the speed also sets the video's playback speed, pitch kept by the browser; no volume or mute controls | default |
| 8 | Replacing a video ("Open video" button, click the video to play/pause) | Parked | you |
| 9 | A file that won't play | A message in the left pane; timer and notes unchanged | default |
| 10 | Testing against a real video | A tiny generated .mp4 with a frame counter, committed under `tests/fixtures/` | default |
| P1 | Commit the workflow setup straight to `main`? | No: `feature/setup-workflow` goes through `stage` | default |
| P2 | Who puts a feature on `main` at `ship`? | Claude pushes and opens a PR; you merge it | default |

**Changed existing behavior** (approved by decisions 4 and 5): while a video is loaded, the seek limit is the duration instead of the high-water mark (keybinds R5, K1, K3, K6, D23), and Play at the end does nothing. Only when a video is loaded, so the existing tests, which never load one, don't change. The layout changes from one column to two (timed-notepad layout), which the existing layout checks still cover.

## Assumptions

These were decided without asking. Review them before `build`.

- **The video is the clock while one is loaded.** The timer follows `video.currentTime` every animation frame, so stamps match what's on screen even if the video stutters. Without a video, the wall clock drives the timer as today.
- **Layout of the left column:** a 16:9 box at the top (the video is letterboxed inside it), the seek bar right under it, then the button and labels. The space below is left blank.
- **After a video loads, focus moves to the seek bar,** like a Play click, so the keys work right away.
- **The picker only suggests .mp4.** If you switch it to "All files" and pick something else Chrome can play, it loads.
- **Speed changes at the end** still work, and Play stays a no-op there.
- **If Chrome refuses to start playback** (autoplay policy), the timer stays paused. A Play click or a key press counts as a user gesture, so this shouldn't happen in practice.
- **The test fixture** is a 3 s, 30 fps, 160×90 H.264 video with a silent AAC track and the frame number burned in, about 50 KB, plus a few-byte broken `.mp4` for AC-8.

## Open questions

This list must be empty before `build`.

- None
