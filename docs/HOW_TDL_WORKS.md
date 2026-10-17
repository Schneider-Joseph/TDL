# How TDL Works — A Guided Tour of the Actual Code

This guide is for learning **what happens underneath the buttons**. It is based on the current TDL repository, not a generic tutorial. Follow the links to the real source as you read.

**Source:** [app/index.html](../app/index.html), [app/sw.js](../app/sw.js), [app/manifest.webmanifest](../app/manifest.webmanifest).

## 0. The big picture

~~~text
                     GitHub Pages website
                       (public app files)
                               |
                        Browser downloads
                               |
                       app/index.html
                /              |              \
            HTML               CSS          JavaScript
          structure           design         behavior
                                                |
                                          localStorage
                                    / tasks / activities /
                               settings / focus / reminders
                               |
                         Browser on that device

           NO cloud task database or Firebase connection today
~~~

The website file is *the program*. Your saved tasks are *the data*. Keeping them separate in your head helps explain why updating GitHub can change the interface without necessarily changing tasks already stored in Chrome.

## 1. The five files with the biggest jobs

| File | Job | When you edit it |
| --- | --- | --- |
| `index.html` (repository root) | Redirects from `/TDL/` to `/TDL/app/` | Rarely; only when changing the entry route |
| `app/index.html` | Contains the user interface, CSS, and JavaScript | For most appearance and feature changes |
| `app/sw.js` | Caches the application files for offline loading | When changing service-worker behavior or deliberately advancing cache version |
| `app/manifest.webmanifest` | Defines the installed app's name, icon, colors, display, and start URL | To change installation metadata |
| `app/icon.svg` | Vector drawing used as the app icon | To change the icon |

The entire app is written without a conventional build pipeline. There is currently no `package.json`, Node runtime, React framework, or database server to configure just to serve it.

## 2. The anatomy of `app/index.html`

It looks roughly like this:

~~~html
<!doctype html>
<html lang="en">
<head>
  <!-- Metadata, manifest, icon, title -->
  <style>
    /* CSS rules: colors, layouts, buttons, responsive behavior */
  </style>
</head>
<body>
  <!-- The visible elements and dialogs -->
  <script>
    // JavaScript app logic, event listeners, storage, timers
  </script>
</body>
</html>
~~~

The real file is more compact because many CSS and JavaScript statements are on long lines. When you're learning, use your editor's **Format Document** feature *on a copy or branch*, not directly on production, so you can read them.

### Three crucial selectors

- `#title` targets the element with `id="title"`.
- `.btn` targets elements with `class="btn"`.
- `[data-action="toggle"]` targets elements with that `data-action` attribute.

TDL uses a shortcut function:

~~~js
function $(s) {
  return document.querySelector(s);
}
~~~

So `$("#title")` means “find the first HTML element with the ID `title`.” The related `all(s)` helper returns all matching elements.

## 3. Follow one task all the way through

Let's trace what happens when you save `Read chapter 7`:

**Step A — The HTML form exists.** Search the code for `id="form"` and `id="title"`. The browser displays those inputs.

**Step B — You click Save task.** JavaScript runs the event listener:

~~~js
$("#form").addEventListener("submit", function (e) {
  e.preventDefault();
  // ... read inputs and assemble the task object ...
  // ... add or replace an entry in tasks ...
  save();
  close();
  render();
});
~~~

`e.preventDefault()` stops the browser from navigating away like a traditional website form would.

**Step C — A JavaScript object is created.** A simplified version:

~~~js
{
  id: "unique-task-id",
  title: "Read chapter 7",
  category: "Homework",
  priority: "medium",
  dueDate: "2026-10-20",
  dueTime: "23:59",
  notes: "",
  subtasks: [],
  completed: false,
  createdAt: 1790000000000,
  updatedAt: 1790000000000
}
~~~

The numbers above are illustrative—not real task timestamps. Actual tasks can also include `assignmentUrl`, `repeat`, `repeatEnd`, `repeatAnchorDay`, and `seriesId`. The `id` is how TDL finds the *same task* when you edit or complete it.

**Step D — It's kept in an array.** `tasks` is an array (ordered collection) of objects. Adding pushes an item; editing replaces the matching entry; deleting filters it out.

**Step E — `save()` writes to the browser.**

~~~js
var KEY = "tdl.tasks.v1",
    tasks = read();

function read() {
  // Read JSON string from localStorage and parse into an array.
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(tasks));
}
~~~

The real functions wrap storage access in `try/catch` to handle failures. `JSON.stringify` converts JavaScript data into text; `JSON.parse` reconstructs it on the next visit.

**Step F — `render()` updates the screen.** It finds the visible tasks, builds their HTML, updates the counts and sidebar, and replaces the displayed list.

That is the central flow:

~~~text
USER INPUT → EVENT LISTENER → TASK OBJECT → tasks ARRAY
                                           |
                                         save()
                                           |
                                      localStorage
                                           |
                                         render()
                                           |
                                   UPDATED TASK LIST
~~~

## 4. Why editing and rendering are different

A **data change** changes `tasks` in memory. A **render** redraws the interface to match that data. These are deliberately separate concepts.

Suppose you alter `task.title` in the Console but never call `save()`. The title may vanish after refresh because the change was not persisted.

Suppose you save it but never call `render()`. The data changed, but the visible screen can remain stale until another render happens.

Think:

- `tasks` = current state in working memory.
- `save()` = persist tasks in this browser.
- `render()` = show state on screen.

There is currently no account-aware `save()`. It knows nothing about Firebase or your other devices.

## 5. The task logic by function name

Open `app/index.html` and use Find (Command/Control + F):

| Function | What it does |
| --- | --- |
| `read()` / `save()` | Load and store tasks |
| `today()` | Return today's local date as `YYYY-MM-DD` |
| `parseDate()` | Validate an actual calendar date |
| `dueAt(t)` | Convert a task's date/time to a JavaScript Date |
| `overdue(t)` / `dueToday(t)` | Decide which tasks match deadline conditions |
| `counts()` / `stats()` | Calculate and display dashboard counts |
| `getTasks()` | Filter, search, and sort tasks |
| `render()` | Draw task cards and refresh the page |
| `open(t)` / `close()` | Open/close the Add/Edit form |
| `taskSubtasks(t)` | Safely retrieve a task's steps |
| `renderSubtaskEditor()` | Draw the editable subtask list |
| `renderCategoryNav()` | Add custom categories to the sidebar |
| `nextRepeatDate()` | Calculate the next recurrence |
| `spawnNextOccurrence(t)` | Add another recurring task after completion |
| `parseAssignment()` | Guess task details from pasted text |
| `esc()` | Escape special characters before building HTML strings |

**One learning tip:** Don't edit a function until you have also found *where it is called*. Changing `save()` affects almost every operation; changing a small CSS rule generally affects only appearance.

## 6. Why HTML escaping matters

Task titles and notes come from user input. The function `esc()` converts characters such as `<` and `&` before inserting them into generated HTML.

Without escaping, a string that looks like HTML could be interpreted as markup instead of plain task text. That can lead to security bugs known as **cross-site scripting (XSS)**.

Keep this distinction:

~~~js
element.textContent = title; // treats title as text

// If constructing HTML strings, escape untrusted values first:
element.innerHTML = "<strong>" + esc(title) + "</strong>";
~~~

Never replace escaped task titles with raw user input inside `innerHTML`. This becomes even more important if tasks are later synchronized across devices.

## 7. How recurring tasks work

The repeating-task algorithm is intentionally **completion-driven**:

1. You create a task with a recurrence setting and a due date.
2. You finish that occurrence.
3. `spawnNextOccurrence(t)` calculates the next date with `nextRepeatDate()`.
4. TDL adds a fresh task ID, resets `completed` to `false`, and resets its subtasks.
5. The old completed occurrence remains in history.

A `seriesId` connects occurrences. `repeatAnchorDay` helps monthly/yearly schedules maintain their intended calendar day when a month is shorter.

**Consequence:** If you never complete the current occurrence, TDL doesn't automatically generate a long backlog of repeated future tasks.

## 8. How overdue check-ins and the activity bank work

**Activity bank:** `activityBlockers()` searches for tasks that are both incomplete and due today or earlier. If there are blockers, `renderActivityBank()` hides the add/list/random controls and displays a lock message. Saved activities remain intact.

**Check-ins:** `checkOverdueCheckins()` looks for overdue tasks, checks a stored timestamp for that task/deadline, and asks again when 90 minutes have elapsed. The timestamp is saved in `tdl.overdueCheckins.v1` so refreshing the page doesn't reset the cooldown.

Both are *local JavaScript behaviors*. They run while the app is operating, not on a remote scheduler. The actual modal and browser notification are different things.

## 9. How focus mode works

- `parseTimerInput()` validates user-entered minutes/seconds.
- `tickTimer()` updates the countdown.
- `startFocusSession()` creates an in-memory record.
- `scheduleFocusCheck()` chooses the next randomized check time.
- `maybeFocusCheck()` displays a question when due.
- `finishFocusCheck()` records the outcome.
- `saveFocusSession()` stores a finished session in `tdl.focusSessions.v1`.

The timer uses clock time to calculate when it ends. The session's active-time counter uses periodic ticks and caps individual increments, so a suspended/background tab can make focus-session minutes inaccurate. That is a **known limitation**, not evidence that your data disappeared.

## 10. Browser notifications vs. true background push

TDL currently checks deadlines from page JavaScript on a repeating interval. To display alerts, it prefers a registered service worker's `showNotification()` method when supported, and otherwise tries the browser's `Notification` constructor. The **Send test notification** button in Settings helps check permission and API acceptance. Therefore:

- Granting browser permission is necessary but not sufficient.
- The browser or operating system can block or suppress notifications even when the API call succeeds.
- Closing the app stops its page timers.
- TDL has no push server to schedule reminders when all of its tabs/windows are closed.

A full background push architecture would require additional services and permissions. Installing the app as a PWA does not alone add that infrastructure.

## 11. How offline caching works

Open [app/sw.js](../app/sw.js). It declares:

~~~js
const CACHE_NAME = "tdl-shell-v20";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];
~~~

The version changes over time; the number above was current when this guide was written.

- **install:** Fetch/cache app files and request activation.
- **activate:** Delete older `tdl-shell-*` caches and take control of clients.
- **fetch:** Try the network first for same-origin GET requests. If that fails, return the cached response; for navigation, try the cached app shell.
- **manifest:** Defines the installed app name and icon, but contains no task data.

This is **network-first with an offline fallback**, not “always load only the cache.” A stale open tab or interrupted deployment can still complicate updates. Caches hold app files; `localStorage` holds tasks. They are different storage systems.

## 12. Where the source should improve someday

The single HTML file is convenient but growing. A maintainable future layout could separate:

~~~text
app/
  index.html         UI structure
  styles.css         UI appearance
  js/
    storage.js       local read/write/backup
    tasks.js         task calculations
    ui.js            rendering and interactions
    focus.js         timer and checks
    reminders.js     notifications and check-ins
    sync.js          FUTURE Firebase implementation only
  sw.js              PWA caching
~~~

**This is a suggested refactor, not today's directory structure.** Before splitting the file, set up repeatable smoke tests and preserve the existing storage keys.

## 13. If you want to understand one feature completely

Use this sequence:

1. Search for the feature's visible label in the HTML.
2. Find its `id` or `class`.
3. Search for that selector in the JavaScript.
4. Follow the event handler into the functions it calls.
5. See whether it changes `tasks`, `activities`, or another variable.
6. Look for a storage write and a call to `render()`.
7. Test the behavior in a disposable browser profile.

Next: [Editing TDL](EDITING_TDL.md) shows the exact workflow for making your own changes.
