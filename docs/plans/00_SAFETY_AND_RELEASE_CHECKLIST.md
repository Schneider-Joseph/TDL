# R0 — Safe Backups, Testing, and Release Procedure

> **STATUS: PLAN ONLY.** None of these upgrades has been implemented in the app. This is the checklist that must exist **before** the four new features are released.

[Back to master plan](../NEXT_FOUR_FEATURES.md)

## A. What are we protecting?

TDL's existing data lives in browser storage, not GitHub:

- `tdl.tasks.v1` — task objects, recurrence, subtasks.
- `tdl.activities.v1` — free-time activity bank.
- `tdl.focusSessions.v1` — focus history.
- `tdl.settings.v1` — focus/timer preferences.
- `tdl.overdueCheckins.v1` — overdue modal cooldowns.
- `tdl.notificationHistory.v2` — OS notification acceptance history.
- `tdl.notificationPrompt.v1` — whether permission prompt was answered.

The normal app Export only includes **tasks and activities**. That is not a full backup. The current Import **replaces** rather than merges task data.

**Never interpret a blank screen as proof that browser storage has disappeared.** If the app breaks, save the storage state before destructive repair attempts.

## B. Release-zero deliverables

1. A repeatable collection of fake tasks that includes completed, recurring, overdue, undated, and subtasks; no real user data.
2. Automated or repeatable browser smoke tests exercising current behavior.
3. A **new versioned full backup format** that covers all user-authored data collections and documents what is deliberately not restored.
4. Validation and **dry-run restore preview**: number of tasks and other records that would be restored or replaced.
5. A tested restore path in a **separate browser origin/profile**, not only a successful download.
6. A clearly defined rollback procedure that distinguishes **code revert** from **data restore**.
7. Documentation for the owner on how to run the test suite and update it.

### Example fixture, not real user data

~~~json
{
  "tasks": [
    {
      "id": "test-1",
      "title": "Study for quiz",
      "category": "Homework",
      "dueDate": "2026-11-02",
      "dueTime": "19:00",
      "completed": false,
      "subtasks": []
    },
    {
      "id": "test-2",
      "title": "Daily review",
      "dueDate": "2026-11-01",
      "repeat": "daily",
      "completed": false,
      "subtasks": []
    }
  ],
  "activities": [
    {"id": "example-a", "title": "Practice guitar"}
  ]
}
~~~

The real test suite must include all supported fields and recurrence edge cases. These are intentionally minimal examples for learning.

## C. Suggested full-backup format

Do **not** silently change the existing `version: 1` export. Introduce a separately documented version 2:

~~~json
{
  "app": "TDL",
  "backupFormatVersion": 2,
  "createdAt": "2026-10-31T22:00:00.000Z",
  "collections": {
    "tasks": [],
    "activities": [],
    "focusSessions": [],
    "settings": {},
    "inbox": [],
    "timeBlocks": [],
    "boards": []
  },
  "metadata": {
    "exportedFrom": "local browser",
    "schemaVersion": 2
  }
}
~~~

This is a **draft schema**. Field formats, versioning, maximum sizes, and validation will be decided and tested in R0. Existing notification permissions are controlled by the browser/OS and cannot simply be restored from JSON. Notification cooldown records should either be handled as optional device-local data or explicitly excluded with an explanation.

**Backward compatibility requirements:** Future Import must still understand old `version: 1` task/activity exports. It must not assume missing new collections mean “delete all of this device's existing new-feature data.”

## D. What counts as a verified backup?

- File exists at the expected destination.
- JSON parses and passes type/size/schema validation.
- Task IDs, recurrence fields, subtasks, activities, and settings are preserved.
- Test restore loads into an empty **isolated test environment**.
- Counts and representative records match the original.
- A deliberate failure produces a clear error and leaves the target data intact.
- The owner knows where the backup is and how to restore it.

**Avoid storing actual personal backups in this public repository.** Keep private copies in a folder you control.

## E. Restore preview vs destructive overwrite

For a restore operation, display:

~~~text
TDL backup preview
  Task records: 27
  Activities: 8
  Focus sessions: 14
  Boards: 2
  Existing records that would be replaced: 13
  Unknown or incompatible fields: 0

  [Cancel]  [Save current backup]  [Confirm restore]
~~~

This is a **mockup**, not an existing screen. No restore should proceed automatically because a user selected a file.

For a task list import, explicitly distinguish **Replace** from **Merge**. Until safe merge is implemented, don't label replacement as synchronization.

## F. Test matrix

| Test | Expected result |
| --- | --- |
| Open app with empty storage | Starts with empty state; no crash |
| Open app with existing `tdl.tasks.v1` | All legacy tasks remain |
| Add, edit, complete, delete task | Correct state and persistence |
| Complete recurring task | Creates exactly one next occurrence |
| Add/edit subtasks | Preserves IDs and completion state |
| Add custom category | Appears in sidebar, remains after refresh |
| Export/restore full backup | All selected collections restored accurately |
| Import old `version: 1` export | Supported and clearly scoped |
| Import malformed JSON | Refused, with no data erased |
| Simulate storage quota failure | Error shown; last good state recoverable |
| Load offline after successful cache | App opens and current data remains |
| App code throws exception at startup | Existing browser storage remains intact |
| Service worker has old cached HTML | Update is explained and tested without deleting site storage |
| Repeat test after any new feature | Previous behaviors still pass |

## G. Branch-by-branch release flow

1. Export **real** data from the current production app and verify the file privately.
2. Clone the repository or use GitHub's browser editor.
3. Create a small branch such as `feature/inbox-phase-1`.
4. Implement a **single change** (data model, UI, persistence, tests) and commit it.
5. Run the test suite with fake tasks on `localhost` or a disposable test profile.
6. Review the diff for unrelated changes, accidental credentials, and data key renames.
7. Create a PR. Keep production `main` untouched until review.
8. Merge only when the corresponding feature checklist passes.
9. Watch behavior in the real browser *without clearing its stored data*.
10. Keep the previous known-good commit and backup in case rollback is needed.

### Actual manual controls

- To read code: GitHub repo → `app/index.html` or future `app/js/` files.
- To inspect data: Chrome DevTools → Application → Local Storage.
- To inspect offline code: Chrome DevTools → Application → Service Workers and Cache Storage.
- To see code history: GitHub → Commits and PRs.
- To revert: Use `git revert <commit>` on an appropriate branch and test the resulting code.
- To recover data: **Use a verified backup**, not Git undo.

## H. Security and privacy checks

- No real task notes, account identifiers, or backup JSON in test fixtures.
- User content is inserted using `textContent` or safely escaped when using `innerHTML`.
- No dynamic `eval` or executing code from imported board/task JSON.
- No secret tokens in public commits.
- No Firebase setup as a side effect of this plan.
- No Blackboard integration.
- No automatic telemetry, remote logs, or background uploads.

## I. “Ready for R1” checklist

- [ ] Full-backup schema and written owner instructions exist.
- [ ] Actual test restore succeeds with fake data.
- [ ] Existing `tdl.tasks.v1` stays readable and unchanged.
- [ ] Test profile is isolated from production task data.
- [ ] No hidden wipe/reset path is used.
- [ ] Regression checks pass.
- [ ] Rollback commit and backup are known.
- [ ] The owner can explain where backups come from and how to validate one.

Once these pass, it is reasonable to build the Notification Center in a feature branch.

[Back to master plan](../NEXT_FOUR_FEATURES.md)
