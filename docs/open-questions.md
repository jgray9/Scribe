# Open questions

These are decisions made on your behalf. Each one lists the current choice and the alternative. Reply with an ID to flip any of them.

| ID | Topic | Current choice | Alternative |
|---|---|---|---|
| D1 | Your answer to Q12 ("non-empty lines lose their timestamp") | Read as **"lines that become empty lose their timestamp."** Retyping then gets a new stamp (R12, S4/S5). | Keep the old stamp through emptying and retyping. |
| D2 | Where empty lines go when sorting | **They stay at their positions.** Stamped lines are sorted around them, so blank separators survive (O6). | Empty lines travel with the stamped line above them, or collect at the bottom. |
| D3 | The line holding the caret during a sort | **Stays where it is** until you leave it, even when other lines are sorted around it (O3, O7). | It is sorted along with everything else, and the caret follows it. |
| D4 | Which stamp survives a merge of several lines | The **first stamped line in the changed range** (S12, S13). This also means Backspace into an empty upper line keeps the lower line's stamp (S10). | Always the topmost line's stamp, even if it is empty, so the merged line gets a new stamp. |
| D5 | Select all and type over everything | **Keeps the first old stamp** (S16), because it is treated as an edit of line 1. | Stamp it as a brand-new line at the current time. |
| D6 | Stamp precision | **Whole seconds** (✔ chosen by user, flipped from the original). Lines stamped in the same second tie, and ties fall back to creation order. | Store ms and show whole seconds, so sorting would use the hidden ms. |
| D7 | Seek bar labels | **Current time on the left, high-water mark on the right** (`0:42 … 3:10`), like a video player. | Current time only. |
| D8 | Seek bar before anything has run | **Disabled while the high-water mark is 0.** | Always enabled (it would do nothing). |
| D9 | Native Ctrl+Z | **Left on.** Text undo works, but stamps follow the normal edit rules, so restored lines may be restamped. | Block Ctrl+Z entirely, so it can't produce surprising stamps. |
| D10 | Leaving a line by clicking outside the notepad (Play, seek bar, empty page) | **Counts as leaving**, so it triggers a sort (O4). | Only caret moves inside the notepad count. |
| D11 | Tab key | **Browser default** (moves focus, which also counts as leaving). | Insert a tab character. |
