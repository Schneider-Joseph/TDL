# TDL Workspace Pages — Inbox, Calendar and Planner

**Updated November 1, 2026.** These features now use full workspace pages, not pop-up dialogs. The dashboard, tasks, timer and settings are still in the same installed PWA.

## 1. Navigating between views

The navigation at the top is:

**Dashboard · Inbox · Week · Planner · Connections · Momentum · Undo · Redo · More tools**

Selecting Inbox, Week or Planner changes the URL fragment within TDL:

| View | Address fragment | What you see |
| --- | --- | --- |
| Dashboard | `#home` | Original task list, clock, timer, stats and activity bank |
| Inbox | `#inbox` | Dedicated notification list, counters and filters |
| Week | `#week` | Full-screen-friendly weekly calendar with hourly timeline or agenda |
| Planner | `#planner` | Dedicated project board and expanded canvas |
| Connections | `#connections` | Dependency graph, related tasks, parent–child structure and readiness |
| Momentum | `#momentum` | Daily commitments, focus timer and weekly analytics |

The **Dashboard** tab and **← Dashboard** button return home. Browser Back and Forward navigate between views. You can bookmark the URL of a view; it loads in the same application.

No page has a separate backend, account or database. Changing the address fragment does not change saved records.

**Task History** remains a dialog under More tools because it's a secondary utility. **Full backup** and **Full restore** also remain under More tools.

## 2. Inbox page

Choose **Inbox**. You'll see an unread counter and three filters:

- **Unread:** only reminders that still need review.
- **All reminders:** current and earlier items, including read or snoozed.
- **Archived:** dismissed or resolved items.

Each reminder has a clear deadline and an **Open task** action. Use **Mark read**, **Remind later** (15 minutes, one hour or tomorrow morning), or **Dismiss**.

Dismissing a reminder does **not** delete its task. Completing a task can resolve related reminders.

**Limitation:** TDL detects reminders while the application runs and when you reopen it. It still does not guarantee closed-app push alerts.

## 3. Calendar page

Choose **Week**. This is a full workspace view, not the old small pop-up.

### Timeline mode

The calendar starts on Monday. It shows:

- A row of **task deadlines** across the top of each day (amber/red/dim green).
- A **24-hour time grid** below, with green planned work blocks.
- **This week**, **←** and **→** navigation.
- A **Timeline / Agenda** switch.

A work block occupies its scheduled time range. If blocks overlap, the calendar places them side by side rather than hiding one behind the other.

At first the timeline scrolls near 6 AM; scroll vertically for earlier/later hours. On a narrow display, scroll horizontally to reach the rest of the week. The **Agenda** view may be easier to scan on a phone.

### Schedule work

Click **＋ Schedule work** or click an empty hour cell. An **inline editor** appears within the calendar page. It is not a popup.

Enter a title, start/end times, optional linked task and notes. Save the block. Click a block to edit or delete it.

On desktop, drag a work block between days; its clock time is preserved as far as the local time zone allows. On touch screens, use the editor for precise changes.

### Critically important: deadlines aren't work blocks

A **task deadline** is read from the original task. A **work block** is a separate plan in `tdl.timeBlocks.v1`.

**Moving a green work block does not move the assignment's due date**, even when the work block is linked to that task.

The view shows only task occurrences that already exist. Recurring tasks don't automatically generate a whole year's future calendar.

## 4. Planner page

Choose **Planner** to reach an expanded diagram canvas. No cramped dialog window.

Create a board, add nodes, enter notes, connect boxes, zoom and pan. The canvas is substantially taller than the previous modal window. The board-editing rules are unchanged: arrows and node edits do **not** change tasks.

Use **Full backup** under More tools to safeguard boards. They remain local to your browser.

## 5. Focus timer: questions removed

Focus sessions have no random knowledge questions or quizzes. When the timer reaches zero, a repeating alarm and a persistent completion dialog notify you; press **Stop alarm** to dismiss them. Sound can be changed in Settings. See [Timer alarm](TIMER_ALARM.md).

It still supports editable duration, start/pause/resume/reset, optional linked task, and locally stored focus-session history. Previously recorded sessions are preserved; historical question records are not erased.

The separate **overdue-task check-in** feature and ordinary deadline notifications are not the removed random quiz mechanism and remain as before.

## 6. Where the code lives

| File | Responsibility |
| --- | --- |
| `app/tdl-extras-core.js` | Route navigation, hash changes, page/overlay distinction, backup/history/Undo |
| `app/tdl-inbox.js` | Notification feed, filters and reminder actions |
| `app/tdl-calendar.js` | Hourly weekly calendar, work-block editor, agenda and drag-and-drop |
| `app/tdl-planner.js` | Board storage, node/edge editing, drag/pan/zoom |
| `app/tdl-workspace.css` | Full-page layout, calendar grid, inbox, expanded planner |
| `app/tdl-theme.css` | General design tokens and dashboard appearance |
| `app/index.html` | Dashboard and focus timer; removed question feature |
| `app/sw.js` | Offline caching of the new stylesheet and existing app modules |
| `tests/smoke.mjs` | Simulated routing, task Undo, calendar scheduling and saved-data tests |
| `tests/ui-contract.mjs` | Source-structure, cache and syntax checks |

### How routing works

This is a **single-page application**, not three separate servers. Changing `location.hash` to `#week` makes `syncRoute()` hide the original dashboard sections, show the full-width workspace container and render the calendar there.

Hash routing works with GitHub Pages and offline PWA installs because the HTML and JavaScript still load from the original `app/index.html` path.

To add a new full workspace page later:

1. Add its public route to `pageNames` and `routeNames` in the core.
2. Add a label/description to `pageCopy`.
3. Register the new view with `TDLX.register(name,title,render)`.
4. Add an appropriate navigation button and CSS.
5. Preserve existing storage keys or design an explicit migration.
6. Test direct navigation, refresh, browser Back/Forward and mobile layout.

**History is not part of the full-page route list.** It intentionally remains a dialog.

## 7. Practical tests before trusting a release

1. **Safeguard existing data:** Download and inspect a Full backup from your live app. Do not clear its site storage.
2. Open the app on a **separate localhost origin** with disposable test tasks.
3. Visit `#inbox`, `#week` and `#planner` directly; refresh each view and try Back/Forward.
4. Schedule work in the timeline. Verify task due dates before/after and edit/delete the work block.
5. Switch Timeline/Agenda, navigate across a year boundary, and test overlapping blocks.
6. Create a planner board, node, labeled connection, then drag and zoom.
7. Start a timer and switch to a different app. The timer should not interrupt you with a random question.
8. Open Task History and verify Undo/Redo still work. Download a Full backup.
9. Check 375px mobile, tablet and desktop widths, as well as keyboard focus and contrast.
10. Run `node tests/smoke.mjs` and `node tests/ui-contract.mjs` from the repository root.

**No live-device visual/browser test is proven simply by passing these simulated source checks.** Check real Chrome/PWA separately.

## 8. Recovery

If a UI update causes a problem, revert the relevant Git commit or pull request and redeploy. **Never delete your live browser data just to force a page refresh.** Your tasks still use `tdl.tasks.v1`, while board and work-block records remain in their original separate versioned keys.

## 9. Momentum workspace

The new **Momentum** tab opens a dedicated full-page accountability workspace at `#momentum`. See [Momentum Guide](MOMENTUM.md) for daily task caps, decay and the 30-day decision, midnight carryover, focus and weekly analytics.

## 10. Connected tasks

The **Connections** tab is a full-page explorer at `#connections`. It supports prerequisite chains, two-way Related links and parent/child rollups. Its links are authoritative for Momentum blocked-task status; **Planner arrows remain visual and do not create task dependencies automatically**. See [Connections Guide](CONNECTIONS.md).
