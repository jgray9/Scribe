# Plan

This plan covers the **keybinds and speed change** on top of the existing app (frame precision was the previous change; its milestones are summarised at the end). Each milestone ends with something you can open by double-clicking `index.html`, and `selfTest()` passes.

| # | Milestone | Runnable result |
|---|---|---|
| K1 | **Speed core:** `timer.rate`, `setRate`, scaled `time`; `stepRate`, `formatRate`. Self-tests for rebasing without a jump, high-water growth at 2×, and the 0.25×/2× clamps. | Node self-test passes. The page is unchanged apart from a `1×` label. |
| K2 | **Key core:** `seekKeyAction` and `applySeekAction`. Self-tests for every key in behavior §6 (including case, Shift, Ctrl/Alt/Meta) and every K-row that doesn't need a page. | All key rules proven in Node. |
| K3 | **Wiring:** seek bar always enabled; `keydown` on the seek bar and textarea; Tab caret save/restore; Play click focuses the seek bar; `#rate` label; `:focus` ring. | Every shortcut works on the page. |
| K4 | **Verification:** extend `tests/page-test.js` with real key presses for every shortcut and K-row (puppeteer-core in the scratchpad only); screenshot review with the seek bar focused. | Every checklist item passes, with no console errors. |

## Manual test checklist

Mark each item as it passes. The M5 script automates every item that is marked ⚙.

**Timer**

- [x] ⚙ On load, it shows `0:00.00`, paused, speed `1×`, with the seek bar enabled and focusable. *(changed: was disabled)*
- [x] ⚙ Play for about 2 s, then Pause: it shows `0:02.FF` (some frame), and the seek bar's max equals that frame count.
- [x] ⚙ Seek to frame 45 while paused: it shows `0:01.15` and stays paused.
- [x] ⚙ Seek one step at a time: each step changes the label by exactly one frame.
- [x] ⚙ While running, sampling the label over ~1 s shows close to 30 distinct values (no 100 ms jumps).
- [x] ⚙ Seek while running: it keeps running from the new time.
- [ ] Background the tab for about 30 s while running: the time is still correct on return.

**Stamps**

- [x] ⚙ Type `a` at 0:00.00, then type more later: the stamp stays `0:00.00` (S1, S2).
- [x] ⚙ Two lines typed at different frames of the same second get different stamps and sort by frame (S21, O11).
- [x] ⚙ A whitespace-only line gets a stamp (S3).
- [x] ⚙ Clear a line, wait, then retype: it gets a new stamp (S4, S5).
- [x] ⚙ Enter mid-line splits the line. The second half gets the current time (S7).
- [x] ⚙ Enter at the start of a line keeps the line's stamp (S8).
- [x] ⚙ Backspace merge keeps the upper stamp (S9). Merging into an empty upper line keeps the lower stamp (S10).
- [x] ⚙ Deleting a multi-line selection keeps the first stamp (S12).
- [x] ⚙ Multi-line paste stamps every non-empty line with the current time, in order (S14 on the page; S15 in self-tests).

**Ordering**

- [x] ⚙ Seek back, type a line at the end, press Enter: the line moves above the later lines (O2).
- [x] ⚙ While the caret is still on that line, it doesn't move (O3).
- [x] ⚙ Clicking Play or the seek bar counts as leaving the line (O4).
- [x] ⚙ Ties at the same paused time keep creation order (O5).
- [x] ⚙ An empty separator line stays in place (O6).
- [x] ⚙ The caret stays on the same line after a sort (O9).

**Keyboard** (behavior §6)

- [x] ⚙ Clicking Play focuses the seek bar; the seek bar shows a focus ring.
- [x] ⚙ Before any Play, Tab to the seek bar and press Space: the timer starts (K11).
- [x] ⚙ `Space` and `k` (and `K`) each toggle play/pause.
- [x] ⚙ `j` / `←` jump back 10 s; at 0:04 they land on 0:00 (K2).
- [x] ⚙ `l` / `→` jump forward 10 s, clamped to max (K1, K3); running state is kept (K4).
- [x] ⚙ `,` / `.` step exactly one frame; while running they pause first (K7); at the live edge `.` only pauses (K7b, self-test); `,` at 0 and `.` at the last frame stay put (K5, K6).
- [x] ⚙ `<` / `>` step the speed by 0.25× between 0.25× and 2×; the label follows (K9, K10).
- [x] ⚙ At 2×, about 2 s of timer time pass per wall-clock second; changing speed while running doesn't jump.
- [x] ⚙ `↑`, `↓`, Home, End, PageUp, PageDown leave the time unchanged.
- [x] ⚙ Ctrl/Alt/Meta + a shortcut key does nothing to the timer (K14).
- [x] ⚙ Tab in the notepad moves to the seek bar without inserting anything, and sorts the line (K16).
- [x] ⚙ Tab on the seek bar returns to the notepad with the caret/selection where it was, on the same line after a sort.
- [x] ⚙ Typing `k`, `,`, `<` in the notepad just types them (K17).
- [x] ⚙ Holding `l` repeats (K13).

**Layout**

- [x] ⚙ A stamp past one hour (`1:00:00.00`) fits the column without overlapping the text.
- [x] ⚙ A long wrapped line has its stamp level with its first row.
- [x] ⚙ After resizing the window narrower, the stamps re-align.
- [x] ⚙ In a notepad longer than the window, the stamps scroll with the text.
- [x] Screenshot reviewed by eye (900 px and 500 px wide).
- [x] ⚙ The speed label fits the bar at 500 px wide without squeezing the seek bar to nothing.
- [x] Screenshot reviewed with the seek bar focused (900 px and 500 px).

## Status

**Keybinds and speed (K1–K4): built; verified 2026-11-09 in headless Chrome for Testing 153 (Linux) only.**

- **Self-tests:** `Scribe.selfTest()` passes 124/124 in Node 22 and inside the page (40 new). New coverage, all at the pure-function level: speed (scaled time, rebasing without a jump, `max` growth at 2×, persistence through pause/seek/play), `stepRate` clamps, `formatRate`, `seekKeyAction` for every key including case, Shift, Ctrl/Alt/Meta, blocked and unhandled keys, and `applySeekAction` for K1–K12 plus K7b.
- **Page tests:** `tests/page-test.js` passes 90/90 (44 new). The keyboard section runs on a page whose `performance.now` is a hand-set clock, so times are exact, and sends real key events through puppeteer: every shortcut, K1–K6, K7 (running), K8, K9–K11, K13 (held key), K14–K17, Tab and Shift+Tab both ways with caret and selection restore after a sort, D25, the Play-click focus and focus ring, stamps at 1.5×, and the label fitting at 500 px. It still fails on any console error.
- **Mutation check:** removing the seek bar's `preventDefault`, the notepad's Tab handler, or the caret restore each made the page test fail (9, 5 and 1 failures respectively).
- **Spec fix found while building:** K7 originally implied `.` always advances while running. At the live edge there is no next frame, so it only pauses; the row was split into K7/K7b. This was a spec bug, not an app bug.
- **Not verified:** Edge and Firefox; a physical keyboard's auto-repeat (simulated with repeated keydowns); non-US layouts (D18).

### Previous change: frame precision (F1–F4)

F1 frame core, F2 frame stamps, F3 frame seek bar and rAF refresh, F4 verification.

**Built; verified 2026-11-09 in headless Chrome for Testing 153 (Linux) only.**

- **Self-tests:** `Scribe.selfTest()` passes 84/84, both in Node 22 and inside the page. They cover every row of the frame-format table (§1), a `frameStart` → `toFrame` round-trip for frames 0–400 000, the timer table (§2), and every S and O row (§3–4), including S21, S22 and O11. All of this is at the pure-function level.
- **Page tests:** `tests/page-test.js` passes 46/46 against `file://…/index.html`, using real keyboard and mouse input. Beyond the earlier coverage, it checks:
  - the `M:SS.FF` labels
  - that the running label shows 31 distinct values in 1 s (sampled every animation frame)
  - that the seek bar's max and step are in frames
  - that each of seek steps 0–31 moves the label by exactly one frame
  - that two lines typed at different frames of the same second sort by frame
  - an `H:MM:SS.FF` stamp and label past one hour that fit their column. This check uses a page whose `performance.now` is sped up 2000×.
  - It also fails on any console error.
- **How the page tests set times:** stamp times are set by moving the seek bar programmatically. Paste is simulated with `execCommand('insertText')`.
- **Screenshots** were reviewed at 900 px, at 500 px, and at the one-hour mark.
- **Not verified:**
  - Edge and Firefox (never run)
  - a real clipboard paste
  - timer accuracy with the tab in the background
  - frame accuracy of stamps under real typing load. Stamps were checked at exact seek positions, not against a stopwatch.
