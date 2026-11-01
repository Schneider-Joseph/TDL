# TDL Test Suite — Run This Yourself

TDL now includes a **dependency-free simulated smoke test** in [smoke.mjs](smoke.mjs).

## Quick start on Mac or Windows

1. Install [Node.js](https://nodejs.org/) if you do not already have it.
2. Clone/download the TDL repository from GitHub.
3. Open Terminal (Mac) or PowerShell/Terminal (Windows) in the **repository root** (the folder with `README.md`).
4. Run:

```bash
node tests/smoke.mjs
node tests/ui-contract.mjs
node tests/momentum.mjs
node tests/connections.mjs
```

It should print `PASS startup` and `PASS behavior` lines, ending with `TDL simulated smoke checks passed.` If a check fails, the process exits with an error message and stack trace.

## Which test does what?

- `node tests/smoke.mjs` runs an in-memory browser simulation for tasks, history, full-page routes, inbox, calendar scheduling and planner rendering.
- `node tests/connections.mjs` uses a fake task database to check inverse links, cycles, hierarchy, missing references, confirmation before unlinking and HTML escaping.
- `node tests/momentum.mjs` uses a deterministic fake clock to test 30-day aging, 3–5 commitment caps, midnight rollover, 2-minute focus, activity analytics, inactivity checks and deletion confirmation.
- `node tests/ui-contract.mjs` checks the Studio UI structure, full-page routing, removed focus-quiz controls, button IDs, script loading, offline assets, responsive CSS selectors, PWA manifest and JavaScript syntax.

All run **without external Node packages** or private user tasks. Neither is a substitute for a real visual browser test.

## What the test checks

- The original inline application and all six extension JavaScript modules can initialize in a simulated browser environment.
- Task creation still writes to `tdl.tasks.v1`.
- Creating/editing a task records a history entry.
- Undo and Redo restore expected task data.
- Undoing a recurring completion plus creation of the next instance reverses both changes.
- The new in-app inbox can detect a task due today.
- Inbox, Week and Planner open dedicated routed pages rather than overlays.
- Direct hash navigation works; Task History remains a separate dialog.
- Calendar timeline, Agenda, work-block editor and saving a work block do not alter task deadlines.
- Connections opens its own page, creates validated inverse links, survives missing tasks and is included in Full backup.
- Planner nodes store an optional real task ID without mutating any task.
- Random timer focus questions are removed, while timer controls and history remain.
- Full backup includes task/history/inbox and scheduled work-block storage keys.

## Safety

The tests use **in-memory fake localStorage and fake tasks**. It does **not** open your real Chrome profile, contact Firebase, connect Blackboard, call GitHub APIs, or read your saved assignments.

## What it DOES NOT prove

This is a **mock-DOM smoke test**. It does **not** verify real browser rendering, CSS, pointer dragging, touch gestures, file picker behavior, macOS notifications, service-worker offline installation, or actual backup restore interaction.

Before treating the release as fully tested, do an additional manual Chrome run in a **separate local origin**, using fake data.

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/app/`, then follow the [New Features User Guide](../docs/NEW_FEATURES_USER_GUIDE.md). Try all four tools, Full backup, and Full restore. **Do not clear the real TDL site data to troubleshoot a test.**

See the [release safety checklist](../docs/plans/00_SAFETY_AND_RELEASE_CHECKLIST.md) for the full recovery procedure.
