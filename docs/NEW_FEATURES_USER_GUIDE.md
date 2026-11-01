# Using TDL's New Tools — A Beginner-Friendly Manual

**Updated: October 31, 2026.** The new feature code has been added to TDL's GitHub repository. This guide describes the actual controls implemented in the source. Device-specific behavior still needs checking in your installed browser/PWA; code-level tests alone cannot guarantee every browser works identically.

**Live app:** https://schneider-joseph.github.io/TDL/app/

**Important:** None of these tools requires Firebase, Blackboard, an account, or a remote task database. They currently save data in **the browser on the device you are using**.

## 1. Find the new buttons

Below TDL's usual header, you should see an additional row:

~~~text
🔔 Inbox | ↶ Undo | ↷ Redo | Task history | 📆 Week | ⬡ Planner |
Full backup | Full restore
~~~

This row belongs to **TDL Extras**, implemented in four separate JavaScript files. If the row is missing:

1. Open the direct app URL above.
2. Make sure the GitHub Pages deployment has finished.
3. Reload the page. Close/reopen the installed app if necessary.
4. If needed, inspect Chrome DevTools → Console and Network for missing `tdl-extras-*.js` assets.
5. **Do not clear site data or uninstall TDL as your first troubleshooting step:** your tasks are currently stored locally.

## 2. Notification Center

### What it solves

macOS or Chrome can suppress an OS notification. TDL now also keeps an **in-app inbox** where deadline information can remain visible.

### Use it

1. Click **🔔 Inbox**.
2. The number next to the bell indicates **unread** items.
3. Open the filter and choose **Unread**, **All**, or **Archived/resolved**.
4. Choose **Open task** to jump to the original task.
5. Choose **Mark read** when you've looked at an alert.
6. Choose **15m**, **1h**, or **Tomorrow** to snooze it.
7. Choose **Dismiss** to dismiss the **notification**, *not* the task.
8. Choose **Mark all read** to clear unread status without deleting messages.

### What makes an inbox item?

TDL checks unfinished tasks for:

- **Due today:** The task's due date matches your local date.
- **Due soon:** A future task deadline is within approximately two hours, primarily for tasks not already flagged “due today.”
- **Overdue:** The task deadline has passed.

The same event is identified by the task ID, deadline, and event type so repeatedly opening the app doesn't intentionally produce duplicate inbox items. Changing a task or completing it can resolve outdated alerts.

**Crucial limitation:** This is **not** remote push. TDL creates/checks inbox entries while the app is running and can catch overdue tasks **when you reopen it**, but a completely closed PWA cannot reliably notify you on a schedule using the current architecture.

### Where it's stored

`tdl.inbox.v1` in browser `localStorage`.

## 3. Undo + Task History

### Immediately undo something

1. Create, edit, complete, or delete an ordinary task.
2. An **Undo** prompt appears briefly.
3. Click **Undo**, or use the permanent **↶ Undo** button in the new toolbar.
4. Click **↷ Redo** if you want to reapply the undone action.

Undo checks that the involved task records still match the expected version. If they were changed independently, TDL refuses a blind reversal instead of overwriting newer work.

### Recover a deleted task

1. Open **Task history**.
2. Find a “Deleted …” entry.
3. Click **Restore deleted: [task name]**.
4. Confirm the restoration. The task will be recreated with its original ID if no conflicting ID exists.

**Recurring tasks:** Completing a recurring task can mark the current occurrence finished **and** create the next occurrence. Undo treats those changes as one operation; it must not leave a duplicate next occurrence behind.

### Limits you should know

- Up to **50 recent history actions** are retained. Older entries are pruned.
- The **Undo prompt** appears for about **10 seconds**, but history entries remain until pruned.
- Undo is not a replacement for external backups.
- A new change after Undo invalidates the Redo chain.
- Task History currently tracks changes to the original **tasks**, not every edit to a planner board or time block.
- Other tabs/devices may have changed data; TDL attempts to protect against mismatched versions but doesn't offer multi-device cloud conflict resolution.

### Where it's stored

`tdl.taskHistory.v1` in browser `localStorage`.

## 4. Weekly Calendar

### What the colors mean

- **Task deadline:** A deadline from your original task record.
- **Green work block:** When you decided to study, practice, or work.

**This distinction is intentional.** Moving a work block must not move the assignment due date.

### See your week

1. Click **📆 Week**.
2. Choose **Previous week**, **Next week**, or **Today**.
3. Find task deadlines under their calendar days.
4. Click a task deadline to open its original Add/Edit Task form.

The current calendar defaults to **Monday** as the first day of the week.

### Schedule study time

1. Click **+ Schedule work**.
2. Enter a block title such as **Practice Python**.
3. Enter its **start** and **end** times.
4. Optionally select the TDL task it supports.
5. Add notes if needed.
6. Click **Add block**.

### Edit or move work

- Click the **green work block** to open its editing form.
- Change the times, notes, title, or linked task, then save.
- On desktop, **drag a green block onto another day** to move its day while preserving its approximate clock schedule.
- On phone, use the form instead of relying on dragging.
- To delete a work block, open it and click **Delete this block**. That does **not** delete the linked TDL task.

### Limitations

- It currently shows a **seven-day agenda layout**, not a minute-by-minute Google Calendar clone.
- It displays existing saved recurring task occurrences; it doesn't create unsaved future task copies.
- Time blocks use the device's **local time**. Daylight saving time transitions require care.
- Calendar block operations are **not yet part of task Undo history**.
- A limit of **500 work blocks** is enforced.

### Where it's stored

`tdl.timeBlocks.v1` in browser `localStorage`. Original deadlines continue to live in `tdl.tasks.v1`.

## 5. Visual Planner

### Create a board

1. Click **⬡ Planner**.
2. Click **+ Create first board** or **+ New board**.
3. Give it a name, like **Security+ Study Roadmap** or **STEM Club Robot**.
4. You can keep multiple boards; use the **Board** selector to switch between them.

### Make a flowchart

1. Click **+ Add node**.
2. Type the title of a box, such as **Set up network lab**.
3. Add longer notes/steps in its text area.
4. Click **Add node**.
5. Repeat for your other steps.

### Connect nodes with arrows

1. Click **→ Connect nodes**.
2. Click the **source node**.
3. Click the **destination node**.
4. Type an optional arrow label such as **Yes**, **No**, **Requires**, or **Then**.

The **Connections** list underneath the board allows you to **Label** or **Remove** arrows afterward.

### Move around the board

- **Move a box:** Drag the box.
- **Precise movement:** Focus a box with the keyboard and use arrow keys; hold Shift for larger steps.
- **Move the view:** Drag empty canvas space.
- **Zoom:** Click **Zoom +** or **Zoom −**.
- **Recenter:** Click **Reset view**.
- **Edit a node:** Click it, then edit the title/notes.
- **Delete a node:** Open it and select **Delete node**; arrows connected to it are removed.
- **Rename/delete a board:** Use the controls above the canvas. **Delete board** requires confirmation.

### Important design choice

These are **your** diagrams. Nothing generates nodes automatically, and nodes do **not** secretly create/delete tasks in TDL. This first release doesn't have account sync or automatic task-node dependencies.

The current limits are **30 boards**, **120 nodes per board**, and **300 arrows per board**. These are practical initial safeguards against filling local browser storage.

### Where it's stored

`tdl.boards.v1` in browser `localStorage`.

## 6. Full Backup — use this!

**The existing Export and the new Full backup are different.**

| Button | What it saves |
| --- | --- |
| **Export** (old header) | Tasks and activities |
| **Full backup** (new toolbar) | All recognized `tdl.*.vN` browser-storage entries currently present, including tasks, activities, focus records, settings, inbox, task history, work blocks, and boards |

### Make a full backup

1. Click **Full backup**.
2. Check your downloads for a file similar to `tdl-full-backup-2026-10-31.json`.
3. Keep it somewhere private and safe.
4. If you want confidence that it can be restored, test the file in a **separate browser profile or localhost environment** first.

**Do not commit your real task backups to GitHub.** They contain personal task details and possibly notes.

### Restore a full backup

1. Click **Full restore**.
2. Select a previously saved **TDL full backup** JSON file.
3. Review the confirmation message—it shows the number of stored keys and tasks.
4. If you proceed, TDL first attempts to download a **safety backup** of the current data.
5. **Check your Downloads folder and verify that safety backup exists.** TDL now asks for a second explicit confirmation before overwriting anything. If no file appeared, **cancel** and create a manual Full backup first.
6. Only after your confirmation are the specified storage entries replaced and the app reloaded.

**Warning: Full restore replaces listed storage collections; it is not a merge.** It does not automatically combine tasks from two devices. It is not a Firebase replacement.

Old `tdl-backup-...json` task-only exports still belong in the **original Import** button, not the new Full restore.

## 7. What happens if a new feature breaks?

- **Do not clear browser site storage.**
- Try the original task list. Each extra feature runs in a separate script so the main dashboard can still start without it.
- Note the first red DevTools Console error.
- Keep a full backup if possible.
- The added scripts are `app/tdl-extras-core.js`, `app/tdl-inbox.js`, `app/tdl-calendar.js`, and `app/tdl-planner.js`.
- The styles live in `app/tdl-extras.css`.
- The PWA service worker caches these files, and a stale installed app might need an ordinary refresh/reopen to pick up new code.
- Use a code **revert** to restore the previous version; do not assume a code revert restores user data.

## 8. Quick example: a real workflow

Imagine you have a school assignment due Thursday:

1. **Add task:** “Finish networking lab,” due Thursday.
2. **Week:** Make Tuesday and Wednesday study blocks, linking both to that one task.
3. **Planner:** Create a board to diagram the lab setup and attach arrows between steps.
4. **Inbox:** See the due-today/overdue reminders when TDL checks your tasks.
5. **Task history:** If you accidentally edit the deadline or delete the task, restore it with Undo or Task History.
6. **Full backup:** Save everything periodically outside the browser.

The sections remain independent. You control exactly what work blocks and flowchart nodes mean.

## 9. Where to learn or edit the code

- [Developer and Customization Guide](NEW_FEATURES_DEVELOPER_GUIDE.md)
- [Existing task code walkthrough](HOW_TDL_WORKS.md)
- [Data and Backups](DATA_AND_BACKUPS.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Earlier feature design decisions](NEXT_FOUR_FEATURES.md)

**No Google account, Firebase project, or Blackboard connection is required for any of these tools.**
