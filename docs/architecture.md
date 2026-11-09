# Architecture

## Files

| File | Role |
|---|---|
| `index.html` | Markup: the timer bar (Play/Pause button, time label, seek bar, max label) and the notepad area (stamp column, textarea, hidden measuring mirror). Loads `style.css` and `app.js` with a classic `<script>`. |
| `style.css` | The minimum layout: a sticky timer bar and a two-column notepad. Textarea and mirror metrics (font, padding, width, wrapping) must match exactly. |
| `app.js` | One IIFE. A pure core, DOM wiring when `document` exists, and the self-test. Exports `Scribe` to `window` and to `module.exports`. |

## Modules inside `app.js`

```
Scribe
├── formatTime(ms) → "M:SS" | "H:MM:SS"        pure
├── createTimer() → timer object               pure (every method takes `now`)
│     play(now) pause(now) toggle(now) seek(ms, now) time(now) max(now) running
├── splitLines(text) / joinLines(lines)         pure
├── reconcile(oldLines, newText, nowMs, seqRef) pure → new lines array
├── sortLines(lines, activeLine) → new array    pure
├── selfTest() → boolean                        pure, logs failures
└── (browser only) wire(document)               DOM: events, rendering, tick loop
```

The pure core never reads the clock or the DOM. Time comes in as `now` or `nowMs`, which keeps every rule testable in Node.

## Data model

```js
Line  = { text: string, stamp: { t: number /* ms */, seq: number } | null }
State = {
  lines:      Line[],    // always ≥ 1 line; joined with "\n" equals textarea.value
  nextSeq:    number,    // global creation counter for stamps (inside seqRef)
  timer:      Timer,
  activeLine: Line|null, // object identity, not index
}
Timer = { running: bool, base: ms, startedAt: ms /* perf.now at play */, high: ms }
```

Invariants:

- A line with `text === ""` has `stamp === null`.
- A line with non-empty text has a stamp.
- Line **object identity** survives edits. Unchanged lines and the first changed line reuse their old objects. The active line is tracked by reference, so "did the caret leave the line?" is a reference comparison.

## Editor

The notepad is a **single `<textarea>`** with a stamp column beside it:

- The textarea grows to its content height (it does not scroll itself). The surrounding `.pad` container scrolls, so the text and the column scroll together.
- A hidden **mirror** `<div>` matches the textarea's width, font, padding and wrapping. It holds one `<div>` per line, with a zero-width space for empty lines. Each mirror line's `offsetTop` gives the y position of that line's stamp in the column. The mirror's total height sets the textarea's height.
- Events:
  - `input` → reconcile, re-render, then check the active line.
  - `selectionchange` / `keyup` / `mouseup` / `focus` → check the active line.
  - `blur` → sort with no active line.
  - `resize` → re-measure.
- **Check active line:** compute the line under `selectionEnd`. If it is a different object from `state.activeLine`, sort with the new active line, write the text back, and restore the selection by mapping each end as (line object, column).

## Alternatives considered

| Option | Why not |
|---|---|
| `contenteditable` with one `<div>` per line, stamp via CSS `::before` | Wrapping alignment comes free. But browsers normalize Enter, paste and merge inconsistently: they insert `<br>`, nest divs, and paste rich HTML. Mapping DOM mutations back to lines is fragile, so it is the riskier choice for the core behavior. |
| One `<input>` per line | Enter, Backspace-merge, multi-line paste, multi-line selection and arrow navigation would all have to be rebuilt by hand. |
| Textarea with `wrap="off"` (no soft wrap) | Stamp alignment becomes trivial (row × line-height), but long lines scroll sideways. Measuring with the mirror is cheap enough to keep wrapping. |
| Re-sort on every keystroke | Matches "always in order" literally, but lines would jump while you type. You chose sort-on-leave (Q13). |
| Char-level diff to attribute stamps | More precise when identical lines are duplicated, but more complex. Line-level prefix/suffix matching covers every case in behavior.md. |

## Known limitations

1. **No persistence.** Reloading or closing the tab loses everything. This is by design (out of scope).
2. **Native undo (Ctrl+Z)** is left alone. It changes text, which is reconciled like any other edit. Text restored by undo may get a new stamp instead of its original one.
3. **Identical adjacent lines.** Line-level matching cannot tell identical lines apart. Inserting a duplicate of a neighbouring line may put the new stamp on the other copy. The text is identical, so only those two lines' stamps can swap.
4. **Select-all and retype** keeps the first old stamp (S16), because the result is treated as an edit of the first line.
5. **Scaling.** Each keystroke re-renders the whole mirror and column, which is O(lines). That is fine for notes up to a few thousand lines; it is not tested beyond that.
6. **Exactness of the textarea/mirror match.** Stamp alignment depends on the CSS metrics being identical. Unusual browser zoom levels or fonts could put a stamp off by a pixel or so.
7. Chrome/Edge are the targets. Firefox is untested unless noted in plan.md's Status.
