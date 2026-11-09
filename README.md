# Scribe

A timed notepad. A video-style timer sits at the top: play, pause, and scrub it with the seek bar. Every non-empty line you type is stamped with the timer's time at the moment the line became non-empty, and stamped lines are kept in timestamp order.

## Run it

Double-click `index.html`. Nothing needs to be installed and there is no server. `index.html`, `style.css` and `app.js` just need to stay in the same folder.

- **Play/Pause** starts and stops the timer.
- Drag the **seek bar** to jump to any time you have already reached.
- Type below. Each line's stamp appears in the left column.
- A line moves into time order when you leave it: Enter, arrow keys, a click elsewhere, or clicking Play or the seek bar.

Notes are **not saved**. Reloading or closing the page clears them.

## Self-test

In the browser console:

```js
Scribe.selfTest()   // → true, and logs "Scribe.selfTest: N/N passed"
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

Design docs are in [`docs/`](docs/README.md). [`docs/behavior.md`](docs/behavior.md) is the source of truth for how stamps and ordering work.
