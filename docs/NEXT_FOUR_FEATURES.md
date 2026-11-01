# TDL Next Four Features — Owner's Development Master Plan

> **STATUS: DESIGN ONLY — OCTOBER 31, 2026.** Nothing in this plan is running in production. No app source, existing task data, Firebase project, or current notifications were changed to create this plan. The feature specifications below are proposals you can review and edit.

## What this document is for

This is the home base for developing **Notification Center**, **Undo + Task History**, **Weekly Calendar**, and **Visual Planner**. It is written so the owner of TDL can understand **what we are building, why, where the eventual code will go, how to adjust the behavior manually, how to test it, and how to undo a bad release**.

Read it alongside [Start Here](START_HERE.md), [How TDL Works](HOW_TDL_WORKS.md), [Data and Backups](DATA_AND_BACKUPS.md), and [Editing TDL](EDITING_TDL.md).

## The four features, explained normally

| Feature | What you will see | What it should solve | Detailed design |
| --- | --- | --- | --- |
| **Notification Center** | A bell, unread count, inbox, snooze controls, and a small alert history | Missed/blocked OS notifications should not hide overdue work | [Notification Center](plans/01_NOTIFICATION_CENTER.md) |
| **Undo + Task History** | Undo/Redo after changes, a history drawer, and Restore for deleted tasks | A mistaken click should not permanently destroy important work | [Undo and History](plans/02_UNDO_AND_HISTORY.md) |
| **Weekly Calendar** | Monday–Sunday / configurable week view of deadlines and optional study blocks | Know what is due and when you plan to do it | [Weekly Calendar](plans/03_WEEKLY_CALENDAR.md) |
| **Visual Planner** | Fully editable boards, text boxes, arrows, and a zoomable canvas | Break complex projects into clear steps and decisions | [Visual Planner](plans/04_VISUAL_PLANNER.md) |

**These features remain local-first.** There is no requirement to use Firebase, connect Blackboard, create an account, or buy a subscription. Automatic multi-device synchronization is a different project and is currently **not implemented**. The visual planner also must **not** silently create tasks or restructure plans for you.

## Suggested sequence: user priority vs safe engineering order

You chose this user-facing priority: **Notification Center → Undo + Task History → Weekly Calendar → Visual Planner**.

I recommend implementing a **small recovery foundation first**, because the later features will all create new kinds of data:

| Release | What we build | Why this order? | Do not release until... |
| --- | --- | --- | --- |
| **R0: Recovery foundation** | Read-only data inventory, a verified full backup/export & restore plan, baseline smoke tests and test branch | Protects all current tasks and settings | Test backup restores into an isolated test profile |
| **R1: Notification Center** | Persistent inbox, unread/read, snooze, deadline event generation while TDL is open | Immediately addresses missing reminder visibility | Alerts survive refresh, don't duplicate, and never claim closed-app push |
| **R2: Undo + Task History** | Undo/Redo for task operations, bounded recoverable history, deleted-task restoration | Adds the needed safety layer for calendar/planner editing | Undo works after recurring completion and deletion; no data loss on failure |
| **R3: Weekly Calendar** | Week navigation, existing task deadlines, optional separate scheduled work blocks | Easier once safe task mutations are available | Changing a study block does not silently change task due dates |
| **R4: Visual Planner** | Local boards, nodes, connections, drag/pan/zoom, export/restore | Largest interface and storage scope | All board actions work with mouse, keyboard and touch; backup/undo works |

**Important tradeoff:** Persistent Undo could be moved ahead of the Notification Center if the R0 safety work shows the inbox will otherwise require risky data changes. We will not shortcut backup testing to meet the listed order.

**One release = one narrow change.** Avoid developing all four inside one giant update to the current HTML file.

## The source code we have today

Current TDL is largely in [app/index.html](../app/index.html), with [app/sw.js](../app/sw.js) for offline caching.

The current browser storage keys include:

| Existing key | Used for | Will we preserve it? |
| --- | --- | --- |
| `tdl.tasks.v1` | Tasks and subtasks | **Yes** |
| `tdl.activities.v1` | Optional activity bank | **Yes** |
| `tdl.focusSessions.v1` | Focus session records | **Yes** |
| `tdl.settings.v1` | Timer and focus preferences | **Yes** |
| `tdl.overdueCheckins.v1` | 90-minute modal cooldowns | **Yes** |
| `tdl.notificationHistory.v2` | Accepted deadline notification deduplication | **Yes; separate from inbox** |
| `tdl.notificationPrompt.v1` | Whether permission prompt was answered | **Yes** |

At present, ordinary **Export** includes only tasks and activities. Ordinary **Import** replaces tasks and, if supplied, activities: it does **not merge** them. That is why R0 must improve recovery before feature work. See [Data and Backups](DATA_AND_BACKUPS.md).

## Proposed storage — not created yet

| Suggested key/table | Feature | What it would contain |
| --- | --- | --- |
| `tdl.inbox.v1` | Notification Center | Events, read state, snoozes, timestamps, references to task IDs |
| `tdl.taskHistory.v1` or a versioned IndexedDB store | Undo/History | Bounded actions, before/after values, recovery metadata |
| `tdl.timeBlocks.v1` | Weekly Calendar | Planned study/work blocks, separate from assignment deadlines |
| `tdl.boards.v1` or versioned IndexedDB stores | Visual Planner | Board metadata, nodes, labeled connections, positions |

**These names are proposals, not present storage keys.** Do not write an empty value to a live key or rename existing keys as a shortcut. We should decide the storage engine after running quota and restore tests. Large histories and boards may justify **IndexedDB** rather than unlimited `localStorage`.

A robust backup format should clearly include **tasks, activities, focus history, settings, inbox, calendar blocks, and boards** while excluding or carefully handling OS-specific notification permissions and ephemeral states. We should make restoration a preview-and-confirm operation, preserve unknown fields, and support older `version: 1` backups.

## The central safety design

### A. Backup before migration

1. Export the existing task/activities backup on the device you actually use.
2. Make an optional full read-only snapshot of **every current `tdl.*` key** per [Data and Backups](DATA_AND_BACKUPS.md).
3. Verify downloaded backup content before trusting it.
4. Build a new versioned **full backup** format with validation and an isolated restore test.
5. Keep previous backups in private storage. **Never commit private backups to the public repository**.

**A download button saying “Saved” does not prove the file is recoverable.** R0 requires a test restore in a throwaway browser profile/origin, and a comparison of record counts and IDs.

### B. Separate old and new data

- New features must **read existing task IDs** instead of copying task arrays into separate stores.
- A calendar event referencing a task must not become a second task record.
- A visual-planner node can reference a task *later*, but an unlinked node must not create a task automatically.
- A notification references a task by ID; it should still display a sensible historical message if that task is later deleted.
- A failed write to a new feature must not overwrite `tdl.tasks.v1`.

### C. No destructive silent updates

- **Never clear localStorage, Cache Storage, or browser site data** to troubleshoot without verified backups.
- **Never reset or rename `tdl.tasks.v1` without an explicit migration.**
- Keep legacy storage untouched until a migration is proven reversible.
- Show a meaningful warning before bulk delete, import/restore, or board deletion.
- Validate imported JSON and reject malformed, oversized, or executable content.
- Escape task/node text before HTML insertion.
- Ensure “Undo” does not undo unrelated work after refresh without explicit context.

### D. Recovery when an update fails

1. Stop making new data-changing edits in that browser.
2. Preserve the current storage state (even if the UI is blank).
3. Use the last verified task/full backup.
4. Revert the **code commit**, not browser data.
5. Test recovered code on a separate browser origin/profile.
6. Confirm tasks and the new feature's data can both be read before resuming.

Git rollback and task-data restoration are different operations. Reverting JavaScript **does not restore deleted tasks**.

## Implementation practices you should be able to control

Future code should avoid stacking more features into a single 69 KB HTML script. A possible long-term layout:

~~~text
app/
  index.html                 # Page layout
  styles.css                 # Visual styling
  js/
    tasks.js                 # Task operations, deadlines, recurrence
    storage.js               # One well-tested interface to durable data
    backups.js               # Export/validate/restore
    notifications.js         # Existing browser notifications
    inbox.js                 # NEW: persistent Notification Center
    history.js               # NEW: Undo/Redo and recoverable history
    calendar.js              # NEW: weekly views and time blocks
    planner.js               # NEW: boards, nodes, and edges
    ui.js                    # Rendering and event wiring
  sw.js                      # App-shell cache; not a persistent scheduler
~~~

**None of these `js/` files exist in the current app.** This is a target design, not an instruction to rename files now. Do not split the monolithic script until we have automated regression checks proving identical behavior.

For any new module you should find:

- **At the top:** a simple comment: “What this file owns, what it reads, what it writes.”
- **For each configurable behavior:** a clearly named constant, e.g. `INBOX_MAX_EVENTS` or `DEFAULT_WEEK_START`.
- **For each storage change:** a schema version and migration note.
- **For each public action:** a success path and an error/recovery path.
- **For each new feature:** a user guide, a “Where to edit it” section, and repeatable tests.

## Testing strategy — three separate things

**1. Logic tests:** Feed sample tasks/dates/actions into pure JavaScript functions and assert the outputs. For example, a recurring task completed on January 31 should still produce valid future dates.

**2. Browser behavior tests:** Load TDL in an **isolated profile/origin**; create, edit, complete, undo, refresh, simulate offline, and verify that task IDs and records remain correct.

**3. Recovery tests:** With mock data, simulate malformed storage, storage quota exhaustion, duplicate events, interrupted writes, and older export formats. Confirm the app fails without deleting the last usable copy.

A **syntax check alone is not a browser test**. No release until the relevant feature checklist is completed.

## Shared minimum acceptance checklist (all releases)

- [ ] Works locally with a test browser profile before deployment.
- [ ] Existing tasks, activities and settings are not altered by simply opening the new version.
- [ ] Add/Edit/Complete/Delete/Recurrence still operate normally.
- [ ] Data survives page refresh and, where applicable, app reopen.
- [ ] Works in the offline scenario promised for that feature.
- [ ] Handles empty data and malformed data without losing the other collections.
- [ ] Does not leak private task content into logs, URLs, or a Git commit.
- [ ] Keyboard navigation and mobile-width layout work.
- [ ] Stored text is escaped and links are safe.
- [ ] Backup and verified restore work after the change.
- [ ] Known failure cases are documented before release.
- [ ] Git branch/PR can be reverted with a known-good commit.

## What counts as “done” for the owner?

For every feature, deliver **three things together**:

1. **Working behavior:** The requested feature, tested using sample data.
2. **Learn-it documentation:** A diagram, a line-by-line description of the main logic, and a copyable guide for changing colors, intervals, labels, rules, and saved records.
3. **Recovery:** How to back up data, revert the code, and recover the feature's data if it fails.

The implementation should be understandable without asking the original developer to explain every line.

## Questions we resolved by choosing safe defaults

- **What day starts the calendar week?** Default Monday; make it a user setting.
- **Does moving a study block move the assignment deadline?** No—two different concepts.
- **Does an inbox replace Chrome notifications?** No—it provides readable, persistent reminders independently of OS delivery.
- **Can TDL notify when fully closed?** Not with the current frontend-only scheduler; do not promise this.
- **Can you create a flowchart any way you like?** Yes. Nodes and arrows are fully user-controlled; no auto-generated structure.
- **Do visual nodes become tasks?** Not automatically.
- **Should the features require Firebase?** No.
- **Will undo be unlimited forever?** No; bounded history plus separately verified backups.
- **What about Blackboard?** It stays out of the app.

## Next steps before touching production code

**First implement R0 in a branch**: a fixture-backed browser smoke test and verified full data export/import design. After reviewing and testing R0, implement the Notification Center as the first visible feature.

The four specifications below are ready to guide those changes. They do not authorize rewriting the app in one go.

- [Notification Center specification](plans/01_NOTIFICATION_CENTER.md)
- [Undo + Task History specification](plans/02_UNDO_AND_HISTORY.md)
- [Weekly Calendar specification](plans/03_WEEKLY_CALENDAR.md)
- [Visual Planner specification](plans/04_VISUAL_PLANNER.md)
- [Safety and Release Checklist](plans/00_SAFETY_AND_RELEASE_CHECKLIST.md)

**Version control note:** Keep the implementation commits small enough that you can identify and undo an individual change. A big commit containing four features is exactly what this plan is designed to avoid.
