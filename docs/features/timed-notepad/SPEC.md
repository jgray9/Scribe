# Timed notepad

**Feature:** `timed-notepad` · **Branch:** `feature/timed-notepad` · **Started:** 2026-11-09

## Summary

A video-style timer sits above a plain-text notepad. The timer plays, pauses and scrubs with a seek bar that reaches as far as the timer has run. Every non-empty line is stamped with the timer's time at the moment it became non-empty, the stamp sits in a column beside the line, and stamped lines move into time order when you leave them. Each note keeps the time it was written, even when you seek back and add notes at earlier times.

## Scope

**In:**
- A timer with Play/Pause, wall-clock timing, a high-water mark, and a seek bar up to it
- A notepad where every non-empty line has a stamp that follows edits, splits, merges, pastes and deletions by the rules below
- Sorting stamped lines into time order when you leave a line, with blank lines and the caret kept in place
- A stamp column that stays level with each line through wrapping, resizing and scrolling
- A pure core with `Scribe.selfTest()`, runnable in the browser and in Node

**Non-goals.** This feature never does these:
- Mobile layout, accessibility, or public-release polish

**Parked.** These moved to docs/BACKLOG.md:
- Keyboard shortcuts: play/pause and seek were mouse-only (later built as `keybinds`)
- Clicking a stamp to seek
- Editing stamps by hand
- Undo/redo of stamps
- A Reset / "New" button (reload the page to start over)
- Persistence: there is no autosave, so reloading or closing the page loses the notes
- Export, copy-all, download
- Import, multiple notes
- Visual style and themes: plain browser defaults plus the minimum layout CSS, no dark mode

## Acceptance criteria

Each criterion must fail if its behavior is missing. Tests are named after these IDs.

Tests from before this repo adopted the feature workflow are named after the legacy IDs in parentheses (S7, O4…), not after the AC numbers. Later features changed some of these behaviors, and each such criterion names the feature that changed it.

Terms: the *timer time* is the timer's position in ms, measured from the wall clock. The *high-water mark* (`max`) is the largest timer time ever reached; it never decreases. A line is *empty* only when it has zero characters, so a whitespace-only line is not empty. A *stamp* is a pair `(t, seq)`: `t` is the timer time when the line became non-empty, rounded down to a whole second, and `seq` is a global counter that rises each time a stamp is given out. The *active line* holds the caret (the selection end) while the notepad is focused; there is none when it isn't. *Leaving* a line means the active line changes to a different line or the notepad loses focus. Below, `a` @0:12 is a line `a` stamped 0:12, `@1`, `@2`, `@3` are any three increasing stamps, and `|` is the caret.

**Timer and seek bar**

- **AC-1:** Given a timer time, when it is shown, then it reads `M:SS` under one hour and `H:MM:SS` from one hour on, rounded down to the whole second: 0 ms → `0:00`, 999 ms → `0:00`, 61 000 ms → `1:01`, 599 999 ms → `9:59`, 3 599 999 ms → `59:59`, 3 600 000 ms → `1:00:00`, 36 061 000 ms → `10:01:01`. *Changed by `frame-precision` to `M:SS.FF`.*
- **AC-2:** Given the page has just loaded, when nothing has been pressed, then the timer is paused at `0:00` with `max` 0, and the seek bar sits at 0, disabled while `max` is 0. *Changed by `keybinds`: the seek bar is always enabled.*
- **AC-3:** Given the timer is paused, when you press Play, then it runs from the current time and the button reads Pause.
- **AC-4:** Given the timer is running, when you press Pause, then it freezes at the current time and the button reads Play.
- **AC-5:** Given the timer is running past `max`, when time passes, then `max` follows the time and the seek bar's range grows with it.
- **AC-6:** Given the seek bar, when you drag or click it to time *x*, then the time becomes *x* clamped to [0, `max`], so you can never seek past `max`, and the running or paused state is unchanged. *Changed by `frame-precision`: the seek bar moves in frames.*
- **AC-7:** Given the timer is running, when you seek to *x*, then it keeps running from *x*, and `max` stays the same until the time passes it again.
- **AC-8:** Given you have sought back, when you press Play, then the timer runs from the earlier time, and new lines get earlier stamps than some existing lines.
- **AC-9:** Given the timer is running, when the tab sits in the background for a minute, then on return the time is about 60 s later, because the time is measured from the wall clock (`performance.now()`).
- **AC-10:** Given the timer is running, when time passes, then the time label and the seek bar refresh about every 100 ms, and immediately on any state change. *Changed by `frame-precision`: every animation frame.*
- **AC-11:** Given the timer bar, when it renders, then the current time shows on the left and `max` at the seek bar's right end.
- **AC-12:** Given stamped lines, when you seek or pause, then no existing stamp changes.

**Stamps**

- **AC-13:** Given any edit, with the timer running or paused, when the text changes, then lines unchanged at the start and the end keep their stamps; in the changed middle, the first new line inherits the stamp of the first stamped old line in the changed range, if any, and every other new line is new; then every empty line loses its stamp and every non-empty line without one is stamped with the current time, in document order. So every non-empty line has a stamp, and no empty line has one.
- **AC-14 (S1):** Given an empty line, when you type `a` at 0:12, then the line is `a` @0:12.
- **AC-15 (S2):** Given `a` @0:12, when you keep typing `bc` at 0:20, then the line is `abc` @0:12: editing never changes a stamp while the line stays non-empty.
- **AC-16 (S3):** Given an empty line, when you type a space at 0:30, then the line is stamped @0:30, because whitespace counts.
- **AC-17 (S4):** Given `abc` @0:12, when you delete all of its characters, then the line is empty and has no stamp.
- **AC-18 (S5):** Given that emptied line, when you type `x` at 0:40, then it gets a new stamp: `x` @0:40.
- **AC-19 (S6):** Given `abc|` @0:12, when you press Enter at 0:50, then `abc` @0:12 is followed by an empty line with no stamp.
- **AC-20 (S7):** Given `ab|c` @0:12, when you press Enter at 0:50, then the text before the caret keeps the stamp and the text after it is new: `ab` @0:12, `c` @0:50.
- **AC-21 (S8):** Given `|abc` @0:12, when you press Enter at 0:50, then an empty line with no stamp is followed by `abc` @0:12.
- **AC-22 (S9):** Given `ab` @0:12 above `c` @0:50, when you press Backspace at the start of `c`, then the merged line keeps the upper line's stamp: `abc` @0:12.
- **AC-23 (S10):** Given an empty line above `abc` @0:12, when you press Backspace at the start of `abc`, then the result is `abc` @0:12.
- **AC-24 (S11):** Given `ab` @0:12 above `c` @0:50, when you press Delete at the end of `ab`, then the result is `abc` @0:12.
- **AC-25 (S12):** Given `aXX` @1, `YY` @2, `ZZb` @3, when you select from the middle of line 1 to the middle of line 3 and delete, then the surviving line keeps the first stamp in the range: `ab` @1.
- **AC-26 (S13):** Given an empty line above `abc` @0:12, when you select from the start of the empty line to the middle of `abc` and delete, then the result is `bc` @0:12, the first stamped line in the range.
- **AC-27 (S14):** Given an empty line, when you paste `p\nq\n\nr` at 1:00, then the lines are `p` @1:00, `q` @1:00, an empty line, and `r` @1:00, with `seq` increasing in that order, so pasted order is creation order.
- **AC-28 (S15):** Given `ab|cd` @0:12, when you paste `p\nq` at 1:00, then the lines are `abp` @0:12 and `qcd` @1:00.
- **AC-29 (S16):** Given many lines, when you select all and type `z` at 2:00, then `z` keeps the stamp of the first stamped old line, as an edit of that line.
- **AC-30 (S17):** Given many lines, when you select all and delete, then one empty line remains, with no stamp.
- **AC-31 (S18):** Given `a` @1, `b` @2, `c` @3, when you cut `b\n` (the whole line with its newline), then `a` @1 and `c` @3 remain.
- **AC-32 (S19):** Given the timer is paused at 0:30, when you type several new lines, then each is stamped 0:30 and they tie. *Changed by `frame-precision`: they tie at the frame.*
- **AC-33 (S20):** Given an edited notepad, when you use the browser's own undo (Ctrl+Z), then the change is treated like any other edit by the same rules, so restored text may get a new stamp.

**Ordering**

- **AC-34:** Given stamped lines out of order, when you leave a line, then all stamped lines except the new active line are sorted by `(t, seq)` ascending into the slots that stamped lines occupy. Empty lines keep their positions, and the active line keeps its position until you leave it.
- **AC-35 (O1):** Given `a` @1 above `b` @2, typed forward in time, when you leave a line, then the order is unchanged.
- **AC-36 (O2):** Given `a` @0:10 and `b` @0:20 with the timer sought back to 0:05, when you type `x` on a new last line and press Enter, then the lines are `x` @0:05, `a` @0:10, `b` @0:20, and the caret is on the new empty last line.
- **AC-37 (O3):** Given the same lines with the caret still on `x`, when you haven't left it yet, then `x` stays last.
- **AC-38 (O4):** Given an out-of-order active line, when you leave it by clicking another line, by arrow keys, by clicking Play or the seek bar, or by clicking outside the notepad, then the sort happens. *`keybinds` adds leaving by `Tab`.*
- **AC-39 (O5):** Given `q` (seq 7) @1:00 above `p` (seq 6) @1:00, as when lines are stamped within the same second, while paused, or in one paste, when you leave, then `p` comes before `q`: equal stamps keep creation order. *Changed by `frame-precision`: equal means the same frame.*
- **AC-40 (O6):** Given `a` @3, an empty line, and `b` @1, when you leave, then the lines are `b` @1, the empty line, `a` @3: blank separators stay where they are.
- **AC-41 (O7):** Given `ab|c` where `ab`'s stamp is earlier than now, when you press Enter, then `ab` is sorted because you left it, while `c`, stamped now and active, stays put until you leave it.
- **AC-42 (O8):** Given a multi-line paste, when it lands, then the pasted lines other than the one holding the caret are sorted immediately.
- **AC-43 (O9):** Given a sort that moves lines, when it happens, then the caret and selection stay on the same lines at the same columns.
- **AC-44 (O10):** Given `a` @1 above `b` @2, when you edit `a`, then the order is unchanged and `a`'s stamp never changes.

**Stamp column**

- **AC-45:** Given a stamped line, when the notepad renders, then its stamp shows in a column to the left of the line, not as part of the text, level with the line's first visual row.
- **AC-46:** Given an empty line, when the notepad renders, then its place in the column is blank.
- **AC-47:** Given a long line that wraps, when the notepad renders, then its stamp sits beside the first row and the later rows are blank in the column.
- **AC-48:** Given wrapped lines, when you resize the window, then wrapping and stamp positions are recomputed.
- **AC-49:** Given a notepad taller than the window, when you scroll, then the column and the text scroll together.
- **AC-50:** Given the caret near or past the top or bottom edge, when it moves, then the notepad scrolls so the caret's row is fully visible, with a small margin.
- **AC-51:** Given blank space in the notepad area, beside the stamps or below the text, when you click it, then the notepad gets focus with the caret at the end of the text.

## Decisions

Every Phase 1 answer. Source is `you` if the user chose it, `default` if the user accepted the default.

| # | Question | Answer | Source |
|---|---|---|---|
| Q12 | When does a line lose its stamp? | "Non-empty lines lose their timestamp", read as: a line that becomes empty loses its stamp, and retyping gives it a new one (see D1) | you |
| Q13 | When do stamped lines move into time order? | When you leave the line, not on every keystroke, so lines don't jump while you type | you |
| D6 | How precise are stamps? | Whole seconds: lines stamped in the same second tie and keep creation order. Flipped from the proposed "store ms, show whole seconds" | you |

Only the answers this feature's original design docs credit to you are listed: the full Phase 1 question list was never written down. Everything else those docs settled is in the criteria above, or under Assumptions if it was decided without asking.

This was the first feature, so it changes no existing behavior.

## Assumptions

These were decided without asking. Review them before `build`.

- D1: your Q12 answer, "non-empty lines lose their timestamp", was read as "lines that become empty lose their stamp" (AC-17, AC-18). Alternative: keep the old stamp through emptying and retyping.
- D2: empty lines keep their positions while stamped lines sort around them, so blank separators survive (AC-40). As lines sort, a blank can end up between different lines than the ones it first separated. Alternative: empty lines travel with the stamped line above them, or collect at the bottom.
- D3: the line holding the caret stays where it is until you leave it, even while other lines sort around it (AC-37, AC-41). Alternative: it sorts with everything else, and the caret follows it.
- D4: a merge of several lines keeps the stamp of the first stamped line in the changed range (AC-25, AC-26), so Backspace into an empty upper line keeps the lower line's stamp (AC-23). Alternative: always the topmost line's stamp, even when that line is empty, so the merged line gets a new stamp.
- D5: selecting all and typing over everything keeps the first old stamp, as an edit of line 1 (AC-29). Alternative: stamp it as a brand-new line at the current time.
- D7: the seek bar shows the current time on the left and `max` on the right, like a video player (AC-11). Alternative: the current time only.
- D8: the seek bar is disabled while `max` is 0 (AC-2). Alternative: always enabled, though it would do nothing. *Flipped by `keybinds`.*
- D9: the browser's own Ctrl+Z is left on. Text undo works, but stamps follow the normal edit rules, so restored lines may be restamped (AC-33). Sorting also rewrites the textarea's value, which in Chrome can clear the undo history at that point, so Ctrl+Z may not reach edits made before a sort. Alternative: block Ctrl+Z entirely, so it can't produce surprising stamps.
- D10: clicking outside the notepad (Play, the seek bar, the empty page) counts as leaving the line, so it triggers a sort (AC-38). Alternative: only caret moves inside the notepad count.
- D11: `Tab` keeps the browser default: it moves focus, which also counts as leaving the line. Alternative: insert a tab character. *Flipped by `keybinds`.*
- Stamps follow lines by matching the unchanged lines at the start and the end, not by a character diff. Identical adjacent lines can't be told apart, so inserting a copy of a neighbouring line may put the new stamp on the other copy; only those two lines' stamps can swap.
- Each keystroke re-renders the whole measuring mirror and stamp column, which is O(lines). That is fine for notes up to a few thousand lines; it isn't tested beyond that.
- Stamp alignment depends on the textarea and the mirror having identical CSS metrics. Unusual browser zoom levels or fonts could put a stamp off by a pixel or so.

## Open questions

This list must be empty before `build`.

- None
