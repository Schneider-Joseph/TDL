# Roadmap, Design Decisions, and Known Limitations

**Purpose:** Keep a clear record of what TDL does, which ideas have been discussed, and which decisions were deliberate. This prevents a future change from accidentally reversing something you wanted.

**As of October 2026:** No Firebase sync or Blackboard integration exists in production. This is a planning document, not a list of installed features.

## 1. Principles guiding TDL

1. **You can maintain it.** The owner should be able to read, modify, test, and roll back each feature.
2. **Don't endanger tasks.** Protect local data and verify backups before risky changes.
3. **Offline-first.** Basic task management should work with no connection after the app has been cached.
4. **Manual control.** The owner decides what tasks, categories, projects, and planner nodes exist.
5. **No invisible cloud changes.** Any future account/sync rollout must be opt-in, explicit, and reversible.
6. **No unapproved school-platform integration.** Blackboard was tried as an idea and is **not** in the current app or active plan.

## 2. What already exists

- Task CRUD, flexible categories, priorities, notes, due dates/times, URLs and subtasks.
- Today/upcoming/overdue/completed/category views; statistics; search and sorting.
- Recurrences, focus timer/history, randomized focus checks.
- Local deadline notifications and 90-minute overdue check-ins while running.
- Locked/unlocked optional activity bank.
- JSON task/activity export and import.
- Installable PWA with offline app-shell caching.
- A documentation library and explicit all-rights-reserved notice.

See [Feature Guide](FEATURES.md) for details and exceptions.

## 3. Designed but NOT implemented: TDL Canvas

### The idea

A **user-editable freeform canvas plus decision-tree planner**. You create and arrange the boxes yourself, then connect them with labeled arrows.

**Suggested first version:**

- Create multiple canvases (one per project or goal).
- Add a text node; edit title and longer notes.
- Drag nodes anywhere in a large workspace.
- Draw arrows between nodes, including branching paths and cycles.
- Label connectors with custom text: Yes, No, Depends, Requires, or anything else.
- Pan/zoom around large projects.
- Save locally; export/import your canvas data.
- Provide Delete and Undo for accidental edits.

**Not part of the first version:** Automatic AI-generated roadmaps, silently moving nodes, automatically completing tasks, or depending on Firebase.

**Future enhancement:** Link some canvas nodes to actual TDL tasks. That needs an explicit design for what happens when tasks are deleted, recurring, or completed on another device.

**Implementation questions before coding:**

1. How are node positions stored (canvas coordinates)?
2. What happens when a node with incoming/outgoing arrows is deleted?
3. Can a connector reference a node that no longer exists?
4. How do you select/drag nodes on touch devices?
5. How do you export/restore a canvas without breaking task backup files?
6. What layout remains accessible to keyboard-only users?

**Status:** Concept only. There is no Canvas button or canvas data model in the current app.

## 4. Designed but NOT implemented: Firebase sync

The goal is one task collection accessible from different authenticated devices, with local offline behavior and safe reconciliation.

**Do not begin by uploading existing localStorage arrays wholesale.** Required work includes account identity, per-user Security Rules, data schemas, backups, merge previews, conflict handling, deletion tombstones, and failure recovery.

See [Firebase Sync Design](FIREBASE_SYNC_DESIGN.md). That file is the canonical technical plan; this roadmap is only the summary.

## 5. Explicitly postponed: third-party school integration

Blackboard calendar import was considered and briefly prototyped, then rolled back. The repository's current app does **not** contain that integration, and it is not in the active roadmap.

Do not reintroduce Blackboard calendars, APIs, credentials, or automatic assignment scraping unless the owner changes that decision.

A **manual Paste assignment** helper remains part of the current app; it is not a school connection.

## 6. Known limitations worth learning from

| Area | Current limitation | What to test before fixing |
| --- | --- | --- |
| Priority sorting | The current comparator uses `value || 1`. Priority `high` maps to `0`, which `|| 1` turns into `1`; high and medium can end up treated as equal. | Create high, medium, low tasks with equal dates and verify priority order |
| Focus session time | Active milliseconds are accrued in ticks with a cap per increment, so suspended tabs can undercount. | Compare recorded duration after minimizing/sleeping vs wall-clock timer |
| Local storage | Tasks/settings stay in one browser profile/origin; no automatic backup server exists. | Back up before browser reset or cross-device import |
| Ordinary JSON export | Includes tasks and activities, not focus history and settings. | Verify file keys before relying on it as a complete archive |
| Import behavior | Replaces local tasks, not a merge. | Back up both devices and test import on a disposable profile |
| Offline PWA | Requires a successful initial load/cache; cache updates can be confusing. | Install/offline/reload/upgrade tests in an isolated profile |
| Browser reminders | No guaranteed notifications while app closed. | Test open tab, background tab, closed app separately |
| Recurrence | Creates the next instance after completion, not an entire future schedule. | Test daily/weekdays/month-end/year-end and repeat-until |
| App structure | A single large HTML file increases regression risk. | Split into modules only after baseline tests are in place |
| Browser validation | JavaScript syntax checks are not the same as full interactive tests. | Build a repeatable browser smoke-test suite |

These observations are not claims that all issues have been fixed. Document them, make a reproducible test, then implement a change on a branch.

### Example: learning to fix the priority comparator

**Current buggy idea:**

~~~js
({high: 0, medium: 1, low: 2}[priority] || 1)
~~~

Why it fails: In JavaScript, `0` is **falsy**, so `0 || 1` evaluates to `1`. The intended “high” score disappears.

**Proposed clearer approach (example, not committed):**

~~~js
const ranks = {high: 0, medium: 1, low: 2};
const rank = (priority) => Object.prototype.hasOwnProperty.call(ranks, priority)
  ? ranks[priority]
  : 1;
~~~

Before deploying, update *all* sort comparators that use the old pattern and test edge cases. A one-line bug fix can be an excellent exercise in reading production code.

## 7. Suggested work order

**First: Reliability**

- Add a repeatable browser smoke-test suite.
- Test backup/restore and app upgrades.
- Address straightforward known bugs such as priority sorting.
- Document recovery steps and make sure every change can be rolled back.

**Second: Maintainability**

- Split the large HTML file into carefully scoped modules.
- Put data schema and storage functions behind one well-tested interface.
- Add automated tests for date/recurrence logic, filtering and notifications.

**Third: Optional new workspaces**

- Prototype a Canvas on a branch with local-only data.
- Design independent canvas export/import formats.
- Avoid coupling experimental UI directly to production task storage.

**Fourth: Optional cloud sync**

- Create Firebase **development** infrastructure under the owner's control.
- Test rules and migrations with fake data.
- Build opt-in merge preview and offline conflict resolution.
- Release to real devices only when the [acceptance tests](FIREBASE_SYNC_DESIGN.md#part-11--testing-and-rollout-gates) pass.

The order can change, but **data safety and code comprehension are prerequisites for high-risk features**.

## 8. How to maintain this roadmap

For each new feature:

1. Record **why** you want it.
2. Write its desired behavior in plain English.
3. List the data it reads/writes.
4. Decide whether it must work offline.
5. Identify what happens when it fails.
6. Define one or two tests proving it works.
7. Implement in a Git branch.
8. Update this document and the Feature Guide when merged.

A good project decision record helps future you remember *why* the code is written a certain way, not merely *what* it does.
