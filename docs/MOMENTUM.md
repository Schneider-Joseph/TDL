# Momentum — TDL's accountability workspace

**Introduced November 1, 2026.** Momentum adds five connected, local-first productivity tools without altering the original task schema. The original Dashboard, Inbox, Week, Planner, quiet timer, task history, backup and recurring-task behavior remain available.

**Open:** [TDL](https://schneider-joseph.github.io/TDL/app/#momentum), or click **Momentum** in the top workspace navigation.

Momentum contains **Today**, **Single-task focus**, and **Weekly review**.

## 1. Daily hard caps

By default, you may commit to **3 tasks per day**. You can change the hard cap to 4 or 5 from **Momentum → Today**.

- "Commit" means adding an existing, unfinished task to *today's plan*. You can still create and store unlimited tasks in the separate backlog.
- The plan is enforced in Momentum, not by changing due dates or blocking ordinary task creation elsewhere in TDL.
- Each committed task occupies one of today's slots. **Finishing a task does not free its slot**; it stays visibly completed until midnight. This prevents unlimited new commitments by cycling completed tasks.
- You may deliberately **Remove** an *unfinished* commitment and replace it. Completed commitments cannot be removed from today's plan through Momentum.
- The cap is per browser/device because TDL has no cloud sync.

## 2. Midnight: commit again or decide

At the next local calendar day, TDL moves any **unfinished** task from the previous daily plan to a decision queue. It does **not** automatically recommit it to today.

You decide one by one:

- **Recommit today:** Use a slot under today's 3–5 task limit.
- **Shrink + recommit:** Rewrite it into a smaller next step, then commit it if a slot exists.
- **Return to backlog:** Explicitly defer it without deleting or silently carrying it into the new day.
- **Delete:** Confirm removal of the task; Undo history may allow reversal, and your Full backup preserves independent data.

The queue blocks adding *new* daily commitments until reviewed. **The original task list remains accessible**, even if you have unfinished decisions. The rollover happens while TDL is open or at the next launch after midnight; this client-only PWA does not run a guaranteed closed-app midnight job.

Completed tasks don't enter the carryover queue.

## 3. Task decay: review after 30 days

Every unfinished task receives an age label derived from when it was **last meaningfully touched**. For new records, this includes creation and modification timestamps; starting a focused session or shrinking a task also counts as a touch. Older imports without usable timestamps start at their first observed date rather than being assigned an invented original creation date.

Decay levels:

| Untouched | Display |
| --- | --- |
| 0–2 days | Fresh |
| 3–7 days | Aging |
| 8–14 days | Fading |
| 15–29 days | Critical |
| 30+ days | Mandatory decision |

At **30 days**, the task appears in a **30-day decision** section. It cannot be newly committed until you choose:

- **Do 2 minutes:** Add the task to today's plan if a slot is free and start its 2-minute focus block.
- **Shrink it:** Rewrite the task into one smaller actionable next step. The prior title can be recovered via recent Undo history.
- **Delete:** Confirm deletion. Nothing is silently erased.

Unresolved 30-day decisions also block selecting new daily commitments through Momentum. They do **not** disable the ordinary dashboard or force loss of data.

**Important limitation:** This is a behavioral prompt, not proof of work. If you edit a task or start a focus block, Momentum considers that meaningful contact, although it cannot determine how much substantive work was performed.

## 4. One-task-at-a-time focus

In **Momentum → Single-task focus**, select a task from your daily commitments. Start either:

- **2 minutes** to break through initial resistance, or
- **25 minutes** for a regular focus block.

The room contains a large countdown, progress bar, Pause/Resume, End block, and **Mark task complete**. While a block is running, you cannot switch the focused task. Starting Momentum focus is prevented while the original TDL dashboard timer is active, and vice versa.

**Co-working limitation:** This is an offline, solo co-working-*style* room with an intentional single-task interface, **not a room with real remote participants**. It doesn't invent attendees or stream ambient audio. Real body doubling with other people would require new online features and privacy controls.

A fully elapsed focus block is recorded locally. An abandoned or stopped block is not presented as a completed session; elapsed time alone cannot verify that you were working. Existing focus-session history for the original timer is still stored separately.

## 5. Weekly review and forgiving streak

**Momentum → Weekly review** shows:

- Number of tasks actually marked complete this week,
- Recorded Momentum focus minutes,
- Completed tasks by weekday (Monday–Sunday),
- Category breakdown, and
- A recent task-completion log.

On **Fridays**, the dashboard Momentum banner highlights a short weekly recap (completed tasks + focus minutes). It doesn't interrupt with a modal, and it doesn't send messages while the app is closed.

**Log accuracy:** New completion events are captured from actual unfinished → finished task transitions. Undo or reopening removes the matching completion event. Importing tasks that were *already completed* is **not** falsely counted as finishing them today. Tasks finished before Momentum was installed have no trustworthy original completion date and are not backdated.

The streak counts days with a recorded completion or fully elapsed Momentum focus session. **One missed day** between active days is forgiven; two or more consecutive missed days break the current run. Streaks are a convenience, not an obligation.

## 6. No task added in 3 days: inactivity check

If TDL hasn't observed a newly added task in approximately **72 hours**, it displays an inactivity banner. Momentum's Today view asks you to:

- **Add a task** using the existing TDL task editor, or
- Declare **Intentional rest today**.

The check prevents adding a *new daily commitment* until you choose one of those paths, but it never creates junk tasks, deletes existing tasks, or locks you out of the original dashboard. Declaring rest suppresses the prompt for that local day; if you still haven't added a task, the check may reappear the following day.

This distinction is intentional: forcing the creation of meaningless tasks would undermine the daily hard cap and increase backlog rather than improve productivity.

## 7. Data ownership, offline mode and backups

Momentum uses independent versioned browser-storage keys:

| Key | What it contains |
| --- | --- |
| `tdl.momentum.v1` | Current cap and daily commitments, carryover queue, touch dates, last-new-task date, rest choice, focus timer and recorded Momentum sessions |
| `tdl.completionLog.v1` | New completion transitions used to build weekly analytics |

The original `tdl.tasks.v1` stays exactly where it was. Existing storage keys for Inbox, Planner, Calendar, task history and focus history are not renamed. Full Backup includes the Momentum keys automatically.

**Very important:** TDL is offline-first and each browser or installed PWA has **its own independent localStorage**. Your plans and analytics will not automatically synchronize between Mac, Windows, or mobile devices. You should export a Full backup routinely.

Do **not** clear site data, uninstall the app, or erase browser storage to troubleshoot an update. That could destroy real tasks.

## 8. Developer map

| File | Responsibility |
| --- | --- |
| `app/tdl-momentum.js` | Sidecar state, decay, midnight queue, daily cap, single-task focus and analytics |
| `app/tdl-momentum.css` | Momentum workspace, timeline chart, focus room and dashboard pulse |
| `app/tdl-extras-core.js` | Navigation route `#momentum` and existing Undo/Redo/full backup |
| `app/index.html` | Existing task bridge; recurring-aware `completeTask(id)`, timer coexistence guard |
| `app/sw.js` | Offline cache of Momentum files |
| `tests/momentum.mjs` | Deterministic simulated clock covering aging, rollover, focus, caps and inactivity |
| `tests/smoke.mjs` | Core browser simulation, task Undo, page routing, completion tracking and backups |
| `tests/ui-contract.mjs` | Static contract checks and JavaScript syntax |

### Test before trusting it on production data

Run from the repository root:

```bash
node tests/smoke.mjs
node tests/momentum.mjs
node tests/ui-contract.mjs
```

Then test in a **separate localhost origin with disposable tasks**, not the actual profile that stores your real assignments. In particular, check local midnight across DST changes; incomplete recurring tasks; Undo of completion; a stale task with no creation timestamp; calendar and Inbox interaction; and original versus Momentum timer blocking.

These mocked/source tests do **not** replace actual Chrome, Firefox or installed-PWA visual tests.

## 9. Design constraints and future improvements

- Task decay and the 72-hour inactivity check are based on the device's **local clock**. An incorrect system time affects these calculations.
- A Friday summary can only appear while TDL is opened; remote notifications and cross-device syncing are not present.
- No real shared co-working room, live peers, account system or cloud database is implemented.
- The completion log retains up to 5,000 recent events, and Momentum focus history up to 1,500 sessions, to limit localStorage use; long-term external backup and analytics archiving are future work.
- Task History tracks changes to original tasks. The sidecar commitment changes are not individually Undo-able yet. Full Backup captures their state.

To recover from a faulty release, revert the feature branch's merge commit and redeploy. **Do not delete local browser data.**
