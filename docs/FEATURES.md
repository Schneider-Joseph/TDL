# Feature Guide — What TDL Does Today

This describes the **current app** as inspected in October 2026. It is not a wish list. If a feature is planned but absent, it is labeled as such.

## 1. Adding a task

Click **Add task**. The form includes:

| Field | Purpose | Notes |
| --- | --- | --- |
| Task name | Short description of your responsibility | Required; up to 160 characters |
| Category | Your own organizational label | **Editable text**, max 50 characters; empty becomes `Personal` |
| Priority | High / Medium / Low | Used for sorting and displayed on the task |
| Due date | Calendar deadline | Optional; stored in local `YYYY-MM-DD` format |
| Time | Exact deadline time | Optional; if missing, the app treats the deadline as the end of that date |
| Repeat | Daily, weekdays, weekly, monthly, yearly, or none | Requires a due date |
| Repeat until | Last date on which a new occurrence can appear | Optional |
| Assignment URL | Direct link to homework or task-related page | Must be an HTTP(S) URL |
| Notes | More context | Multiline text |
| Steps / subtasks | Smaller pieces of the task | Up to 50 steps in the editor |

Use the **Edit** button on an existing task to change those fields. Use **Delete** to remove an item; deletion is not reversible from the UI unless you have a backup.

### Categories are not fixed

Enter `Homework`, `STEM Club`, `Python`, `Research`, or anything else that fits. The sidebar automatically adds custom categories found in your tasks. The four built-in categories are Homework, Chore, Event, and Personal.

A category is a label on each task, not a separate database folder. Changing it moves that task into a different filter.

## 2. Checking off tasks and subtasks

Marking a **subtask** complete records progress toward the parent, but **does not automatically complete** the main task.

Marking a **main task** complete updates its status. If it is a recurring task, TDL creates its next occurrence. For the next occurrence, subtasks are copied but reset to unfinished.

A completed task remains in your **Completed** view unless you delete it.

## 3. Views, search, and sorting

The sidebar offers:

- **All tasks:** Unfinished tasks.
- **Due today:** Unfinished tasks with today's date.
- **Upcoming:** Unfinished tasks dated after today.
- **Overdue:** Unfinished tasks whose deadline is already past.
- **Completed:** Finished tasks.
- **Categories:** Tasks tagged with that exact category.

The four statistic tiles are also clickable. Search matches task title, notes, category, and priority. The sort menu offers due date, priority, and newest.

**Date rule:** An item with no time is treated as due at roughly the end of its due date (11:59:59 PM local time). Time-zone settings and device clock therefore affect overdue status.

## 4. Repeating tasks

Use the **Repeat** field for:

- Daily
- Weekdays (Monday–Friday)
- Weekly
- Monthly
- Yearly

TDL does not generate the entire schedule in advance. **It creates the next task only when you complete the current occurrence**. A monthly task starting on the 31st attempts to stay anchored to the 31st; in shorter months it falls on the last valid day.

This is useful for recurring study sessions or bills. Be mindful that editing only one occurrence does not mean there is a sophisticated recurring-series management screen.

## 5. Clock and focus timer

- The clock reads the date/time configured on your device.
- Upcoming tasks can appear in deadline countdowns.
- Click the large timer numbers when the timer is stopped/paused to edit the duration: `45` means 45 minutes; `45:30` means 45 minutes 30 seconds.
- Supported timer durations are 1–180 minutes.
- You can select an unfinished task or leave a session as **General focus session**.
- Start, pause/resume, and reset are controlled in the timer card.

### Focus checks

Random questions are enabled by default and can be turned off in **Settings**. They appear roughly **7–18 minutes** into an active session, then again on a randomized interval after a check. A prompt can time out after **90 seconds**. Session history is stored separately in the browser.

This is a productivity prompt, not a secure examination or proof that you were studying. If Chrome suspends timers in the background, elapsed-time accounting and exact check timing can be imperfect.

## 6. Deadline notifications

If your browser permits them and you grant permission, TDL can show local browser notifications for tasks due today and deadlines approaching within 24 hours.

**Limit:** The browser's notification permission does not give this frontend-only app a server, persistent scheduler, or guaranteed notifications when the application is closed. Background throttling also affects timing.

If notifications are unavailable or blocked, inspect the **Settings → Notifications** section and your browser's site permissions.

## 7. Overdue check-ins (90 minutes)

While TDL is running, an overdue task can trigger a question: **Did you finish this task?**

- **Yes, finished it:** Completes the task (and creates the next recurring occurrence when applicable).
- **Not yet — remind me later:** Leaves the task unfinished and checks again after its 90-minute cooldown.
- **View task:** Takes you to the overdue list.

Cooldown timestamps are saved in `tdl.overdueCheckins.v1`. Reopening TDL can surface a check-in that became due while it was closed. Each device may show independent reminders because this is currently local-only.

## 8. “Bored? Do This.”

This section is **not** another obligation list. It is a bank of optional activities.

- If any unfinished task has a due date of **today or earlier**, the section stays **locked**.
- Completing today's and overdue tasks **unlocks** it.
- Tasks due on future days and tasks without a deadline do **not** lock it.
- When unlocked, you can add/remove activity suggestions and ask TDL to **pick one randomly**.

Activities are stored separately from tasks under `tdl.activities.v1`. Locking the bank does not delete saved activities.

## 9. Homework convenience tools

**Paste assignment** opens a helper that attempts to extract an assignment name, due date/time, URL, and notes from text you paste. **Review its guesses before saving.**

There is **no Blackboard connection, live school integration, or automatic import**. Do not enter any private subscription URLs or account credentials into the repository.

## 10. Settings, backups, installation

**Settings** currently includes focus-check preference, default timer duration, notification controls, and task-backup export.

**Export** downloads a JSON file containing **tasks and activities**. **Import** replaces existing tasks after confirmation; if the backup includes an activities array, it also replaces the activity bank. The ordinary export does **not** include focus history, local reminder history, or settings.

**Install:** Open the GitHub Pages app in Chrome or a compatible browser and use the browser's install option. Installing adds an app-like window, not a cloud account.

**Offline:** The service worker caches app files when installation and caching succeed. The app's *source* can work offline, but initial installation, updates, and future cloud features need networking.

## 11. Planned / not implemented

- **Firebase cross-device synchronization:** Design documented only in [Firebase Sync Design](FIREBASE_SYNC_DESIGN.md). Do not treat it as live.
- **TDL Canvas / flowchart decision planner:** Discussed as a future idea, not present in current source.
- **True closed-app scheduled notifications:** Not implemented.
- **Blackboard import or API integration:** Not implemented and not part of the active plan.

If the behavior you see differs from this guide, check whether your browser has an old cached version or whether the app has changed since the guide was written.
