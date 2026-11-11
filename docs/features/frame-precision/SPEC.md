# Frame precision

**Feature:** `frame-precision` · **Branch:** `feature/frame-precision` · **Started:** 2026-11-09

## Summary

Stamps, the timer label and the seek bar go from whole seconds to frames of 1/30 s. Times read `M:SS.FF`, where `FF` is the frame within the second (00–29), and stamps are stored as whole frame counts, so what you see is exactly what sorts. Lines written within the same second now keep their real order, and the running label shows every frame.

## Scope

**In:**
- `M:SS.FF` and `H:MM:SS.FF` for the timer label, the `max` label and stamps
- Stamps stored as integer frames, with ties inside a frame kept in creation order
- A seek bar that moves one frame per step
- A label and seek bar that refresh every animation frame while running
- A stamp column and time labels wide enough for `10:00:00.00`

**Non-goals.** This feature never does these:
- None

**Parked.** These moved to docs/BACKLOG.md:
- A configurable frame rate (24, 25, 60…); it is fixed at 30
- Drop-frame timecode (29.97); frames are exact 1/30 s of wall-clock time

## Acceptance criteria

Each criterion must fail if its behavior is missing. Tests are named after these IDs.

Tests from before this repo adopted the feature workflow are named after the legacy IDs in parentheses (S21, O11, D13…), not after the AC numbers.

Terms: a *frame* is 1/30 s, at a fixed rate of 30, and the frame of a timer time `ms` is `toFrame(ms) = floor(ms × 3 / 100)`. A stamp is now `(f, seq)`, where `f` is the frame of the timer time when the line became non-empty. Every stamp and ordering criterion of `timed-notepad` still holds, with frames in place of whole seconds; a time written without frames (`@0:12`) means frame 00 of that second (`@0:12.00`).

- **AC-1:** Given a timer time, when it is shown on the timer, on the `max` label or as a stamp, then it reads `M:SS.FF` under one hour and `H:MM:SS.FF` from one hour on, where `FF` is the frame within the second (00–29, not hundredths), rounded down: 0 ms → `0:00.00`, 33 ms → `0:00.00`, 34 ms → `0:00.01`, 999 ms → `0:00.29`, 1 000 ms → `0:01.00`, 1 500 ms → `0:01.15`, 61 000 ms → `1:01.00`, 599 999 ms → `9:59.29`, 3 599 999 ms → `59:59.29`, 3 600 000 ms → `1:00:00.00`, 36 061 000 ms → `10:01:01.00`, and a negative time → `0:00.00`.
- **AC-2 (D15):** Given any frame *f* ≥ 0, when the timer seeks to it, then the time becomes `frameStart(f) = ceil(f × 100 / 3)` ms, the first whole millisecond inside that frame, so `toFrame(frameStart(f))` is exactly *f* and the label reads frame *f*.
- **AC-3:** Given the seek bar, when it renders, then its unit is one frame and it spans frame 0 to `toFrame(max)`; dragging or clicking it to frame *f* seeks to `frameStart(f)`, clamped to [0, `max`], and keeps the running or paused state.
- **AC-4:** Given the seek bar, when you move it one step, then the label changes by exactly one frame.
- **AC-5 (D16):** Given the timer is running, when time passes, then the label and the seek bar refresh every animation frame, so every frame is shown on a display of 30 Hz or faster (about 30 distinct label values a second). They also refresh immediately on any state change.
- **AC-6 (S19):** Given the timer is paused at 0:30.12, when you type several new lines, then each is stamped 0:30.12, and they tie at that frame.
- **AC-7 (S21):** Given `x` typed at 1 000 ms, when you type `y` on the next line at 1 040 ms, then the lines are `x` @0:01.00 and `y` @0:01.01: different frames, so no tie.
- **AC-8 (S22):** Given `x` typed at 1 000 ms, when you type `y` on the next line at 1 020 ms, then both are @0:01.00: the same frame, with the tie broken by `seq`.
- **AC-9 (O5):** Given `q` (seq 7) @1:00.00 above `p` (seq 6) @1:00.00, as when lines are stamped within the same frame, while paused, or in one paste, when you leave, then `p` comes before `q`.
- **AC-10 (O11):** Given `b` @0:05.20 above `a` @0:05.03, when you leave, then `a` @0:05.03 comes before `b` @0:05.20: frames decide the order within a second.
- **AC-11 (D13):** Given a line stamped at any time, when its stamp is stored, then it is an integer frame count rounded down, never ms, so two lines that show the same stamp sort by creation order alone.
- **AC-12:** Given a stamp and a timer time past one hour, when they are shown, then `1:00:00.00` fits the stamp column and the time label without overlapping anything; both are wide enough for `10:00:00.00`.

## Decisions

Every Phase 1 answer. Source is `you` if the user chose it, `default` if the user accepted the default.

| # | Question | Answer | Source |
|---|---|---|---|
| Q2 | How precise should stamps and times be? | Frames of 1/30 s, flipping D6 from whole seconds. Decimal hundredths were the alternative, but hundredths aren't a multiple of 1/30, so the display would show values the stamps can't hold | you |

Only the answers this feature's original design docs credit to you are listed: the full Phase 1 question list was never written down. Everything else those docs settled is in the criteria above, or under Assumptions if it was decided without asking.

This feature changes `timed-notepad`'s whole-second behavior: the `M:SS` format (its AC-1), seeking in seconds (AC-6), the refresh of about 100 ms (AC-10), whole-second ties (AC-32, AC-39) and the stamp column's width. Their existing tests moved to frames with it: the format table and the S and O cases in `app.js`'s `selfTest`, and the label, seek-bar and stamp checks in `tests/page-test.js`.

## Assumptions

These were decided without asking. Review them before `build`.

- D12: frames are shown as `M:SS.FF`, with a dot and `FF` as the frame 00–29, so `0:01.15` is 1.5 s. Because `FF` looks like a decimal, `0:01.15` can be misread as 1.15 s. Alternatives: decimal hundredths `M:SS.ss`, or broadcast-style `M:SS:FF`, which under an hour can't be told apart from `H:MM:SS`.
- D13: stamps are stored as an integer frame count (`stamp.f`), so what you see is exactly what sorts (AC-11). Alternative: keep ms (`stamp.t`) and only format as frames; sorting would then use hidden sub-frame time, and two lines that both show `0:05.03` could sort against their creation order.
- D14: the timer still counts milliseconds. Frames are derived with `toFrame` for stamps, labels and the seek bar. Alternative: make the timer count frames.
- D15: a seek lands on the first whole millisecond of its frame (AC-2). Alternative: the exact fractional start of the frame, which can round down into the previous frame.
- D16: the label refreshes with `requestAnimationFrame` while running and stops when paused (AC-5). Displays below 30 Hz would skip frames in the label, though stamps are unaffected because they read the wall clock. Background tabs pause the refresh, but the time is still right on return. Alternatives: `setInterval` at 33 ms, or keep 100 ms, which skips about two of every three frames.
- D17: the stamp column and time labels are widened just enough for `10:00:00.00` (a gutter of about 12ch, labels of about 11ch) (AC-12). Alternative: keep the old widths, which would truncate or overlap past an hour.
- A stamp is taken when the browser delivers the `input` event, which normally lands within a few ms of the keypress, well inside one 33 ms frame. Under heavy load it can be a frame late.

## Open questions

This list must be empty before `build`.

- None
