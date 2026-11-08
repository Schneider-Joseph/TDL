# TDL — Task Dashboard

**A personal task manager you can understand, modify, and run yourself.**

TDL is an offline-first web application for homework, responsibilities, focus sessions, and optional activities. You can use it in Chrome or install it as an app on supported devices. This repository contains the application's source code and its documentation—not the private tasks stored in your browser.

**Live app:** https://schneider-joseph.github.io/TDL/app/

> **October 31, 2026 update:** TDL now includes a local Notification Center, task Undo/Redo + History, Weekly Calendar, user-controlled Visual Planner, and Full Backup/Restore. These were added in separate source files and passed code-level checks; real-device/browser verification is still recommended. **Firebase/cloud sync and Blackboard integration are NOT installed.** Each browser/device still has independent data.

## Start here: choose what you want to learn

You do not need to read everything at once.

| I want to... | Read this |
| --- | --- |
| Understand what TDL is and use it safely | [Start Here](docs/START_HERE.md) |
| **Customize the new look, spacing, colors and menus** | **[Studio UI Design System](docs/DESIGN_SYSTEM.md)** |
| **Use full Inbox / Week / Planner pages and quiet timer** | **[Workspace Pages Guide](docs/WORKSPACE_PAGES.md)** |
| **Set up task decay, daily hard caps, single-task focus and Friday analytics** | **[Momentum Guide](docs/MOMENTUM.md)** |
| **Connect tasks with dependencies, related work and parent/child hierarchy** | **[Connections Guide](docs/CONNECTIONS.md)** |
| **Use the new Inbox, Undo, Calendar, Planner and backups** | **[New Features User Guide](docs/NEW_FEATURES_USER_GUIDE.md)** |
| **Change any new feature manually in its source code** | **[New Features Developer Guide](docs/NEW_FEATURES_DEVELOPER_GUIDE.md)** |
| Find exactly which file or function to edit | [Quick Reference — Where Do I Change That?](docs/QUICK_REFERENCE.md) |
| Learn every existing feature and its behavior | [Feature Guide](docs/FEATURES.md) |
| Understand how the actual code works | [How TDL Works](docs/HOW_TDL_WORKS.md) |
| Change the colors, text, features, and behavior *myself* | [Editing TDL — Step by Step](docs/EDITING_TDL.md) |
| Back up tasks or move them between devices | [Data and Backups](docs/DATA_AND_BACKUPS.md) |
| Understand the proposed Firebase cross-device sync | [Firebase Sync Design — NOT IMPLEMENTED](docs/FIREBASE_SYNC_DESIGN.md) |
| Fix a blank page, caching issue, or broken change | [Troubleshooting and Recovery](docs/TROUBLESHOOTING.md) |
| Understand copyright, public repositories, and secrets | [Ownership and Security](docs/OWNERSHIP_AND_SECURITY.md) |
| Understand unfamiliar development terminology | [Plain-English Glossary](docs/GLOSSARY.md) |
| Review future ideas and known bugs | [Roadmap, Decisions, and Known Limitations](docs/ROADMAP_AND_DECISIONS.md) |

## Workspace themes — November 2026

TDL now includes **Paper**, **Graphite**, **Forest**, and **Dusk** themes. Choose **Appearance** in the header to preview and apply one; the selection saves automatically on this device. The redesigned desktop layout has persistent workspace navigation, a task-first center and a separate focus column. On phones, the task list comes before the focus widgets. All existing workspace pages follow the selected palette, including offline use after the app shell is cached.

Theme tokens and layout live in `app/tdl-appearance.css`; the picker and isolated appearance preference live in `app/tdl-appearance.js`. See [Design System](docs/DESIGN_SYSTEM.md#workspace-themes--november-2026) for customization and validation details.

## Visual refresh — October 31, 2026

The Studio UI refresh gives TDL a graphite-and-mint design, refined task cards, more consistent spacing, cleaner tool menus, new navigation icons, and responsive desktop/mobile layouts. It is a **visual/navigation update only**: it does not rename or migrate any of your local task data. Use the [design guide](docs/DESIGN_SYSTEM.md) to customize it yourself.

## Connected tasks — November 1, 2026

**New: [Connections](https://schneider-joseph.github.io/TDL/app/#connections).** Tasks can now be connected as **Blocks / Blocked by**, **Related** (two-way), or **Parent / Child**, with a dedicated visual network, cycle detection, parent progress rollups, Dashboard connection badges, Planner node-to-task links and dependency-aware Momentum commitments. Missing task references are preserved, so deleting a prerequisite never silently unlocks dependent work. Original task storage remains untouched. See the **[Connections Guide](docs/CONNECTIONS.md)**.

## Momentum accountability — November 1, 2026

**New:** A dedicated **[Momentum](https://schneider-joseph.github.io/TDL/app/#momentum)** workspace offers 3–5 daily commitment caps, explicit review of unfinished commitments after midnight, task aging with a 30-day decision, single-task 2- or 25-minute focus blocks, forgiving streaks, an automatic weekly completion log and Friday recap, and a 72-hour new-task inactivity check with an intentional-rest option. No task is automatically deleted and the original TDL task storage key is unchanged. For instructions and limitations, see **[Momentum Guide](docs/MOMENTUM.md)**.

## Workspace pages — November 1, 2026

**Inbox, Week, and Planner are now full workspace pages rather than popup windows.** The calendar has a 24-hour weekly timeline, overlapping work blocks, a separate deadline row, an Agenda switch, and an inline scheduling editor. The Planner has an expanded canvas. Browser Back/Forward and direct `#inbox`, `#week`, and `#planner` links work inside the same app. Random timer focus questions have been **removed**; the timer and saved focus history remain. See [Workspace Pages Guide](docs/WORKSPACE_PAGES.md).

## What TDL actually does today

- Add, edit, complete, and delete tasks with optional deadlines, times, priorities, notes, assignment links, and subtasks.
- Type **any category name** in Add Task; custom categories appear in the sidebar.
- Filter tasks by Today, Upcoming, Overdue, Completed, category, or search term.
- Create recurring tasks (daily, weekdays, weekly, monthly, or yearly). A next occurrence is created when the current occurrence is completed.
- Run a quiet focus timer with editable duration, optional task linking, and local session history (no random questions).
- Display due-date counts, countdowns, and local browser notifications where supported.
- Ask about overdue tasks approximately every **90 minutes while the app is running**.
- Lock the **“Bored? Do This.”** activity bank until today's and overdue tasks have been completed.
- Export and import JSON task backups; work from the installed web app offline after its app files have been cached.
- Keep a persistent **in-app Notification Center** even when native banners do not display (app-open detection only).
- **Undo/Redo task changes**, review recent Task History, and restore deleted tasks from retained history.
- Use a **Weekly Calendar** to view deadlines and schedule separate draggable work blocks.
- Build fully **manual Visual Planner** boards with movable nodes, labeled connections, zoom/pan, and keyboard nudging.
- Download a **Full backup** of local TDL data and restore it with explicit confirmation.

**Not currently implemented:** automatic cross-device cloud sync, Firebase accounts, Blackboard calendar integration, or server-scheduled notifications while the app is closed. The four new tools are local-first; changes on one device do not automatically appear on another.

## Folder map

~~~text
TDL/
├── README.md                  ← You are here: documentation index
├── LICENSE                    ← All-rights-reserved ownership notice
├── .gitignore                 ← Files Git should leave out
├── index.html                 ← Redirects visitors into app/
├── app/
│   ├── index.html             ← Original TDL interface, styles, and JavaScript
│   ├── tdl-extras.css         ← Styling for added tools
│   ├── tdl-theme.css          ← Studio UI design tokens, modern layout and responsive polish
│   ├── tdl-workspace.css      ← Full-page Inbox, calendar and planner layout
│   ├── tdl-momentum.js       ← Daily commitments, aging, focus and analytics
│   ├── tdl-momentum.css      ← Momentum workspace appearance
│   ├── tdl-connections.js    ← Linked tasks, dependency graph and rollups
│   ├── tdl-connections.css   ← Relations explorer and linked-task badges
│   ├── tdl-extras-core.js     ← Panels, task history, full backup/restore
│   ├── tdl-inbox.js           ← Persistent notification inbox
│   ├── tdl-calendar.js        ← Weekly view and time blocks
│   ├── tdl-planner.js         ← User-controlled visual boards
│   ├── sw.js                  ← Offline cache/service worker
│   ├── manifest.webmanifest   ← Installed app name/icon/start URL
│   └── icon.svg               ← App icon
└── docs/
    ├── START_HERE.md
    ├── DESIGN_SYSTEM.md
    ├── WORKSPACE_PAGES.md
    ├── MOMENTUM.md
    ├── CONNECTIONS.md
    ├── NEW_FEATURES_USER_GUIDE.md
    ├── NEW_FEATURES_DEVELOPER_GUIDE.md
    ├── NEXT_FOUR_FEATURES.md
    ├── QUICK_REFERENCE.md
    ├── FEATURES.md
    ├── HOW_TDL_WORKS.md
    ├── EDITING_TDL.md
    ├── DATA_AND_BACKUPS.md
    ├── FIREBASE_SYNC_DESIGN.md
    ├── TROUBLESHOOTING.md
    ├── OWNERSHIP_AND_SECURITY.md
    ├── GLOSSARY.md
    └── ROADMAP_AND_DECISIONS.md
~~~

The original task dashboard remains in **`app/index.html`**, while the new tools have their own JS/CSS files listed above. The **Studio UI** stylesheet loads last and makes it straightforward to adjust visuals without altering task logic. **No Node build step, Firebase account, or database server is needed for the deployed app.**

## Safest way to edit

1. Open TDL and **Export** a task backup. Save it somewhere you trust.
2. Read [Editing TDL](docs/EDITING_TDL.md) before making your first code change.
3. Create a Git branch instead of editing `main` blindly.
4. Change a single, small thing in `app/index.html`.
5. Test locally at `http://localhost:8000/app/` (instructions in the editing guide).
6. Commit and push; use a pull request to review the change.
7. If you change app files, learn how `app/sw.js` caching affects your users. Avoid clearing site storage.
8. Only then merge the change to `main`.

## Where your data goes

Task data currently belongs to **the browser and origin where you saved it**, using `localStorage`. Installing the same app on another device does not transfer it. The **Export** button saves a JSON backup of tasks and activities; the import button can replace the current task list after confirmation. Other settings and focus history are separate local data and are not part of that ordinary export.

**Never clear Chrome site data or uninstall/reset the app as a troubleshooting experiment unless you have verified backups.** See [Data and Backups](docs/DATA_AND_BACKUPS.md).

## Ownership and licensing

**Copyright © 2026 TDL project owner (GitHub: Schneider-Joseph). All rights reserved, subject to any third-party rights.** See [LICENSE](LICENSE).

The repository is currently **public**, and adding an all-rights-reserved notice does **not** make it private or erase existing copies/forks. Public visibility is not the same as an open-source license. See [Ownership and Security](docs/OWNERSHIP_AND_SECURITY.md) for the difference and for GitHub visibility instructions.

## Current direction

Keep TDL understandable and reliable first. **Firebase cross-device synchronization is deliberately on hold while we document and design a safe migration**. The complete proposed architecture is in [Firebase Sync Design](docs/FIREBASE_SYNC_DESIGN.md); it is **not production code**.

**To use the additions:** [New Features User Guide](docs/NEW_FEATURES_USER_GUIDE.md). **To modify them:** [Developer Guide](docs/NEW_FEATURES_DEVELOPER_GUIDE.md). For the original task manager, begin with [START_HERE.md](docs/START_HERE.md).
