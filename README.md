# TDL

**A private-by-design, offline-first task dashboard for one person.**

TDL tracks homework, chores, events, and personal tasks without accounts, cloud storage, or a network connection. The app is intended for personal use; the public repository contains the app's code, not your task data.

## Current status

**Version:** 0.1 — first usable prototype

Current features:
- Create, edit, complete, and delete tasks
- Categories for homework, chores, events, and personal tasks
- Optional due dates and times, notes, and priority levels
- Views for all tasks, today, upcoming, overdue, completed, and each category
- Search and sorting
- Browser-local saving
- JSON backup export and import
- Responsive desktop and mobile layout

## Run it offline

1. Download `app/index.html` from this repository to your device.
2. Open the file in a modern browser.
3. Add tasks. They are stored in that browser's local storage; after the file is downloaded, an internet connection is not required for the core app.

For a fully offline setup, do not rely on GitHub Pages as the app's runtime. GitHub can host the source code, but the downloaded HTML file runs locally.

## Privacy and device transfer

- **No accounts. No cloud sync. No server receives your task data.**
- Tasks are stored separately in each browser/device. A task added on your PC will not automatically appear on your phone.
- Use **Export** to create a JSON backup and **Import** on another device to transfer it. Import replaces that browser's current task list after confirmation, so export a backup first.
- Browser data can be lost if you clear site/browser storage or reset the browser. Keep backups somewhere safe.
- Avoid putting passwords or other sensitive information in task notes.

## Roadmap

- [ ] Validate the offline prototype with daily use
- [ ] Improve task entry and recurring tasks
- [ ] Add local reminders where supported by the browser/device
- [ ] Improve safe backup/restore and cross-device manual transfer
- [ ] Explore an installable offline web app (PWA) without requiring an account or backend
- [ ] Explore school-platform integrations only if they can respect the offline-first, single-user design

## Project principles

- Offline-first and single-user by default
- No unnecessary accounts, servers, or subscriptions
- Dependable task management over distracting features
- Working software before unnecessary complexity
- Keep the project understandable and open to contributions

## License

A license has not been selected yet. Until one is added, standard copyright rules apply; public visibility alone does not grant permission to reuse the code.
