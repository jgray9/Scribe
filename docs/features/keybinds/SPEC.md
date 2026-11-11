# Keyboard shortcuts and playback speed

**Feature:** `keybinds` · **Branch:** `feature/keybinds` · **Started:** 2026-11-09

## Summary

With the seek bar focused, the keyboard drives the timer: play and pause, 10 s jumps, single-frame steps, and a speed from 0.25× to 2×. `Tab` switches between the notepad and the seek bar and puts the caret back where it was, so the timer can be controlled while taking notes without reaching for the mouse.

## Scope

**In:**
- Seek-bar keys: `Space`/`k` to play or pause, `j`/`←` and `l`/`→` to jump 10 s, `,` and `.` to step one frame, `<` and `>` to change the speed
- A timer speed from 0.25× to 2× in steps of 0.25×, with a speed label
- `Tab` and `Shift+Tab` moving between the notepad and the seek bar, with the caret and selection restored
- A seek bar that is always focusable, takes focus when you click Play, and shows a focus ring
- Blocking the range input's own key handling

**Non-goals.** This feature never does these:
- None

**Parked.** These moved to docs/BACKLOG.md:
- Shortcuts while the notepad is focused: only `Tab` is special there, so press `Tab` to reach the seek bar first
- Rebinding keys
- A shortcut help overlay
- Speeds outside 0.25×–2×, or typing in a speed
- Remembering the speed across reloads: nothing persists

## Acceptance criteria

Each criterion must fail if its behavior is missing. Tests are named after these IDs.

Tests from before this repo adopted the feature workflow are named after the legacy IDs in parentheses (K7b, D25…), not after the AC numbers.

Terms: the *speed* is how fast the timer time advances relative to the wall clock: 0.25×, 0.5×, 0.75×, 1×, 1.25×, 1.5×, 1.75× or 2×. The *seek bar is focused* when it (`#seek`) is the focused element, and its keys act only then. Keys match the character they produce (`KeyboardEvent.key`), with letters in either case. In the key criteria, `t` is the current timer time, `f = toFrame(t)`, `max` is the high-water mark and `F = toFrame(max)`.

**Speed**

- **AC-1:** Given the page has just loaded, when nothing has changed the speed, then it is 1×, and a speed label to the right of the `max` label reads `1×`.
- **AC-2:** Given the timer is running at speed *r*, when one wall-clock second passes, then the timer time advances *r* seconds, and once past the high-water mark, `max` grows that fast too.
- **AC-3 (D22):** Given the timer is running, when the speed changes, then the time doesn't jump: the timer rebases at the current time and runs at the new speed from there.
- **AC-4:** Given the timer is paused, when the speed changes, then only the speed changes, and it applies from the next Play.
- **AC-5:** Given any speed, when you pause, seek or play, then the speed stays the same; only reloading resets it to 1×.
- **AC-6 (D20):** Given any speed, when the label renders, then it reads `0.25×`, `0.5×`, `0.75×`, `1×`, `1.25×`, `1.5×`, `1.75×` or `2×`.
- **AC-7:** Given a speed other than 1×, when you type a new line, then its stamp is the timer time, scaled by the speed like the labels.

**Focus**

- **AC-8 (D8):** Given the page has just loaded and `max` is 0, when you Tab to the seek bar, then it is enabled and takes focus, so its keys work before the first Play, though it has nowhere to seek to yet.
- **AC-9 (D26):** Given any state, when you click the Play/Pause button, then it toggles as before and focus moves to the seek bar, whether it played or paused.
- **AC-10 (D27):** Given the seek bar has focus, from the mouse or the keyboard, when it renders, then it shows a plain 2 px outline.
- **AC-11:** Given the seek bar, when you click or drag it, then it seeks as before and takes focus.
- **AC-12 (K16):** Given the notepad is focused, when you press `Tab` or `Shift+Tab`, then focus moves to the seek bar, nothing is inserted, and the caret position is remembered. Leaving the notepad counts as leaving the line, so a sort happens.
- **AC-13 (K16):** Given you tabbed from the notepad to the seek bar, when you press `Tab` or `Shift+Tab`, then focus returns to the notepad with the caret and selection on the same lines and columns as before, wherever the sort moved those lines.
- **AC-14 (D25):** Given the notepad has never been focused, when you Tab into it from the seek bar, then the caret goes to the end of the text.
- **AC-15:** Given the Play button is focused, or nothing is, when you press `Tab`, then the browser default applies.
- **AC-16 (K17):** Given the notepad is focused, when you type `k`, `,`, `<` or any other shortcut character, then it is just text, and the arrow keys move the caret: only `Tab` is special in the notepad.
- **AC-17 (K18):** Given the notepad is focused, when you press `Tab`, then no tab character is typed; tab characters that you paste are kept.

**Seek-bar keys**

- **AC-18:** Given the seek bar is focused, when you press `Space` or `k`, then the timer plays or pauses exactly as if you clicked the button, and the page doesn't scroll or click anything else.
- **AC-19:** Given the seek bar is focused, when you press `j` or `←`, then the timer seeks to `t − 10 000` ms, clamped to 0, and stays running or paused.
- **AC-20:** Given the seek bar is focused, when you press `l` or `→`, then the timer seeks to `t + 10 000` ms, clamped to `max`, and stays running or paused.
- **AC-21:** Given the seek bar is focused, when you press `,`, then the timer pauses if it is running, then seeks to `frameStart(max(f − 1, 0))`.
- **AC-22:** Given the seek bar is focused, when you press `.`, then the timer pauses if it is running, then seeks to `frameStart(min(f + 1, F))`, clamped to `max`.
- **AC-23:** Given the seek bar is focused, when you press `<`, then the speed drops by 0.25×, but not below 0.25×.
- **AC-24:** Given the seek bar is focused, when you press `>`, then the speed rises by 0.25×, but not above 2×.
- **AC-25 (D28):** Given the seek bar is focused, when you press `↑`, `↓`, `Home`, `End`, `PageUp` or `PageDown`, then nothing happens: the range input never moves by itself.
- **AC-26:** Given the seek bar is focused, when you press any other key, then Scribe leaves it alone and the browser default applies, which for a range input is nothing.
- **AC-27 (K14, D19):** Given the seek bar is focused, when you press a key with Ctrl, Alt or Meta held, such as `Ctrl+k`, `Alt+j` or `Meta+.`, then Scribe ignores it and leaves it to the browser, so Ctrl+R and Ctrl+L still work. Shift is allowed, because `<`, `>` and `Shift+Tab` need it.
- **AC-28 (K15, D18):** Given the seek bar is focused, when you press `K` with Shift or Caps Lock, then it acts like `k`, and the same holds for every letter key.

**Edge cases**

- **AC-29 (K1):** Given the time is at `max`, when you press `l`, then nothing changes.
- **AC-30 (K2):** Given the time is 0:04.00, when you press `j`, then the time becomes 0:00.00.
- **AC-31 (K3):** Given the time is 0:04.00 and `max` is 0:09.00, when you press `l`, then the time becomes 0:09.00.
- **AC-32 (K4):** Given the timer is running, when you press `j` or `l`, then the jump happens and the timer keeps running from the new time.
- **AC-33 (K5):** Given the time is 0:00.00, when you press `,`, then it stays at 0:00.00.
- **AC-34 (K6):** Given the time is on frame `F`, when you press `.`, then it stays on frame `F`.
- **AC-35 (K7):** Given the timer is running at 0:05.12, mid-frame, after seeking back so `max` is ahead, when you press `,` or `.`, then it pauses at 0:05.12 and lands exactly on 0:05.11 or 0:05.13.
- **AC-36 (K7b, D23):** Given the timer is running at the live edge (the time is `max`, as usual when you haven't sought back), when you press `.`, then it pauses and stays on that frame, because there is no later frame yet; `,` still steps back.
- **AC-37 (K8):** Given the timer is paused, when you press `,` and then `.`, then it is back on the same frame.
- **AC-38 (K9):** Given the speed is 0.25× or 2×, when you press `<` at 0.25× or `>` at 2×, then the speed is unchanged.
- **AC-39 (K10):** Given the speed is 1×, when you press `>` four times, then it is 2×, each press adding 0.25×.
- **AC-40 (K11):** Given `max` is 0 before the first Play, when you press any seek key, then the time stays 0:00.00, while `Space` or `k` starts the timer and `<` and `>` still change the speed.
- **AC-41 (K12, D21):** Given a speed other than 1×, when you jump 10 s, then the jump is exactly 10 s of timer time; it is not scaled by the speed.
- **AC-42 (K13):** Given the seek bar is focused, when you hold a key down, then its action repeats at the keyboard's repeat rate: holding `l` skips forward 10 s per repeat until `max`.

## Decisions

Every Phase 1 answer. Source is `you` if the user chose it, `default` if the user accepted the default.

| # | Question | Answer | Source |
|---|---|---|---|
| D8 | Should the seek bar work before anything has run? | Always enabled and focusable, so `Space`/`k` can start the timer from the keyboard. Flipped from disabled while `max` is 0 | you |
| D11 | What should `Tab` do? | Toggle focus between the notepad and the seek bar; it still counts as leaving the line. Flipped from the browser default | you |

Only the answers this feature's original design docs credit to you are listed: the full Phase 1 question list was never written down. Everything else those docs settled is in the criteria above, or under Assumptions if it was decided without asking.

This feature changes existing behavior from `timed-notepad`: the seek bar was disabled while `max` was 0 (its AC-2 and D8), `Tab` kept the browser default (D11), and keyboard shortcuts were parked. The page test's load check changed with it, to "load state (seek bar enabled at max 0, D8)" in `tests/page-test.js`.

## Assumptions

These were decided without asking. Review them before `build`.

- D18: keys match the character they produce (`KeyboardEvent.key`), letters in either case, so `<` is whatever key makes `<` on your layout. On layouts where `<`, `>`, `,` or `.` need unusual combinations, the shortcut needs that same combination, and a combination that needs AltGr (reported as Ctrl+Alt on Windows) is ignored because of D19. Alternative: match the physical key (`KeyboardEvent.code`), which would make `<` always Shift+Comma, even on layouts where that types something else.
- D19: Ctrl, Alt and Meta combinations are ignored and left to the browser, and Shift is allowed (AC-27). Alternative: treat `Ctrl+k` like `k`.
- D20: the speed label is a multiplier (`1×`, `0.75×`, `2×`) and is always shown (AC-6). Alternatives: a percentage (`100%`, `75%`), or hiding it at 1×.
- D21: a 10 s jump is 10 s of timer time at any speed (AC-41). Alternative: 10 s of wall-clock time, which would be 5 s of timer time at 0.5×.
- D22: a speed change while running is continuous: rebase at the current time, then run at the new speed (AC-3). Any other choice makes the time jump.
- D23: `.` on the last frame reached stays put, because you can't step past `max` (AC-36). So while running at the live edge, `.` only pauses; press `,` and then `.` to move forward. Alternative: step forward and extend `max` by a frame.
- D24: frame steps count from the frame on display, so `.` always shows the next frame number (AC-35). Alternative: count from the exact ms.
- D25: tabbing into a notepad that has never been focused puts the caret at the end of the text, as clicking blank space does (AC-14). Alternative: the start.
- D26: clicking Play/Pause always moves focus to the seek bar, whether it plays or pauses (AC-9). Alternative: only when it starts playing.
- D27: the focus ring is a plain 2 px outline on `:focus`, shown for mouse focus too, so you can always tell the keys are live (AC-10). Alternative: `:focus-visible` only, which Chrome hides after a mouse click.
- D28: the blocked range keys (`↑`, `↓`, Home, End, PageUp, PageDown) do nothing (AC-25). Alternatives: map Home and End to 0 and `max`, or `↑` and `↓` to the speed.
- Shortcuts act only while the seek bar is focused, so while typing you press `Tab` first; there is no shortcut that works from inside the notepad (AC-16).
- A held key repeats at the operating system's key-repeat rate, so holding `.` steps frames at that rate, not 30 a second (AC-42).
- A stamp records the timer time only, not the speed in effect when it was made (AC-7).
- The speed resets to 1× on reload, like everything else, because nothing persists (AC-5).

## Open questions

This list must be empty before `build`.

- None
