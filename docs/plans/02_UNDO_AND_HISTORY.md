# R2 — Undo + Task History: Complete Feature Specification

> **IMPLEMENTED INITIAL VERSION (OCTOBER 31, 2026).** TDL now records changes in `tdl.taskHistory.v1` using `app/tdl-extras-core.js`, provides Undo/Redo, an immediate Undo prompt, a 50-action history window and deleted-task restoration. Some concepts below describe a stronger future transactional architecture; the actual implementation is still based on separate localStorage keys. See the [user guide](../NEW_FEATURES_USER_GUIDE.md) and [developer guide](../NEW_FEATURES_DEVELOPER_GUIDE.md).

[Master plan](../NEXT_FOUR_FEATURES.md) · [Safety checklist](00_SAFETY_AND_RELEASE_CHECKLIST.md)

## 1. The user problem

Accidentally deleting an assignment or clicking Complete on the wrong recurring task should not force you to restore an entire backup and lose other recent work.

We need two closely related but different functions:

- **Undo / Redo:** Reverse or reapply the most recent eligible change, with a clear visible action.
- **Task History / Restore:** See a record of important changes, inspect an earlier version, and restore an accidentally deleted task.

**Undo is not a full backup.** History is bounded and can be lost if browser data is cleared; separate backups remain required.

## 2. What you would see

After deleting a task:

~~~text
Task deleted: "Complete lab report"         [UNDO]
                                  Available for 10 seconds

TASK HISTORY
  Today, 8:42 PM  Deleted  "Complete lab report"   [Restore]
  Today, 8:40 PM  Edited   "Complete lab report"   [Details]
  Today, 7:10 PM  Completed "Review notes"         [Details]
  Yesterday       Created  "New assignment"       [Details]

  [View history]  [Export backup]
~~~

The notification/snackbar is temporary, but the history drawer is persistent within the configured retention policy.

### V1 actions to support

1. **Create task → Undo:** Remove the task created by the most recent action (with safe checks).
2. **Edit task → Undo:** Restore the earlier title, category, due date, notes, priority, and subtasks.
3. **Complete/uncomplete → Undo:** Restore completion status and any recurrence side effects.
4. **Delete task → Undo/Restore:** Recover the *same task ID* and its full fields.
5. **Subtask toggles and edits → Undo:** Restore the previous subtask list.
6. **Redo:** Reapply the eligible action you just undid, until a new action invalidates that redo chain.
7. **Task History:** See time, action, task ID/title and relevant before/after differences.

**V1 non-goals:** Unlimited cloud history; multi-device conflict merging; restoring entire browser profiles; auditing another person's account; permanent tamper-proof records.

## 3. Why this is harder than an Undo button

Current task data is a single JSON array, and a task operation may create **multiple changes**:

- Complete recurring task A.
- TDL marks A completed.
- TDL automatically creates recurring task B.
- TDL saves the array.

If Undo only flips A back to “incomplete,” B is left in the task list, and completing A again might create duplicates. That would be a bug.

The operation must be treated as **one logical transaction**: undo must restore **all records touched by that user action**, including automatically created recurring occurrences, after validating they have not been independently changed.

## 4. Core concept: an action, not a screenshot

A history entry describes one intentional change:

~~~json
{
  "schemaVersion": 1,
  "id": "action-001",
  "action": "task.update",
  "taskIds": ["task-abc"],
  "timestamp": "2026-10-31T22:00:00.000Z",
  "before": {
    "task-abc": {
      "id": "task-abc",
      "title": "Draft report",
      "completed": false
    }
  },
  "after": {
    "task-abc": {
      "id": "task-abc",
      "title": "Finish report",
      "completed": false
    }
  },
  "status": "applied"
}
~~~

This example is deliberately simplified. Real task snapshots include recurrence identifiers, subtasks and full properties. **The history must retain exact previous values** for what it promises to restore; a partial history record cannot reliably restore unknown fields.

Think of the action as: **“Before this click, the task looked like X; afterward, it looked like Y.”**

## 5. Suggested storage strategy

**Proposed:** a `tdl.taskHistory.v1` record for small prototypes, or **IndexedDB** for durable bounded history and tasks if tests show localStorage's limits or atomicity risks.

Why not store unlimited complete-array snapshots in localStorage?

- A large task list creates huge duplicate snapshots.
- Browser storage can run out of quota.
- Writing `tdl.tasks.v1` and a separate history key is **not atomic**; one write can succeed while the other fails.
- Undoing a partial operation can corrupt recurrence relationships.

### Recommended staged implementation

**Phase A — safe same-session Undo:** In memory only, with existing task writes. Keep the action stack short, and show Undo only after validated changes. Clearly state it may be lost after app restart.

**Phase B — persistent history:** Choose a storage architecture with tested transactional guarantees. A versioned IndexedDB data layer could store tasks and history in the same transaction; migrating there is significant and **must not** silently abandon legacy `tdl.tasks.v1`. Implement dual-read/migration/backup/rollback rules first.

**Phase C — recoverable history UI:** Provide a timeline and per-task restore that works after reopen. Handle retention and storage quota clearly.

Don't promise Phase C reliability while only using Phase A's in-memory stack.

## 6. Undo and Redo rules

An Undo implementation should track:

- The action type (create/update/complete/delete/subtask).
- IDs of **all** affected tasks.
- Exact before/after state.
- A unique operation ID.
- Whether the action was already undone or redone.
- The state/version expected before applying a reversal.

### V1 behavior choices

- Undo the most recent action (stack discipline), rather than arbitrarily rewinding an older action that other operations depend on.
- A new user edit clears the redo stack, with a short explanation.
- If another action changed the same task since the saved snapshot, **refuse the blind undo** and offer a preview/recovery choice instead.
- An imported backup isn't just another casual undo step: it requires a backup and explicit preview first.
- Undo never deletes unrelated tasks.
- New recurrence creation and task completion are one operation.
- Undoing a delete restores its original ID if it is not occupied. If the ID is reused, stop and offer a safe “restore as a copy” option.

### Time limits

A **10-second snackbar** is a proposed UI default for immediate Undo; it does not mean the history entry vanishes after 10 seconds. Persistent restore is controlled by the history-retention policy and backup availability.

## 7. What does the History panel show?

Suggested details:

~~~text
TASK: Finish lab report
Today 8:40 PM    Due date changed
                 Before: Nov 2, 7:00 PM
                 After:  Nov 3, 7:00 PM

Today 8:35 PM    Subtask marked complete
                 "Write conclusion"

Today 8:20 PM    Created this task
~~~

**Privacy:** The panel could reveal private task titles and notes. Don't write history to the public repo, Console logs, or analytics. If using before/after snapshots, those records are also personal data and need inclusion in the backup/privacy design.

## 8. Retention and size

Recommended starting point, to be evaluated in tests:

- At most **100–250 recent action records**, depending on size.
- Keep deleted-task restore information as long as practical inside that bound.
- Show a clear notice before pruning old recoverable records.
- Offer full export before pruning if feasible.
- Do not wipe the only backup because the history store is full.

History retention is **not** a substitute for regular off-browser backups.

## 9. Where would you change it yourself?

Future files suggested by the master plan:

- `history.js`: record, undo, redo, conflict checks and history retrieval.
- `tasks.js`: task operations, including recurrence, expressed as logical changes.
- `storage.js`: durable transactional saving and migrations.
- `ui.js` / HTML: Undo toast, History drawer, Restore controls.
- `backups.js`: export/validate/restore history data.

Future configurable values (illustrative, **not present**):

~~~js
const HISTORY_SETTINGS = {
  maxActions: 150,              // Bound stored history
  undoToastSeconds: 10,         // How long immediate Undo stays visible
  allowRestoreDeleted: true     // Provide Restore in History
};
~~~

You should be able to edit these constants without changing the task serialization format.

## 10. Edge cases to test

| Situation | Required behavior |
| --- | --- |
| Delete task with notes/subtasks | Restore all content and original ID |
| Complete monthly recurring task | Undo removes only its newly created next occurrence and reopens current one |
| Next occurrence edited after creation | Undo must **not** blindly delete independently edited task |
| Undo a subtask completion | Parent completion remains correct |
| Undo and then new edit | Redo invalidated without erasing newer work |
| Undo after app refresh | Available only if persistent history phase implemented |
| Duplicate IDs in imported data | Validation refuses unsafe overwrite |
| Storage quota exhausted | No misleading “Undo saved”; last usable data recoverable |
| History record damaged | App still opens and existing tasks remain |
| 150 actions reached | Defined retention behavior; no crash |
| Complete/delete task with active inbox reminder | Reminder resolves/reconciles appropriately |
| User imports a backup | Current data is backed up before replacement; no destructive automatic history replay |
| Two app tabs open | Detect stale state or protect against overwriting each other's changes |

## 11. Recovery rules

If history fails to initialize, **TDL should still load tasks**. If a task mutation cannot be recorded safely, choose an explicit policy: either reject the mutation with an error or save the change with an honest warning that Undo is temporarily unavailable. For deletions and bulk operations, favor rejecting until safe recovery exists.

Never silently report an Undo successful unless both memory and durable storage reflect the restored state.

## 12. Acceptance checklist

- [ ] User can immediately undo all V1 task actions.
- [ ] Recurrence side effects are reversed as one logical operation.
- [ ] Redo is defined and tested.
- [ ] Deleted tasks can be restored in the promised retention window.
- [ ] History after refresh works **if** persistent phase is included.
- [ ] Does not overwrite or rename `tdl.tasks.v1` without tested migration.
- [ ] No unbounded snapshot growth.
- [ ] Malformed history never prevents the main task list from opening.
- [ ] New notification and future calendar changes can integrate without bypassing history.
- [ ] Owner documentation shows how to adjust Undo timing, retention, and recovery.
- [ ] Full backup/restore is verified.

## 13. Definition of success

You can safely experiment with tasks because **a mistaken edit or deletion is recoverable**, and when something cannot be undone, TDL says so plainly rather than pretending it worked.

[Back to master plan](../NEXT_FOUR_FEATURES.md)
