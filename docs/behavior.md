# Behavior spec

This document is the **source of truth**. If any other doc disagrees with it, this one wins.

## Terms

| Term | Meaning |
|---|---|
| **timer time** | The timer's current position in milliseconds, measured from the wall clock. It is shown rounded down to the frame. |
| **frame** | 1/30 of a second. The frame of a timer time `ms` is `toFrame(ms) = floor(ms × 3 / 100)`. The rate is fixed at 30. |
| **high-water mark** (`max`) | The largest timer time ever reached. It never decreases. |
| **empty line** | A line with zero characters. Whitespace-only lines are **not** empty. |
| **stamp** | A pair `(f, seq)`. `f` is the **frame** (an integer count of 1/30 s) of the timer time when the line became non-empty, rounded down. `seq` is a global counter that increases each time a stamp is given out. Stamps are shown as `formatFrames(f)`. |
| **active line** | The line holding the caret, or the selection end, while the notepad is focused. There is none when it is not focused. |
| **leaving a line** | The active line changes to a different line, or the notepad loses focus. |

## 1. Time format

Times are shown as `M:SS.FF` under one hour and `H:MM:SS.FF` from one hour on. `FF` is the **frame within the second, 00–29**. It is not hundredths: `0:01.15` is 1.5 s.

| Timer time | Frame | Shown as |
|---|---|---|
| 0 ms | 0 | `0:00.00` |
| 33 ms | 0 | `0:00.00` (rounded down) |
| 34 ms | 1 | `0:00.01` |
| 999 ms | 29 | `0:00.29` |
| 1 000 ms | 30 | `0:01.00` |
| 1 500 ms | 45 | `0:01.15` |
| 61 000 ms | 1 830 | `1:01.00` |
| 599 999 ms | 17 999 | `9:59.29` |
| 3 599 999 ms | 107 999 | `59:59.29` |
| 3 600 000 ms | 108 000 | `1:00:00.00` |
| 36 061 000 ms | 1 081 830 | `10:01:01.00` |
| negative | 0 | `0:00.00` (clamped) |

## 2. Timer and seek bar

| Situation | Result |
|---|---|
| Page loads | Paused, time 0, `max` 0. The seek bar is at 0 and disabled while `max` = 0. |
| Press Play while paused | Starts running from the current time. The button reads **Pause**. |
| Press Pause while running | Freezes at the current time. The button reads **Play**. |
| Running past `max` | `max` follows the time. The seek bar's range grows with it. |
| Drag or click the seek bar to frame *f* | The time becomes `frameStart(f)`, clamped to [0, `max`]. The running or paused state is unchanged. |
| Seek while running | Keeps running from *x*. `max` is unchanged until the time passes it again. |
| Seek back, then Play | Runs from the earlier time. New lines get earlier stamps than some existing lines. |
| Tab in background for a minute while running | On return, the time is about 60 s later. The time is wall-clock based. |
| Display refresh | While running, the time label and seek bar refresh **every animation frame** (`requestAnimationFrame`), so every 1/30 s frame is shown on a 30 Hz or faster display. They also refresh immediately on any state change. |
| Seek bar steps | The seek bar's unit is **one frame**. It spans frame 0 to `toFrame(max)`. Choosing frame *f* seeks to `frameStart(f) = ceil(f × 100 / 3)` ms, the first whole millisecond inside that frame, so the label then reads exactly frame *f*. |
| Labels | The timer shows `current`. The seek bar's right end shows `max`. Both use the frame format of §1. |
| Seeking or pausing | Existing stamps never change. |

## 3. Stamp assignment

After every edit, each line is classified by comparing the old lines with the new text (see pseudocode.md, `reconcile`):

- Lines **unchanged** at the start and the end keep their stamps.
- In the changed middle, the **first** new line inherits the stamp of the first stamped old line in the changed range, if any. Every other new line in the middle is new.
- Then any empty line has its stamp removed, and any non-empty line with no stamp is stamped `(now, seq++)`.

In the rows below, a time written without frames (`@0:12`) means frame 00 of that second (`@0:12.00`).

| # | Action (`|` = caret) | Before | After |
|---|---|---|---|
| S1 | Type `a` on an empty line at 0:12 | `""` (none) | `a` @0:12 |
| S2 | Keep typing `bc` at 0:20 | `a` @0:12 | `abc` @0:12 (unchanged) |
| S3 | Type a space on an empty line at 0:30 | `""` | `" "` @0:30 (whitespace counts) |
| S4 | Delete all characters of a line | `abc` @0:12 | `""` (stamp removed) |
| S5 | Then type `x` at 0:40 | `""` | `x` @0:40 (new stamp) |
| S6 | Enter at end of a line: `abc|` at 0:50 | `abc` @0:12 | `abc` @0:12, `""` (none) |
| S7 | Enter mid-line: `ab|c` at 0:50 | `abc` @0:12 | `ab` @0:12, `c` @0:50 |
| S8 | Enter at start: `|abc` at 0:50 | `abc` @0:12 | `""` (none), `abc` @0:12 |
| S9 | Backspace at start of line 2 | `ab` @0:12, `c` @0:50 | `abc` @0:12 (upper's stamp) |
| S10 | Backspace at start of a stamped line under an empty line | `""`, `abc` @0:12 | `abc` @0:12 |
| S11 | Delete at end of line 1 (forward merge) | `ab` @0:12, `c` @0:50 | `abc` @0:12 |
| S12 | Select from mid line 1 through mid line 3, then delete | `aXX` @1, `YY` @2, `ZZb` @3 | `ab` @1 |
| S13 | Select from start of an empty line through mid of next line, then delete | `""`, `abc` @0:12 | `bc` @0:12 (first stamped line in range) |
| S14 | Paste `p\nq\n\nr` on an empty line at 1:00 | `""` | `p` @1:00, `q` @1:00, `""`, `r` @1:00 (seqs increasing in this order) |
| S15 | Paste `p\nq` mid-line `ab|cd` at 1:00 | `abcd` @0:12 | `abp` @0:12, `qcd` @1:00 |
| S16 | Select all and type `z` at 2:00 | many lines | `z` keeps the stamp of the first stamped old line. It is treated as an edit of that line. |
| S17 | Select all and delete | many lines | One empty line, with no stamp |
| S18 | Cut a whole line, including its newline | `a` @1, `b` @2, `c` @3, cut `b\n` | `a` @1, `c` @3 |
| S19 | Type while paused at 0:30.12 | | Stamp is 0:30.12, and repeated stamps tie at that frame |
| S21 | Type `x` at 1 000 ms, then `y` on the next line at 1 040 ms | | `x` @0:01.00, `y` @0:01.01 (different frames, no tie) |
| S22 | Type `x` at 1 000 ms, then `y` on the next line at 1 020 ms | | Both @0:01.00 (same frame, tie broken by seq) |
| S20 | Native browser undo (Ctrl+Z) | | Treated like any other edit, using the same rules. Restored text may get a new stamp. |

## 4. Ordering

Rule: when you leave a line, all stamped lines except the new active line are sorted by `(f, seq)` ascending into the slots that stamped lines occupy. **Empty lines keep their positions.** The active line keeps its position until you leave it.

| # | Situation | Before | After |
|---|---|---|---|
| O1 | Normal typing forward in time | `a` @1, `b` @2 | unchanged |
| O2 | Seek to 0:05, type `x` on a new last line, press Enter | `a` @0:10, `b` @0:20, `x`\| @0:05 | `x` @0:05, `a` @0:10, `b` @0:20, `|` (caret on new empty last line) |
| O3 | Same as O2, but caret still on `x` (not left yet) | | `x` stays last until you leave it |
| O4 | Leave by clicking another line, by arrow keys, by clicking the Play button or seek bar, or by clicking outside | | Sort happens |
| O5 | Equal `f`: lines stamped within the same frame, while paused, or in one paste | `q` (seq 7) @1:00.00 above `p` (seq 6) @1:00.00 | `p`, `q`, ordered by creation |
| O11 | Frames decide order within a second | `b` @0:05.20 above `a` @0:05.03 (left) | `a` @0:05.03, `b` @0:05.20 |
| O6 | Empty lines are kept as separators | `a` @3, `""`, `b` @1 (left) | `b` @1, `""`, `a` @3 |
| O7 | Enter mid-line creates `c` @now while `ab` is earlier | `ab|c` | `ab` is sorted (left). `c` is active and stays put until left. |
| O8 | Multi-line paste | | Pasted lines other than the one with the caret are sorted immediately. |
| O9 | Caret after sort | | The caret and selection stay on the same line objects at the same columns, even if lines moved. |
| O10 | Typing on an existing stamped line does not reorder it | `a` @1, `b` @2, edit `a` | Order unchanged. The stamp never changes. |

## 5. Stamp column

| Situation | Result |
|---|---|
| Stamped line | `formatFrames(f)` in the left column, level with the line's first visual row. The column is wide enough for `10:00:00.00`. |
| Empty line | Blank in the column |
| Long line wraps | The stamp sits beside the first row. Later rows are blank in the column. |
| Window resize | Wrapping and stamp positions are recomputed |
| Notepad taller than the window | The column and text scroll together |
| Caret near or past the bottom or top edge | The notepad scrolls so the caret's row is fully visible, with a small margin |
| Click blank space in the notepad area (beside the stamps, or below the text) | Focuses the notepad with the caret at the end of the text |
