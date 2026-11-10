# Architecture

## Files

| File | Role |
|---|---|
| `index.html` | Markup: the timer bar (Play/Pause button, time label, seek bar, max label, speed label `#rate`) and the notepad area (stamp column, textarea, hidden measuring mirror). Loads `style.css` and `app.js` with a classic `<script>`. |
| `style.css` | The minimum layout: a sticky timer bar and a two-column notepad. Textarea and mirror metrics (font, padding, width, wrapping) must match exactly. |
| `app.js` | One IIFE. A pure core, DOM wiring when `document` exists, and the self-test. Exports `Scribe` to `window` and to `module.exports`. |

## Modules inside `app.js`

```
Scribe
├── toFrame(ms) → integer frame (floor(ms*3/100)) pure
├── frameStart(f) → ms (ceil(f*100/3))           pure, toFrame(frameStart(f)) === f
├── formatFrames(f) → "M:SS.FF" | "H:MM:SS.FF"  pure
├── formatTime(ms) = formatFrames(toFrame(ms))  pure
├── createTimer() → timer object               pure (every method takes `now`)
│     play(now) pause(now) toggle(now) seek(ms, now) time(now) max(now)
│     setRate(r, now) running rate
├── stepRate(r, dir) → r ± 0.25 in [0.25, 2]    pure
├── formatRate(r) → "1×" | "0.75×" …            pure
├── seekKeyAction(ev) → action name | null      pure: {key, ctrlKey, altKey, metaKey} → 'toggle' |
│                                                 'back10' | 'fwd10' | 'prevFrame' | 'nextFrame' |
│                                                 'slower' | 'faster' | 'switch' | 'block' | null
├── applySeekAction(timer, action, now)         pure: does what the action means to the timer
├── splitLines(text) / joinLines(lines)         pure
├── reconcile(oldLines, newText, nowMs, seqRef) pure → new lines array
├── sortLines(lines, activeLine) → new array    pure
├── selfTest() → boolean                        pure, logs failures
└── (browser only) wire(document)               DOM: events, rendering, tick loop
```

The timer itself still works in milliseconds; only stamps, labels and the seek bar are in frames. The pure core never reads the clock or the DOM. Time comes in as `now` or `nowMs`, which keeps every rule testable in Node.

## Data model

```js
Line  = { text: string, stamp: { f: number /* integer frame count, 1/30 s */, seq: number } | null }
State = {
  lines:      Line[],    // always ≥ 1 line; joined with "\n" equals textarea.value
  nextSeq:    number,    // global creation counter for stamps (inside seqRef)
  timer:      Timer,
  activeLine: Line|null, // object identity, not index
}
Timer = { running: bool, base: ms, startedAt: ms /* perf.now at play or last rebase */, high: ms, rate: number /* 0.25…2 */ }
```

Invariants:

- A line with `text === ""` has `stamp === null`.
- A line with non-empty text has a stamp.
- Line **object identity** survives edits. Unchanged lines and the first changed line reuse their old objects. The active line is tracked by reference, so "did the caret leave the line?" is a reference comparison.

## Editor

The notepad is a **single `<textarea>`** with a stamp column beside it:

- The textarea grows to its content height (it does not scroll itself). The surrounding `.pad` container scrolls, so the text and the column scroll together.
- A hidden **mirror** `<div>` matches the textarea's width, font, padding and wrapping. It holds one `<div>` per line, with a zero-width space for empty lines. Each mirror line's `offsetTop` gives the y position of that line's stamp in the column. The mirror's total height sets the textarea's height.
- Tick: while running, a `requestAnimationFrame` loop calls `renderTimer`; it stops on pause. Play, pause and seek also render immediately.
- Events:
  - `input` → reconcile, re-render, then check the active line.
  - `selectionchange` / `keyup` / `mouseup` / `focus` → check the active line.
  - `blur` → sort with no active line.
  - `resize` → re-measure.
- **Reveal:** after each check, the caret's visual row (measured with a `Range` on the mirror) is scrolled fully into `.pad`. Chrome's own caret reveal stops a couple of pixels short, because the textarea itself never scrolls.
- **Blank-area click:** a `mousedown` on `.pad` outside the textarea focuses the textarea at the end of the text.
- **Keyboard:** one `keydown` listener on the seek bar and one on the textarea.
  - Seek bar: `seekKeyAction(e)`. `null` → leave the event alone. Otherwise `preventDefault`; `'switch'` focuses the notepad and restores the remembered caret; everything else goes to `applySeekAction`, then `renderTimer()` and `startTick()`.
  - Textarea: only `Tab` (no Ctrl/Alt/Meta). `preventDefault`, remember the caret as (line object, column) for both selection ends plus direction, then focus the seek bar. The textarea's `blur` handler runs the usual sort.
  - Play button `click` → toggle, then `seek.focus()`.
- **Check active line:** compute the line under `selectionEnd`. If it is a different object from `state.activeLine`, sort with the new active line, write the text back, and restore the selection by mapping each end as (line object, column).

## Alternatives considered

| Option | Why not |
|---|---|
| `contenteditable` with one `<div>` per line, stamp via CSS `::before` | Wrapping alignment comes free. But browsers normalize Enter, paste and merge inconsistently: they insert `<br>`, nest divs, and paste rich HTML. Mapping DOM mutations back to lines is fragile, so it is the riskier choice for the core behavior. |
| One `<input>` per line | Enter, Backspace-merge, multi-line paste, multi-line selection and arrow navigation would all have to be rebuilt by hand. |
| Textarea with `wrap="off"` (no soft wrap) | Stamp alignment becomes trivial (row × line-height), but long lines scroll sideways. Measuring with the mirror is cheap enough to keep wrapping. |
| Store stamps as ms (keep `t`) and only format in frames | Sorting would use hidden sub-frame ms, so two lines that both display `0:05.03` could sort in an order that doesn't match creation. Integer frames make what you see what sorts. |
| Decimal display (`M:SS.ss`, hundredths) | Readable as ordinary decimals, but hundredths aren't a multiple of 1/30, so the display would show values the stamps can't hold. You chose frames (Q2). |
| Third colon (`M:SS:FF`, broadcast timecode) | Under an hour, `1:05:17` is indistinguishable from `H:MM:SS`. |
| Keep `setInterval(100)` | Would visibly skip about two of every three frames. |
| Re-sort on every keystroke | Matches "always in order" literally, but lines would jump while you type. You chose sort-on-leave (Q13). |
| Global `keydown` on `document` with a "mode" variable | Focus already *is* the mode. Listening on the two elements avoids keeping a second copy of that state in sync. |
| Speed via a `setInterval` that adds scaled time | Drifts and stalls in background tabs. Scaling the wall-clock delta keeps R4's accuracy. |
| Remember the caret as raw offsets for Tab-back | Leaving the notepad sorts it, so offsets would point at different lines. Line objects + columns survive the sort. |
| Char-level diff to attribute stamps | More precise when identical lines are duplicated, but more complex. Line-level prefix/suffix matching covers every case in behavior.md. |

## Known limitations

1. **No persistence.** Reloading or closing the tab loses everything. This is by design (out of scope).
2. **Native undo (Ctrl+Z)** is left alone. It changes text, which is reconciled like any other edit. Text restored by undo may get a new stamp instead of its original one.
3. **Identical adjacent lines.** Line-level matching cannot tell identical lines apart. Inserting a duplicate of a neighbouring line may put the new stamp on the other copy. The text is identical, so only those two lines' stamps can swap.
4. **Select-all and retype** keeps the first old stamp (S16), because the result is treated as an edit of the first line.
5. **Scaling.** Each keystroke re-renders the whole mirror and column, which is O(lines). That is fine for notes up to a few thousand lines; it is not tested beyond that.
6. **Exactness of the textarea/mirror match.** Stamp alignment depends on the CSS metrics being identical. Unusual browser zoom levels or fonts could put a stamp off by a pixel or so.
7. Chrome/Edge are the targets. Only headless Chrome was tested (see plan.md Status). Edge shares Chrome's engine; Firefox is untested.
8. **Blank separators stay at their row index** (D2). As stamped lines sort around them, a blank line can end up between different lines than the ones it originally separated.
9. **Sorting rewrites the textarea's value.** In Chrome this can clear the native undo history at that point, so Ctrl+Z may not reach edits made before a sort.
10. **`FF` looks like a decimal.** `0:01.15` means frame 15 (1.5 s), not 1.15 s. The rate is fixed and documented, but the format can be misread.
11. **Stamp accuracy is bounded by input handling.** A stamp is taken when the browser delivers the `input` event, which normally lands within a few ms of the keypress, well inside one 33 ms frame. Under heavy load it can be late by a frame.
12. **Displays below 30 Hz** would skip frames in the label. Stamps are unaffected because they read the wall clock, not the display.
13. **Background tabs** pause `requestAnimationFrame`. The time is still correct on return because it's wall-clock based; the label just doesn't update while hidden.
14. **Speed resets to 1× on reload**, like everything else (nothing persists).
15. **Tab characters can't be typed** in the notepad any more, since Tab moves to the seek bar (K18). Pasted tabs still work.
16. **Shortcuts need the seek bar focused.** While typing, you must press Tab first. There is no shortcut that works from inside the notepad.
17. **Keys follow the character, not the key position** (D18). On layouts where `<`, `>`, `,` or `.` need unusual combinations, the shortcut needs that same combination. A combination that needs AltGr (reported as Ctrl+Alt on Windows) is ignored by D19.
18. **Auto-repeat speed is the OS keyboard repeat rate.** Holding `.` steps frames at that rate, not at 30 per second.
19. **Speed is not shown on stamps.** A stamp is timer time; it does not record what speed was in effect.

