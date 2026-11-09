## Ground rules (every session)
 
- **Sync first.** At session start, make sure the repo `jgray9/Scribe` is cloned at `/home/claude/scribe`. Attach it with push access if it's missing. Then `git fetch origin` before doing anything else.
- **Never commit or push to `main`**, even if asked. All work goes on branches, and merging is the user's call.
- **Push branches** when each phase is done, so the work exists outside the session.
- **Keep scope tight.** Anything the user marks out of scope is listed as such in the docs and is not built.
## Phase 1 — Clarify (no files written)
 
1. Restate nothing. Go straight to a **numbered list of questions**, grouped by area (platform, core behavior, edge cases, saving/export, repo workflow).
2. Give every question a **suggested default in [brackets]**. That way the user can answer by number, accept defaults, or mark items "out of scope."
3. Include a question on the repo workflow, such as the branch name and whether to push.
4. Wait for answers. Don't write any files yet.
## Phase 2 — Design docs
 
On branch **`docs/<topic>`**, created from the latest `main`, write a `docs/` folder:
 
| File | Contents |
|---|---|
| `README.md` | Index of the docs and how the app will run |
| `requirements.md` | Numbered requirements (R1, R2…), platform constraints, explicit **out-of-scope** list |
| `behavior.md` | The exact behavior spec, with tables for every edge case. This is the source of truth. |
| `architecture.md` | Files, modules, data model, alternatives considered, **known limitations** |
| `pseudocode.md` | Pseudocode for the non-trivial logic |
| `plan.md` | Milestones that each end in something runnable, plus a **manual test checklist** |
| `open-questions.md` | Decisions made on the user's behalf, each with the current choice and the alternative |
 
Then commit and push the branch. Reply with a short summary of the key design choices and limitations, and point the user at `open-questions.md`. Do not move to phase 3 until explicitly instructed to.
 
## Phase 3 — Build
 
1. Create branch **`feature/<topic>`** from the docs branch, so the build sits on top of the docs.
2. Create a task list covering the skeleton, the logic, verification, and docs/commit/push.
3. Build milestone by milestone, as the plan lays out.
4. **Keep logic testable without a browser.** Pure functions (timer, model, formatting) are separate from DOM wiring. `Scribe.selfTest()` runs in both the browser console and Node:
   `node -e "process.exit(require('./app.js').selfTest()?0:1)"`
5. **Drive the real page in headless Chrome.**
   - Install `puppeteer-core` in the session scratchpad. Never install it in the repo.
   - Use the browser at `/usr/bin/google-chrome` and open `file://…/index.html`.
   - Script the manual checklist: type, click, seek, paste, resize.
   - Assert on the DOM, and fail on any console errors.
6. **Look at a screenshot** to check the layout visually.
7. When a test fails, decide whether the bug is in the test or in the app before changing code. Say which it was.
## Phase 4 — Wrap up
 
1. **Update the docs** wherever the build differs from the plan.
2. Add an honest **Status** line to `plan.md` that says what was verified and how. It should name which browsers were tested and what was covered by self-tests versus page tests.
3. Update the root `README.md` with how to run the app and how to run the self-test.
4. Commit with the session's attribution lines, then push the feature branch.
5. Send the user the screenshot. Reply with:
   - what was built
   - how to run it
   - anything added beyond the spec
   - the main limitation
   - a note that merging to `main` is theirs to do
## Scribe-specific constraints
 
- The app runs by **double-clicking `index.html`**. There are no installs, servers, or build steps, and every file sits in the same folder.
- Load JavaScript as a **classic `<script>`**, because browsers block ES modules on `file://`. Wrap code in an IIFE, and export with `module.exports` when it is available so Node can run the self-test.
- Personal use only. Accessibility and public-release polish are not goals.
