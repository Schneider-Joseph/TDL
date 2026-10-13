# TDL

**A private-by-design, offline-first task dashboard for one person.**

TDL tracks homework, chores, events, and personal tasks without accounts, cloud storage, or a backend. The public repository contains the app's code, not your task data.

## Current features

- Create, edit, complete, and delete tasks
- Homework, chore, event, and personal categories
- Optional due dates and times, notes, and priority levels
- All, today, upcoming, overdue, completed, and category views
- Search, sorting, and summary counts
- Browser-local task storage
- JSON backup export and import
- Responsive desktop and mobile layout
- Installable web-app metadata and an offline app-shell cache when hosted on HTTPS

## Use TDL offline

**Option A — open the downloaded file:** Download `app/index.html` and open it in a modern browser. The task dashboard works locally without internet, but tasks belong to that browser's local storage. Service-worker caching and PWA installation are not available from a `file://` URL.

**Option B — install for repeat offline use:** Serve the `app/` folder from an HTTPS origin (for example, GitHub Pages), open it once while online, then install it from a supported browser. The service worker caches the app shell so the dashboard can reopen offline. No account or task-data backend is used. Initial hosting/install and later app updates require internet; the core app is designed to work offline after it has been cached.

## Privacy and device transfer

- **No accounts. No cloud sync. No server receives your task data.**
- Tasks are stored separately in each browser/device. A task added on your PC will not automatically appear on your phone.
- Use **Export** to create a JSON backup and **Import** on another device to transfer it. Import replaces that browser's current task list after confirmation; export a backup first.
- Browser data can be lost if you clear browser storage or reset the browser. Keep backups somewhere safe.
- Avoid putting passwords or other sensitive information in task notes.

## Roadmap

- [x] Establish the offline-first, single-user direction
- [x] Add PWA metadata and an offline app-shell service worker
- [ ] Test installation and offline launch on desktop and phone browsers
- [ ] Improve task entry and recurring tasks
- [ ] Add local reminders where supported by the browser/device
- [ ] Improve safe backup/restore and cross-device manual transfer
- [ ] Consider school-platform integrations only if they respect the offline-first design

## Project principles

- Offline-first and single-user by default
- No unnecessary accounts, servers, or subscriptions
- Dependable task management over distracting features
- Working software before unnecessary complexity
- Keep the project understandable and open to contributions

## License

A license has not been selected yet. Until one is added, standard copyright rules apply; public visibility alone does not grant permission to reuse the code.
