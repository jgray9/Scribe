# Plan

This plan covers the **frame-precision change** (1/30 s stamps and display) on top of the existing app. Each milestone ends with something you can open by double-clicking `index.html`, and `selfTest()` passes.

| # | Milestone | Runnable result |
|---|---|---|
| F1 | **Frame core:** `toFrame`, `frameStart`, `formatFrames`; `formatTime` rebuilt on them. Self-tests for every row of behavior §1 and the `frameStart` round-trip. | The page shows `0:00.00` style labels everywhere. Node self-test passes. |
| F2 | **Frame stamps:** stamps become `{ f, seq }`; `reconcile` and `sortLines` use frames. Existing S/O self-tests updated to frames; new S21, S22, O11. | All rules proven in Node; stamps on the page show frames. |
| F3 | **Seek bar and refresh:** seek bar in frame units via `frameStart`; `requestAnimationFrame` tick while running; gutter and label widths widened. | Scrubbing moves one frame per step; the running label counts every frame. |
| F4 | **Verification:** update `tests/page-test.js` for the new format (puppeteer-core in the scratchpad only), add frame checks, screenshot review. | Every checklist item passes, with no console errors. |

## Manual test checklist

Mark each item as it passes. The M5 script automates every item that is marked ⚙.

**Timer**

- [ ] ⚙ On load, it shows `0:00.00`, paused, with the seek bar disabled.
- [ ] ⚙ Play for about 2 s, then Pause: it shows `0:02.FF` (some frame), and the seek bar's max equals that frame count.
- [ ] ⚙ Seek to frame 45 while paused: it shows `0:01.15` and stays paused.
- [ ] ⚙ Seek one step at a time: each step changes the label by exactly one frame.
- [ ] ⚙ While running, sampling the label over ~1 s shows close to 30 distinct values (no 100 ms jumps).
- [ ] ⚙ Seek while running: it keeps running from the new time.
- [ ] Background the tab for about 30 s while running: the time is still correct on return.

**Stamps**

- [ ] ⚙ Type `a` at 0:00.00, then type more later: the stamp stays `0:00.00` (S1, S2).
- [ ] ⚙ Two lines typed at different frames of the same second get different stamps and sort by frame (S21, O11).
- [ ] ⚙ A whitespace-only line gets a stamp (S3).
- [ ] ⚙ Clear a line, wait, then retype: it gets a new stamp (S4, S5).
- [ ] ⚙ Enter mid-line splits the line. The second half gets the current time (S7).
- [ ] ⚙ Enter at the start of a line keeps the line's stamp (S8).
- [ ] ⚙ Backspace merge keeps the upper stamp (S9). Merging into an empty upper line keeps the lower stamp (S10).
- [ ] ⚙ Deleting a multi-line selection keeps the first stamp (S12).
- [ ] ⚙ Multi-line paste stamps every non-empty line with the current time, in order (S14 on the page; S15 in self-tests).

**Ordering**

- [ ] ⚙ Seek back, type a line at the end, press Enter: the line moves above the later lines (O2).
- [ ] ⚙ While the caret is still on that line, it doesn't move (O3).
- [ ] ⚙ Clicking Play or the seek bar counts as leaving the line (O4).
- [ ] ⚙ Ties at the same paused time keep creation order (O5).
- [ ] ⚙ An empty separator line stays in place (O6).
- [ ] ⚙ The caret stays on the same line after a sort (O9).

**Layout**

- [ ] ⚙ A stamp past one hour (`1:00:00.00`) fits the column without overlapping the text.
- [ ] ⚙ A long wrapped line has its stamp level with its first row.
- [ ] ⚙ After resizing the window narrower, the stamps re-align.
- [ ] ⚙ In a notepad longer than the window, the stamps scroll with the text.
- [ ] Screenshot reviewed by eye (900 px and 500 px wide).

## Status

**Not built yet.** Design docs only (branch `docs/frame-precision`). The previous whole-second build was verified 2026-11-09 in headless Chrome; that status is superseded once the frame build lands.
