## Feature workflow

This repo builds features with the `feature` skill: `/feature <idea>` starts one, and `/feature` resumes.

- `feature/<name>`: work in progress, one branch per feature
- `stage`: `main` + the feature under test. Rebuilt by Claude; never commit to it.
- `main`: Claude never commits or pushes to it. On `ship`, Claude pushes the feature branch and opens a PR; the user merges it on GitHub.
- Specs and plans live in `docs/features/<name>/`, the product in `docs/PRD.md`, and parked ideas in `docs/BACKLOG.md`.

## Commands

Run from the repo root. `$PT` is a scratch folder outside the repo with `puppeteer-core` installed (`mkdir -p $PT && (cd $PT && npm i puppeteer-core)`); never install it in the repo.

- Full test suite: `node -e "process.exit(require('./app.js').selfTest()?0:1)" && NODE_PATH=$PT/node_modules node tests/page-test.js "$PWD" $PT/scribe.png` (~15 s)
- One test file (fast loop): `node -e "process.exit(require('./app.js').selfTest()?0:1)"` (<1 s)
- Lint / typecheck: none
- Run the app: double-click `index.html` (served from `file://`)
- Smoke check: the self-test command → `Scribe.selfTest: N/N passed`; the page test also writes screenshots next to `$PT/scribe.png`, so look at them.

## Tests

- Two layers: `selfTest()` inside `app.js` covers the pure core in Node and the browser; `tests/page-test.js` drives the real page in headless Chrome (`/usr/bin/google-chrome`) and fails on any console error.
- The test-lock pathspec is `tests/`. Self-test cases live in `app.js`, outside the lock, so check their diff by hand: never edit or delete an existing `eq(...)` case to make code pass.
- Name each new check after the criterion it proves: `AC-3: …`. Older checks use legacy IDs (S12, K7b, D25…).
- Test behavior through public interfaces. Mock only the clock (`performance.now`) and the file picker.
- Committed tests are append-only. Never edit or delete one to make code pass.

## Code style

- Keep logic in pure functions that take `now`; DOM wiring lives in `wire()`. See docs/PRD.md for the platform constraints.
