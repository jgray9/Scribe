# Requirements

## Platform constraints

- **P1.** The app runs by double-clicking `index.html` and is served from `file://`. There are no installs, servers, build steps, or network requests.
- **P2.** All files sit in the repo root: `index.html`, `style.css`, and `app.js`.
- **P3.** JavaScript is one classic `<script>`, written as an IIFE. It sets `window.Scribe`, and also `module.exports` when that exists.
- **P4.** Target browsers are the latest desktop Chrome and Edge. Firefox is best-effort. There is no mobile layout.
- **P5.** The app is for personal use. Accessibility and public-release polish are not goals.

## Functional requirements

### Timer

- **R1.** The timer shows the current time as `M:SS` under one hour and `H:MM:SS` from one hour on. It displays whole seconds, rounded down.
- **R2.** On page load the timer is **paused at 0:00**.
- **R3.** A single **Play/Pause** button toggles between running and paused.
- **R4.** Elapsed time is computed from the wall clock (`performance.now()`), so it stays accurate when the tab is in the background or the display updates late.
- **R5.** A **seek bar** spans 0 to the **furthest time the timer has reached** (the high-water mark), and grows as the timer runs past it. You cannot seek beyond the high-water mark.
- **R6.** Seeking sets the timer to the chosen time and keeps its running or paused state.
- **R7.** Seeking and pausing never change existing stamps.

### Notepad and stamps

- **R8.** A multi-line notepad sits below the timer. You can type into it whether the timer is running or paused.
- **R9.** A line is **empty** only when it has zero characters. A line containing only spaces or tabs is non-empty.
- **R10.** Every non-empty line has a **stamp**: the timer's time at the moment the line became non-empty. A line with no stamp is always empty.
- **R11.** Once a line is stamped, editing it never changes the stamp while it stays non-empty.
- **R12.** A line that becomes empty loses its stamp. If it becomes non-empty again, it gets a new stamp at that moment.
- **R13.** Stamped lines are kept in ascending timestamp order. A line is moved into order **when you leave it**, meaning the caret moves to another line or the notepad loses focus. Until then it stays where it is.
- **R14.** When two stamps are equal, the line that was **stamped first** comes first.
- **R15.** Stamps appear in a **column to the left of each line**. They are not part of the text. On a line that wraps, the stamp sits beside the first visual row.
- **R16.** If you press **Enter in the middle of a line**, the text before the caret keeps the stamp. The text after the caret becomes a new line stamped with the current time.
- **R17.** If **Backspace at the start of a line** merges it into the line above, the merged line keeps the upper line's stamp.
- **R18.** If you **paste** text spanning multiple lines, every new non-empty line gets the current time, in pasted order. Pasted order is also creation order.
- **R19.** If you delete a **selection spanning several lines**, the merged line that survives keeps the stamp of the first stamped line in the deleted range.

### Testing

- **R20.** All logic that does not touch the page is held in pure functions: the timer, time formatting, line reconciliation, and sorting. `Scribe.selfTest()` exercises those functions and returns `true` or `false` in both the browser and Node.

## Out of scope

These items are deliberately not built.

| Item | Note |
|---|---|
| Visual style and themes | Plain browser defaults plus the minimum layout CSS. No dark mode and no design work. |
| Keyboard shortcuts | Play/pause and seek are mouse-only. |
| Clicking a stamp to seek | |
| Manual editing of stamps | |
| Undo/redo of stamps | No custom undo. See the limitation note in architecture.md. |
| Reset / "New" button | Reload the page to start over. |
| Persistence | There is no autosave. **Reloading or closing the page loses the notes.** |
| Export, copy-all, download | |
| Import, multiple notes | |
| Mobile layout, accessibility, public-release polish | |
