# Open questions

These are decisions made on your behalf. Each one lists the current choice and the alternative. Reply with an ID to flip any of them.

| ID | Topic | Current choice | Alternative |
|---|---|---|---|
| D1 | Your answer to Q12 ("non-empty lines lose their timestamp") | Read as **"lines that become empty lose their timestamp."** Retyping then gets a new stamp (R12, S4/S5). | Keep the old stamp through emptying and retyping. |
| D2 | Where empty lines go when sorting | **They stay at their positions.** Stamped lines are sorted around them, so blank separators survive (O6). | Empty lines travel with the stamped line above them, or collect at the bottom. |
| D3 | The line holding the caret during a sort | **Stays where it is** until you leave it, even when other lines are sorted around it (O3, O7). | It is sorted along with everything else, and the caret follows it. |
| D4 | Which stamp survives a merge of several lines | The **first stamped line in the changed range** (S12, S13). This also means Backspace into an empty upper line keeps the lower line's stamp (S10). | Always the topmost line's stamp, even if it is empty, so the merged line gets a new stamp. |
| D5 | Select all and type over everything | **Keeps the first old stamp** (S16), because it is treated as an edit of line 1. | Stamp it as a brand-new line at the current time. |
| D6 | Stamp precision | **1/30 s frames** (✔ chosen by user, flipped from whole seconds). Lines stamped in the same frame tie, and ties fall back to creation order. | Whole seconds (the previous choice). |
| D7 | Seek bar labels | **Current time on the left, high-water mark on the right** (`0:42 … 3:10`), like a video player. | Current time only. |
| D8 | Seek bar before anything has run | **Always enabled and focusable** (✔ chosen by user for keybinds, flipped from disabled while the high-water mark is 0), so `Space`/`k` can start the timer from the keyboard. | Disabled while the high-water mark is 0. |
| D9 | Native Ctrl+Z | **Left on.** Text undo works, but stamps follow the normal edit rules, so restored lines may be restamped. | Block Ctrl+Z entirely, so it can't produce surprising stamps. |
| D10 | Leaving a line by clicking outside the notepad (Play, seek bar, empty page) | **Counts as leaving**, so it triggers a sort (O4). | Only caret moves inside the notepad count. |
| D11 | Tab key | **Toggles focus between the notepad and the seek bar** (✔ chosen by user). It still counts as leaving the line. | Browser default, or insert a tab character. |
| D12 | Frame display format | **`M:SS.FF`** with a dot, `FF` = frame 00–29 (`0:01.15` is 1.5 s). | Decimal hundredths `M:SS.ss`, or broadcast-style `M:SS:FF` (clashes with `H:MM:SS` under an hour). |
| D13 | How stamps are stored | **Integer frame count** (`stamp.f`). What you see is exactly what sorts. | Keep ms (`stamp.t`) and only format as frames; sorting would then use hidden sub-frame time. |
| D14 | Timer's internal unit | **Milliseconds, unchanged.** Frames are derived (`toFrame`) for stamps, labels and the seek bar. | Make the timer count frames directly. |
| D15 | Where a seek lands inside a frame | **The first whole millisecond of that frame** (`ceil(f × 100 / 3)`), so the label shows exactly the frame you chose. | The exact fractional start of the frame, which can round down into the previous frame. |
| D16 | Display refresh | **`requestAnimationFrame` while running**, stopped when paused. | `setInterval` at 33 ms, or keep 100 ms (skips frames). |
| D17 | Stamp column and time-label width | **Widened just enough** for `10:00:00.00` (gutter ~12ch, labels ~11ch). | Fixed at the old widths, which would truncate or overlap past an hour. |
| D18 | How keys are matched | By the **character produced** (`KeyboardEvent.key`), letters in either case. `<` is whatever key makes `<` on your layout. | By physical key (`KeyboardEvent.code`), which would make `<` always Shift+Comma, even on layouts where that types something else. |
| D19 | Modifier keys | **Ctrl, Alt and Meta combos are ignored** and left to the browser. Shift is allowed. | Treat `Ctrl+k` like `k`. |
| D20 | Speed label format | **`1×`, `0.75×`, `2×`** (multiplier), always shown. | Percent (`100%`, `75%`), or hidden at 1×. |
| D21 | 10 s jumps at other speeds | **10 s of timer time**, whatever the speed. | 10 s of wall-clock time (e.g. 5 s of timer time at 0.5×). |
| D22 | Speed change while running | **Continuous:** rebase at the current time, then run at the new speed. | — (any other choice makes the time jump). |
| D23 | `.` on the last reached frame | **Stays put** (you can't step past the high-water mark). | Step forward and extend the high-water mark by a frame. |
| D24 | Frame step from mid-frame | Measured from the **current displayed frame**, so `.` always shows the next frame number. | Measured from the exact ms. |
| D25 | Tab into the notepad when it has never been focused | **Caret at the end of the text**, like clicking blank space. | Caret at the start. |
| D26 | Clicking Play/Pause | **Always moves focus to the seek bar**, whether it plays or pauses. | Only when it starts playing. |
| D27 | Focus ring on the seek bar | **A plain 2 px outline on `:focus`**, shown for mouse focus too (so you always know the keys are live). | `:focus-visible` only, which Chrome hides after a mouse click. |
| D28 | Blocked range keys (`↑`, `↓`, Home, End, PageUp, PageDown) | **Do nothing.** | Map Home/End to 0 / max, or ↑/↓ to speed. |

