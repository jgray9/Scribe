# Plan

Each milestone ends with something you can open by double-clicking `index.html`, and `selfTest()` passes.

| # | Milestone | Runnable result |
|---|---|---|
| M1 | **Skeleton:** `index.html`, `style.css`, and `app.js` (IIFE, `window.Scribe`, `module.exports`, a stub `selfTest`) | The page opens with the timer bar and an empty notepad. No console errors. The Node self-test command exits 0. |
| M2 | **Timer + seek bar:** `formatTime`, `createTimer`, Play/Pause, the tick loop, and the seek bar bound to `high` | The timer plays, pauses, and scrubs. Self-tests cover the format table (behavior §1) and the timer table (§2). |
| M3 | **Line model:** `reconcile` and `sortLines`, with a self-test case for every S and O row in behavior.md | All rules are proven in Node. Nothing is wired yet, so the page looks like M2. |
| M4 | **Editor wiring:** the textarea and mirror, the stamp column, input reconciliation, the active-line check, sort-on-leave, and caret mapping | The full app works by hand. |
| M5 | **Verification:** a headless Chrome script (`puppeteer-core`, installed in the scratchpad only) that runs the checklist below against `file://…/index.html`, plus a screenshot review | Every checklist item passes, with no console errors. |

## Manual test checklist

Mark each item as it passes. The M5 script automates every item that is marked ⚙.

**Timer**

- [x] ⚙ On load, it shows `0:00`, paused, with the seek bar disabled.
- [x] ⚙ Play for about 2 s, then Pause: it shows `0:02`, and the seek bar's max is about 2 s.
- [x] ⚙ Seek to 0:01 while paused: it shows `0:01` and stays paused.
- [x] ⚙ Seek while running: it keeps running from the new time.
- [ ] Background the tab for about 30 s while running: the time is still correct on return.

**Stamps**

- [x] ⚙ Type `a` at 0:00, then type more later: the stamp stays `0:00` (S1, S2).
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

**Layout**

- [x] ⚙ A long wrapped line has its stamp level with its first row.
- [x] ⚙ After resizing the window narrower, the stamps re-align.
- [x] ⚙ In a notepad longer than the window, the stamps scroll with the text.
- [x] Screenshot reviewed by eye (900 px and 500 px wide).

## Status

**Built; verified 2026-11-09 in headless Chrome for Testing 153 (Linux) only.**

- **Self-tests:** `Scribe.selfTest()` passes 60/60, both in Node 22 and inside the page. It covers the time-format and timer tables (behavior §1–2) and every S and O row (§3–4) at the pure-function level.
- **Page tests:** `tests/page-test.js` passes 35/35 against `file://…/index.html` with real keyboard and mouse input. It covers Play/Pause, seeking (paused and running), typing, Enter, Backspace, Delete, a multi-line selection delete, paste, sort-on-leave (arrow key, Enter, clicking Play, clicking the seek bar), caret preservation, wrapping at 500 px and 900 px, resize, and a long, scrolled document. It also fails on any console error.
  - Paste is simulated with `execCommand('insertText')`, because the headless clipboard is unavailable on `file://`.
  - Most stamp times are set by moving the seek bar programmatically. Two checks use real clicks.
- **Not verified:** Edge and Firefox (never run), a real clipboard paste, and timer accuracy with the tab in the background (unchecked items above).
