# Weekly Calendar — Implemented Feature and Design Specification

**Status: initial implementation committed October 31, 2026.** The working source is [app/tdl-calendar.js](../../app/tdl-calendar.js). Real browser testing of touch, drag/drop, time-zone edge cases and full restore remains necessary.

[Master plan](../NEXT_FOUR_FEATURES.md) · [User guide](../NEW_FEATURES_USER_GUIDE.md) · [Developer guide](../NEW_FEATURES_DEVELOPER_GUIDE.md)

## 1. Purpose

TDL should answer two separate questions:

- **What must be finished, and when is it due?** This information already belongs to each task (`dueDate` and `dueTime`).
- **When will I work on it?** This is a *planned time block*, separate from the task deadline.

Example: an assignment due on Friday can have study blocks on Tuesday and Thursday. Moving Tuesday's block must not move Friday's deadline. This is the most important invariant in the feature.

## 2. What has been implemented

Open **📆 Week** from the new toolbar. The initial release includes:

- Seven-day Monday–Sunday display, Previous/Next week and Today navigation.
- Current task deadlines displayed on their dates, without creating additional task copies.
- Clicking a task deadline to open the original task editor.
- Adding, editing, and deleting a named work block with start/end, notes and optional task link.
- Dragging work blocks to different days with the desktop drag-and-drop interface.
- A mobile-width layout that stacks seven day cards into a readable agenda.
- A 500-block guard against unlimited local growth.
- Independent storage under `tdl.timeBlocks.v1`.
- Coverage in the new **Full backup** snapshot.

## 3. What is NOT implemented yet

- A minute-by-minute vertical hourly grid, like a full enterprise calendar.
- Creating recurring blocks automatically.
- Cross-device cloud synchronization.
- Drag-to-resize duration.
- Per-block Undo in the **task** history module.
- Apple/Google calendar sync or school platform imports.
- Device-independent time-zone scheduling.
- Closed-app push reminders.

These are possible future improvements, not features to assume exist.

## 4. Storage schema

An example local block record:

~~~json
{
  "id": "block-123",
  "title": "Practice subnetting",
  "taskId": "task-456",
  "start": "2026-11-03T17:00",
  "end": "2026-11-03T18:30",
  "notes": "Review /27 and /28 questions"
}
~~~

The main task continues to live in `tdl.tasks.v1` and is **not copied** into the blocks array. The block's `taskId` is a reference, not a new task. If that task is deleted, the block remains; the user may remove or relink it manually.

### Important time-zone detail

The current implementation uses **local date-time strings** (for example `2026-11-03T17:00`). It also checks that the start is before the end and rejects non-existent local times in a DST transition. Local times without an explicit time zone cannot by themselves uniquely represent repeated autumn DST hours; before cloud sync or travel across time zones, the schema needs a stronger explicit-zone design. The calendar is currently intended for the **local device's schedule**.

### Date-only task deadlines

The existing task manager treats a task with a due date but no due time as due at the end of that day. The calendar should present that as a *day-level deadline*, not invent a 9 AM appointment.

### Recurring tasks

The original recurrence engine generates the next occurrence **after the current occurrence is completed**. The calendar displays only saved occurrences. It must not fabricate additional task records to fill future weeks.

## 5. How code works, in human terms

1. Read current tasks through `TDLX.tasks()`.
2. Determine the Monday for the displayed week.
3. Create seven calendar day records.
4. Select tasks with `t.dueDate===day` for each day.
5. Select time blocks whose `start` belongs to each day.
6. Display task deadlines and separately styled planned work blocks.
7. When the user clicks a task, call the original task editor.
8. When the user changes a work block, validate it and write only `tdl.timeBlocks.v1`.
9. Redraw the current week.

**Never** modify task `dueDate` during work-block drag-and-drop.

## 6. How to customize it

[Open the code](../../app/tdl-calendar.js), then use Find:

| Search | What it controls |
| --- | --- |
| `const key="tdl.timeBlocks.v1"` | Where blocks are saved |
| `function getWeek` | Week-start calculation (currently Monday) |
| `length:7` | Number of displayed days |
| `function blockForm` | Work-block editor fields |
| `function validTimes` | Start/end time validation |
| `function render` | Week display |
| `c.ondrop=e=>` | Drag-to-move date logic |
| `next.length>500` | Work-block count limit |

A novice change: replace the Monday start formula with a Sunday-start formula, then test weeks spanning December 31 and January 1. See [Developer Guide](../NEW_FEATURES_DEVELOPER_GUIDE.md) for the exact example.

## 7. Tests before considering the release fully verified

- [ ] The same task appears as one deadline, not duplicate task records.
- [ ] Changing a block does not modify task `dueDate` or `dueTime`.
- [ ] Linking multiple blocks to one task works.
- [ ] A deleted linked task does not remove independent blocks.
- [ ] Empty weeks and very busy weeks display legibly.
- [ ] Week navigation works across months and years.
- [ ] All-day/date-only deadlines appear on correct dates.
- [ ] Invalid and reversed date-time ranges are refused.
- [ ] Spring-forward and fall-back cases are documented and tested.
- [ ] Dragging on desktop works without altering start clock time unexpectedly.
- [ ] On mobile, blocks remain editable without drag-and-drop.
- [ ] Browser refresh and offline reopen retain block data.
- [ ] Full backup contains `tdl.timeBlocks.v1` and restores it into a test profile.
- [ ] A malformed block record cannot make the original task list disappear.

**Recovery:** Use Full backup, retain existing task storage, and revert only the calendar code if necessary. Do not clear Chrome site data to fix a broken week view.
