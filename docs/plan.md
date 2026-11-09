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

- [ ] ⚙ On load, it shows `0:00`, paused, with the seek bar disabled.
- [ ] ⚙ Play for about 2 s, then Pause: it shows `0:02`, and the seek bar's max is about 2 s.
- [ ] ⚙ Seek to 0:01 while paused: it shows `0:01` and stays paused.
- [ ] ⚙ Seek while running: it keeps running from the new time.
- [ ] Background the tab for about 30 s while running: the time is still correct on return.

**Stamps**

- [ ] ⚙ Type `a` at 0:00, then type more later: the stamp stays `0:00` (S1, S2).
- [ ] ⚙ A whitespace-only line gets a stamp (S3).
- [ ] ⚙ Clear a line, wait, then retype: it gets a new stamp (S4, S5).
- [ ] ⚙ Enter mid-line splits the line. The second half gets the current time (S7).
- [ ] ⚙ Enter at the start of a line keeps the line's stamp (S8).
- [ ] ⚙ Backspace merge keeps the upper stamp (S9). Merging into an empty upper line keeps the lower stamp (S10).
- [ ] ⚙ Deleting a multi-line selection keeps the first stamp (S12).
- [ ] ⚙ Multi-line paste stamps every non-empty line with the current time, in order (S14, S15).

**Ordering**

- [ ] ⚙ Seek back, type a line at the end, press Enter: the line moves above the later lines (O2).
- [ ] ⚙ While the caret is still on that line, it doesn't move (O3).
- [ ] ⚙ Clicking Play or the seek bar counts as leaving the line (O4).
- [ ] ⚙ Ties at the same paused time keep creation order (O5).
- [ ] ⚙ An empty separator line stays in place (O6).
- [ ] ⚙ The caret stays on the same line after a sort (O9).

**Layout**

- [ ] ⚙ A long wrapped line has its stamp level with its first row.
- [ ] ⚙ After resizing the window narrower, the stamps re-align.
- [ ] ⚙ In a notepad longer than the window, the stamps scroll with the text.
- [ ] Screenshot reviewed by eye.

## Status

_Not started. This section is filled in after the build, and says what was verified and how._
