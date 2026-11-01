# R1 — Notification Center: Complete Feature Specification

> **IMPLEMENTED INITIAL VERSION (OCTOBER 31, 2026).** TDL now contains `app/tdl-inbox.js`, an in-app inbox with unread/read, snooze, dismiss, open-task links and persistent local storage. This document captures the design goals; see the [user guide](../NEW_FEATURES_USER_GUIDE.md) for actual controls. Remaining work includes full real-browser tests, optional quiet hours, and more polished reminder deduplication.

[Master plan](../NEXT_FOUR_FEATURES.md) · [Safety checklist](00_SAFETY_AND_RELEASE_CHECKLIST.md)

## 1. The problem we are solving

You may have granted Chrome notification permission and still missed a banner because the app was minimized, the browser or OS blocked it, or the computer was in Focus mode. Browser notifications can disappear. TDL should maintain its **own understandable reminder list** even when the operating system never shows an alert.

**But:** An in-app inbox is not a closed-app push service. TDL can evaluate due dates **when opened** and generate overdue or due-today inbox entries based on current tasks. It cannot truthfully claim it sent alerts while fully closed.

## 2. What you would see

A simple bell icon in the app header:

~~~text
TDL                                      🔔 3    Settings

NOTIFICATION CENTER
  3 unread              [Mark all read] [Settings]

  ● OVERDUE      Network Security assignment
    Due yesterday at 11:59 PM
    [Open task] [Remind me later] [Dismiss]

  ● DUE TODAY    Write lab report
    Due today at 7:00 PM
    [Open task] [Remind me later] [Dismiss]

  ○ COMPLETED    Finish Python exercise
    Completed today
    [View history]

  [Show older notifications]
~~~

This is a **text mockup**, not a screen that exists in production.

### Minimum V1 controls

- Open/close the center with a bell button.
- Show number of **unread** items, not simply number of overdue tasks.
- Show newest actionable items first.
- Mark an item read or mark all read.
- Open the task referenced by a reminder.
- Snooze for **15 minutes**, **1 hour**, or **tomorrow** (configurable later).
- Dismiss an item without deleting the actual task.
- Filter **Unread / All / Archived**.
- Clearly label **Created when TDL opened** if an overdue item was discovered after reopening.
- Provide a simple settings explanation: **in-app reminders and OS notifications are separate**.

### What V1 will NOT do

- Send remote push alerts while every TDL window is closed.
- Read Apple Reminders, Gmail, Blackboard, or device calendars.
- Automatically sign into Firebase.
- Email or SMS reminders.
- Infer that macOS actually displayed a notification just because the browser API accepted it.

## 3. Rules for generating notifications

**Source of truth for tasks:** `tdl.tasks.v1`. The inbox is a view/history derived from task records and user inbox actions, not another copy of task details.

Suggested event types:

| Type | When created | Example message |
| --- | --- | --- |
| `due_today` | An unfinished task has today's due date | “Homework is due today” |
| `due_soon` | Deadline is within a configured lead window | “Essay due in about 2 hours” |
| `overdue` | Current deadline passed, task unfinished | “Lab report is overdue” |
| `completed` | Optional: user completes a task | “Assignment completed” |
| `system` | Optional: storage or backup problem | “Your data backup needs attention” |

For MVP, **only due-today, due-soon, and overdue** are required; completion and system entries are later enhancements.

### No duplicate spam

Give each item a **stable event key** derived from its type, task ID, and due-date/time identity.

A conceptual example:

~~~js
const eventKey = "overdue:" + task.id + ":" + task.dueDate + ":" + (task.dueTime || "end-of-day");
~~~

This is a *proposed helper example*. The exact event schema must handle changes to task deadlines carefully:

- A page refresh should not create another identical unread entry.
- Snoozing an item should not create a duplicate immediately.
- A task whose deadline changes may warrant a new event for the **new** deadline.
- Completing a task should resolve or archive outdated, actionable due/overdue events.
- Repeating tasks have unique occurrence IDs; do not reuse a reminder from the previous occurrence.

### Difference between read, dismissed, and snoozed

- **Read:** You've seen it; task may still be overdue.
- **Dismissed:** You explicitly dismissed this *notification*, not the task.
- **Snoozed:** Temporarily hidden until a chosen future time.
- **Resolved:** Its underlying condition no longer applies (for example, task completed).

Those are separate statuses; otherwise the bell count becomes misleading.

## 4. Suggested data model

**Proposed new key:** `tdl.inbox.v1`. Not present today.

~~~json
{
  "schemaVersion": 1,
  "items": [
    {
      "id": "notif-123",
      "eventKey": "overdue:test-1:2026-11-02:19:00",
      "taskId": "test-1",
      "type": "overdue",
      "message": "Study for quiz is overdue",
      "createdAt": "2026-11-02T19:01:00.000Z",
      "readAt": null,
      "dismissedAt": null,
      "snoozedUntil": null,
      "resolvedAt": null
    }
  ]
}
~~~

The fields above are examples. In production, validate type, lengths, and sizes. Do not store passwords, browser cookies, external subscription tokens, or unneeded copies of task notes. Some event text may become stale when a task is renamed; decide whether to show the current task title or a historical snapshot.

**Retention proposal:** Keep the latest 200 events or 60 days of resolved events, whichever policy is selected, but never silently prune unread/active items. Make the policy visible and allow export. The limits are not yet implemented.

## 5. How the pieces connect

~~~text
Existing tasks (read-only source for due times)
                 |
       evaluateDueEvents()
                 |
    stable event key / deduplicate
                 |
        Persistent inbox store
                 |
             UI bell
                 |
        Read / Snooze / Dismiss
                 |
     Optional OS notification attempt
~~~

**Important:** The existing OS notification history key, `tdl.notificationHistory.v2`, serves a different function: deduplicating accepted native alerts. It is **not** the inbox and should not be casually replaced.

### Avoid double alerts

A new inbox should reuse or coordinate with the existing `checkDeadlineNotifications()` and `checkOverdueCheckins()` logic:

- Do not have three independent intervals each firing the same OS banner.
- Keep the existing 90-minute overdue modal behavior, but define whether it also creates one inbox item or updates an existing one.
- Reconcile on startup and on app visibility change.
- When there is no permission for OS notifications, the in-app inbox must **still work**.
- When a native alert is blocked, don't mark it as visibly delivered; record only what the browser API actually reported.
- Avoid constant repeated writes every second. The app can evaluate in sensible intervals and on task changes.

## 6. How you would customize it yourself

Once implemented, the code should expose constants such as:

~~~js
const INBOX_SETTINGS = {
  dueSoonMinutes: 120,    // Create early reminders within 2 hours
  defaultSnoozeMinutes: 15,
  maxHistoryItems: 200
};
~~~

**This configuration does not exist yet.** It illustrates the goal of making future edits straightforward.

| Desired change | Future place to edit | What to test |
| --- | --- | --- |
| Move the bell to sidebar | Layout/HTML module | Mobile layout and focus accessibility |
| Change alert wording | Notification message builder | Long titles and HTML escaping |
| Change “due soon” window | `dueSoonMinutes` | Reopening near midnight |
| Add a 30-minute snooze | Snooze menu and validator | Reminders don't instantly reappear |
| Increase retention | Inbox storage module | Browser storage quota |
| Add a quiet-hours setting | Inbox settings module | No native spam, inbox still records |
| Change unread badge color | CSS | Accessibility, contrast |

Do not edit `tdl.tasks.v1` to customize notification appearance.

## 7. Tests that must pass

- [ ] With browser notifications **denied**, the inbox still shows eligible due tasks.
- [ ] With browser notifications allowed, inbox and OS alert don't double-count.
- [ ] Opening TDL after the deadline correctly creates an **on-open** event.
- [ ] Reloading five times doesn't create five duplicates.
- [ ] Snoozing hides an item until the correct local/absolute time.
- [ ] The bell unread count updates after read/mark-all-read.
- [ ] Completing a task resolves its active reminder without erasing task history.
- [ ] Moving a task deadline updates eligibility without orphaning misleading events.
- [ ] Recurring occurrences create distinct event keys.
- [ ] Empty task list, no due dates, and storage errors do not crash the app.
- [ ] Inbox survives refresh/offline reopening.
- [ ] Older `tdl.notificationHistory.v2` and the current 90-minute check-ins continue to work.
- [ ] Full backup/restore includes inbox data, or a documented compatibility mechanism explicitly says it does not.

## 8. Recovery and rollback

If the inbox crashes, the task list should still render. Keep the inbox data in its own collection so a broken notification record cannot corrupt task storage.

- Export both task and new inbox data before rollout.
- Add validation: malformed inbox rows should be skipped/quarantined, not cause global initialization failure.
- Revert the offending code commit if needed; do not clear browser site data.
- An inbox entry disappearing must **never delete a task**.

## 9. The success criterion

You can open TDL and answer **“What deadlines and overdue items require my attention?”**, even if Chrome or macOS showed no banner. It must be honest about *when* the app detected them and whether a native notification was actually accepted.

[Back to master plan](../NEXT_FOUR_FEATURES.md)
