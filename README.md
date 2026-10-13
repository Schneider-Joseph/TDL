# TDL

**A practical, local-first task dashboard for homework, chores, events, and personal tasks.**

TDL is being built to make deadlines and everyday responsibilities easier to track without turning task management into another project.

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

## Run it

No installation or build step is needed right now.

1. Open [`app/index.html`](app/index.html).
2. Download that file and open it in a modern browser, or clone the repository and open it locally.
3. Add a task. TDL saves tasks in that browser's local storage.

You can host this static prototype with GitHub Pages. Tasks do **not** automatically sync to another browser or device yet; the Supabase database/security foundation is in `supabase/`, but the app has not been connected to it.

## Backups and privacy

- Use **Export** regularly to save tasks as a JSON file.
- **Import** replaces the tasks currently stored in that browser after confirmation.
- Do not put passwords, API keys, or other secrets in this repository.
- The current app still stores tasks in this browser and does not send task data to a server. The SQL in `supabase/schema.sql` is only a setup foundation until the client integration is implemented.

## Roadmap

- [ ] Validate the first version with real daily use
- [ ] Improve task entry and recurring tasks
- [ ] Add reminders and calendar views
- [x] Design the initial Supabase task table and row-level security policies
- [ ] Connect authentication and task CRUD to Supabase
- [ ] Add a safe, user-confirmed migration of existing local tasks
- [ ] Explore school-platform integrations after the core app is reliable

## Project principles

- Working software before unnecessary complexity
- Privacy-conscious defaults
- Dependable task management over distracting features
- Keep the project understandable and open to contributions

## License

A license has not been selected yet. Until one is added, standard copyright rules apply; public visibility alone does not grant permission to reuse the code.
