# Feature Guide — What TDL Does Today

This describes the **original TDL dashboard** and its existing task behaviors. On October 31, 2026 the app also gained a local Notification Center, Undo + Task History, Weekly Calendar, Visual Planner and Full Backup/Restore. For those installed additions, see the [New Features User Guide](NEW_FEATURES_USER_GUIDE.md) and [Developer Guide](NEW_FEATURES_DEVELOPER_GUIDE.md).

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

Use the **Edit** button on an existing task to change those fields. The new **Undo** and **Task history** controls can reverse or recover recent deletions, within the retained history limit. Keep external backups for longer-term protection.

### Categories are not fixed

Choose a category from the dropdown or type your own, such as `STEM Club`, `Python`, or `Research`. Suggestions include Homework, Personal, Project, Chore and Event, plus categories found in existing tasks or remembered from previous saves. Frequent categories appear first; usage counts stay internal and are not displayed. The task sidebar still adds custom categories found in your tasks.

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
- Click **HRS**, **MIN** or **SEC** to edit that section independently. Type digits or use native arrow controls. The separate typed-duration option has been removed.
- Supported durations are **1 second to 24 hours**. Default hours, minutes and seconds can be saved in Settings.
- **Work until** lets you choose a local finish time, such as 6:30 PM. The preview states Today or Tomorrow. Pausing keeps the original finish time; an expired target requires a new selection.
- You can select an unfinished task or leave a session as **General focus session**.
- Start, pause/resume, and reset are controlled in the timer card.
- At completion, a repeating alarm and a persistent **Time’s up** dialog appear. Press **Stop alarm** (or Escape) to silence it. Both Dashboard and Momentum focus timers use the alarm.
- **Settings → Timer alarm** includes sound on/off, volume, and **Preview alarm**. Preview is unavailable while a timer is active.
- With notification permission, a system notification is also requested. Keep TDL open; device volume, browser policies, and operating-system suspension can prevent sound or delay alerts. See [Timer alarm](TIMER_ALARM.md).

### Quiet focus sessions (November 1, 2026)

The randomized focus questions and their Settings toggle have been **removed**. The timer runs without quiz pop-ups, even when you're focused on a different application. Focus-session history remains stored separately in this browser; previous records aren't erased. See [Workspace Pages](WORKSPACE_PAGES.md).

## 5b. Connections and task dependency graph (November 1, 2026)

Each original task can now have validated **Blocks / Blocked by**, symmetric **Related**, and directed **Parent / Child** relationships. Connections are saved to `tdl.connections.v1`, not to the original task array. They appear in a full workspace graph, dashboard status chips, Planner node links and dependency-aware Momentum commitments. Cycles, self-relations and duplicate links are rejected. Missing referenced tasks remain unresolved and can be restored without losing relationships. See [Connections Guide](CONNECTIONS.md).

## 5a. Momentum accountability workspace (November 1, 2026)

Momentum is a separate page at [`#momentum`](https://schneider-joseph.github.io/TDL/app/#momentum). It adds 3–5 daily commitment limits, explicit midnight rollover review, task decay at 30 days, a quiet 2-minute or 25-minute single-task focus timer, forgiving active-day streaks, weekly completion analytics, a Friday summary, and a three-day inactivity check with deliberate-rest escape. The original Dashboard and task list still work normally; no task is automatically deleted. See [Momentum Guide](MOMENTUM.md).

## 6. Deadline notifications

If your browser permits them and you grant permission, TDL can show local browser notifications for tasks due today and deadlines approaching within 24 hours.

**Limit:** The browser's notification permission does not give this frontend-only app a server, persistent scheduler, or guaranteed notifications when the application is closed. Background throttling also affects timing.

In **Settings → Notifications**, click **Send test notification** (available after browser permission is granted) to check whether the browser accepts an alert. If TDL says it was accepted but nothing appears, check macOS **System Settings → Notifications** for TDL / Chrome, as well as Focus mode. Browser acceptance is not proof the operating system visibly displayed the alert.

TDL now tries the service-worker notification method first when available and falls back to the standard browser method. Successful API acceptance is recorded to avoid duplicate alerts; a failed attempt remains eligible for retry.

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

**Settings** includes default timer duration, timer-alarm sound/volume/preview, notification controls, and task-backup export.

The **original Export** downloads JSON containing **tasks and activities**. **Import** replaces existing tasks after confirmation; if the backup includes an activities array, it also replaces the activity bank. The ordinary export does **not** include focus history, local reminder history, or settings. The new **Full backup** button captures current TDL browser storage collections for a fuller recovery route. See [New Features User Guide](NEW_FEATURES_USER_GUIDE.md).

**Install:** Open the GitHub Pages app in Chrome or a compatible browser and use the browser's install option. Installing adds an app-like window, not a cloud account.

**Offline:** The service worker caches app files when installation and caching succeed. The app's *source* can work offline, but initial installation, updates, and future cloud features need networking.

## 11. Newly implemented and still planned

- **Firebase cross-device synchronization:** Design documented only in [Firebase Sync Design](FIREBASE_SYNC_DESIGN.md). Do not treat it as live.
- **Visual Planner:** Implemented in separate `app/tdl-planner.js`. Create user-controlled boards, nodes, and connections. Read the [New Features User Guide](NEW_FEATURES_USER_GUIDE.md).
- **True closed-app scheduled notifications:** Not implemented.
- **Blackboard import or API integration:** Not implemented and not part of the active plan.

If the behavior you see differs from this guide, check whether your browser has an old cached version or whether the app has changed since the guide was written.
