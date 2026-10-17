# TDL — Task Dashboard

**A personal task manager you can understand, modify, and run yourself.**

TDL is an offline-first web application for homework, responsibilities, focus sessions, and optional activities. You can use it in Chrome or install it as an app on supported devices. This repository contains the application's source code and its documentation—not the private tasks stored in your browser.

**Live app:** https://schneider-joseph.github.io/TDL/app/

> **Important as of October 2026:** TDL does **not** have accounts, Firebase, automatic cross-device sync, or Blackboard integration. Those features are not silently running in the background. Firebase sync is **only a documented proposal**. Your data currently lives separately on each device/browser.

## Start here: choose what you want to learn

You do not need to read everything at once.

| I want to... | Read this |
| --- | --- |
| Understand what TDL is and use it safely | [Start Here](docs/START_HERE.md) |
| Learn every existing feature and its behavior | [Feature Guide](docs/FEATURES.md) |
| Understand how the actual code works | [How TDL Works](docs/HOW_TDL_WORKS.md) |
| Change the colors, text, features, and behavior *myself* | [Editing TDL — Step by Step](docs/EDITING_TDL.md) |
| Back up tasks or move them between devices | [Data and Backups](docs/DATA_AND_BACKUPS.md) |
| Understand the proposed Firebase cross-device sync | [Firebase Sync Design — NOT IMPLEMENTED](docs/FIREBASE_SYNC_DESIGN.md) |
| Fix a blank page, caching issue, or broken change | [Troubleshooting and Recovery](docs/TROUBLESHOOTING.md) |
| Understand copyright, public repositories, and secrets | [Ownership and Security](docs/OWNERSHIP_AND_SECURITY.md) |
| Understand unfamiliar development terminology | [Plain-English Glossary](docs/GLOSSARY.md) |

## What TDL actually does today

- Add, edit, complete, and delete tasks with optional deadlines, times, priorities, notes, assignment links, and subtasks.
- Type **any category name** in Add Task; custom categories appear in the sidebar.
- Filter tasks by Today, Upcoming, Overdue, Completed, category, or search term.
- Create recurring tasks (daily, weekdays, weekly, monthly, or yearly). A next occurrence is created when the current occurrence is completed.
- Run a focus timer with optional randomized check-in questions and local session history.
- Display due-date counts, countdowns, and local browser notifications where supported.
- Ask about overdue tasks approximately every **90 minutes while the app is running**.
- Lock the **“Bored? Do This.”** activity bank until today's and overdue tasks have been completed.
- Export and import JSON backups; work from the installed web app offline after its app files have been cached.

**Not currently implemented:** automatic cloud sync, Firebase accounts, Blackboard calendar integration, a flowchart canvas, server-scheduled notifications while the app is closed.

## Folder map

~~~text
TDL/
├── README.md                  ← You are here: documentation index
├── LICENSE                    ← All-rights-reserved ownership notice
├── .gitignore                 ← Files Git should leave out
├── index.html                 ← Redirects visitors into app/
├── app/
│   ├── index.html             ← Actual TDL interface, styles, and JavaScript
│   ├── sw.js                  ← Offline cache/service worker
│   ├── manifest.webmanifest   ← Installed app name/icon/start URL
│   └── icon.svg               ← App icon
└── docs/
    ├── START_HERE.md
    ├── FEATURES.md
    ├── HOW_TDL_WORKS.md
    ├── EDITING_TDL.md
    ├── DATA_AND_BACKUPS.md
    ├── FIREBASE_SYNC_DESIGN.md
    ├── TROUBLESHOOTING.md
    ├── OWNERSHIP_AND_SECURITY.md
    └── GLOSSARY.md
~~~

Most day-to-day changes happen in **`app/index.html`**. It is currently a single-file HTML/CSS/JavaScript application; **no build tool, Node installation, or database is needed for the existing app**.

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

**Start with [START_HERE.md](docs/START_HERE.md).**
