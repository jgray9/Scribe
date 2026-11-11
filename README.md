# Scribe

A timed notepad. A video-style timer sits at the top: play, pause, and scrub it with the seek bar. Every non-empty line you type is stamped with the timer's time at the moment the line became non-empty, to the frame (1/30 s), and stamped lines are kept in timestamp order.

The timer can run at 0.25×–2× speed and is driven from the keyboard when the seek bar is focused.

Times read `M:SS.FF` (or `H:MM:SS.FF` past an hour). `FF` is the **frame number, 00–29**, not hundredths: `0:01.15` is 1.5 s.

## Run it

Double-click `index.html`. Nothing needs to be installed and there is no server. `index.html`, `style.css` and `app.js` just need to stay in the same folder.

- **Play/Pause** starts and stops the timer.
- Drag the **seek bar** to jump to any time you have already reached. It moves in steps of one frame.
- Type below. Each line's stamp appears in the left column.
- A line moves into time order when you leave it: Enter, arrow keys, Tab, a click elsewhere, or clicking Play or the seek bar.

### Keys

`Tab` switches between the notepad and the seek bar (clicking Play also puts you on the seek bar; it gets a blue outline). With the **seek bar** focused:

| Key | Does |
|---|---|
| `Space` / `k` | Play / pause |
| `j` / `←` | Back 10 s |
| `l` / `→` | Forward 10 s (up to the furthest time reached) |
| `,` / `.` | Back / forward one frame (pauses first if running) |
| `<` / `>` | Speed −/+ 0.25×, from 0.25× to 2× (shown at the right of the bar) |

In the notepad every key types normally, except `Tab`. Speed resets to 1× on reload.

Notes are **not saved**. Reloading or closing the page clears them.

## Self-test

In the browser console:

```js
Scribe.selfTest()   // → true, and logs "Scribe.selfTest: 124/124 passed"
```

In Node, from this folder:

```sh
node -e "process.exit(require('./app.js').selfTest()?0:1)"
```

## Page test (optional)

`tests/page-test.js` drives the real page in headless Chrome. It needs `puppeteer-core`, installed **outside** this repo:

```sh
mkdir -p /tmp/pt && (cd /tmp/pt && npm i puppeteer-core)
NODE_PATH=/tmp/pt/node_modules node tests/page-test.js "$PWD" /tmp/scribe.png
```

It expects Chrome at `/usr/bin/google-chrome`.

## Docs

[`docs/PRD.md`](docs/PRD.md) describes the product, its constraints and the features shipped so far. Each feature has a spec and a plan in `docs/features/<name>/`. The stamp and ordering rules are in the [`timed-notepad` spec](docs/features/timed-notepad/SPEC.md), with times moved to frames by [`frame-precision`](docs/features/frame-precision/SPEC.md). Parked ideas are in [`docs/BACKLOG.md`](docs/BACKLOG.md).
