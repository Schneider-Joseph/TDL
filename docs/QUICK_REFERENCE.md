# Quick Reference — “Where Do I Change That?”

Use this when you have an idea but don't remember which part of the code controls it.

**Almost everything is in [app/index.html](../app/index.html).** Open the file in GitHub, VS Code, or github.dev and press Find (Command/Control + F). Search for the exact anchor below.

## Fast lookup

| I want to change... | File | Search for | Be careful about |
| --- | --- | --- | --- |
| Main background/brand colors | `app/index.html` | `:root{color-scheme:dark;` | Text contrast and mobile |
| Top-left rotating quotes | `app/index.html` | `var taglines=` | Preserve valid JavaScript quotes/commas |
| Quote speed | `app/index.html` | `},15000);` beside `taglines` | Milliseconds, not seconds |
| Header bold font | `app/index.html` | `.brand p{` | Don't make right-side buttons shift |
| Add Task fields | `app/index.html` | `id="form"` | Saving/editing needs JavaScript changes too |
| Category input | `app/index.html` | `id="category"` | Already editable; don't re-add a fixed dropdown |
| Built-in category list | `app/index.html` | `function renderCategoryNav()` | Saved category names are data |
| Task sorting | `app/index.html` | `function getTasks()` | Test priority and due-date order |
| Task card appearance | `app/index.html` | `function render()` | Generated HTML must escape user text |
| Local task saving | `app/index.html` | `function save()` | **High risk: back up before editing** |
| Recurring task logic | `app/index.html` | `function spawnNextOccurrence(` | Can create duplicates if changed badly |
| Activity bank unlock condition | `app/index.html` | `function activityBlockers()` | Future-due tasks currently don't block |
| Overdue check-in timing | `app/index.html` | `CHECKIN_MS=90*60000` | Not a closed-app alarm |
| Browser deadline reminders | `app/index.html` | `function checkDeadlineNotifications()` | Permission and app-open limitations |
| Default focus duration | `app/index.html` | `function readSettings()` | Stored preference overrides default |
| Focus questions | `app/index.html` | `var focusQuestions=[` | Check answers and punctuation |
| Backup JSON format | `app/index.html` | `$("#export").addEventListener` | Import currently replaces task data |
| App install name/launch | `app/manifest.webmanifest` | `"name"` / `"start_url"` | Existing installs may cache metadata |
| App icon | `app/icon.svg` | `<svg` | Test icon against dark/light backgrounds |
| Offline file cache | `app/sw.js` | `CACHE_NAME` / `APP_SHELL` | Don't clear task storage |
| GitHub entry redirect | `index.html` (root) | `location.replace` | Avoid creating redirect loops |
| Firebase cloud sync | **Not implemented** | [Design document](FIREBASE_SYNC_DESIGN.md) | Don't insert untested cloud writes |

## Risk levels

- **Low risk:** CSS colors, static labels, quotes, icon changes. Still test responsive layout.
- **Medium risk:** Task display, filters, timer UI, notifications. Test the changed behavior and all primary actions.
- **High risk:** `save()`, `read()`, import/export, recurrence generation, service worker fetch logic, data migrations.
- **Critical security risk (future):** Firebase Security Rules, authentication, secret management, cross-account separation.

## The smallest safe change procedure

1. **Export** your real tasks.
2. Work on a **branch**, preferably in a local test server.
3. Search for one precise symbol.
4. Change the smallest possible part.
5. Look at the **diff**.
6. Test Add → Edit → Complete → Refresh → Export with fake test tasks.
7. Commit and merge only after confirming it works.
8. If something breaks, **revert code**; don't erase site data.

## Example: “I want 20-second quote changes”

Find:

~~~js
},15000);
~~~

in the **taglines rotation** section. Change `15000` to `20000`, because 1 second = 1,000 milliseconds. Leave unrelated timer intervals alone.

## Example: “I want activities available even with overdue tasks”

Find `activityBlockers()`. That function determines which tasks lock the activity bank. Think about the implications before changing the expression. See the detailed explanation in [Editing TDL](EDITING_TDL.md).

## Example: “I want my MacBook tasks on Windows”

**Not a code setting.** Current TDL is local-only. Export on MacBook; back up Windows first; then import intentionally. Import replaces existing tasks. Automatic merge/sync is a separate future engineering project.

See [Data and Backups](DATA_AND_BACKUPS.md).

---

For the full explanation behind each entry, read [How TDL Works](HOW_TDL_WORKS.md) or [Editing TDL](EDITING_TDL.md).
