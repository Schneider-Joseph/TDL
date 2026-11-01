# Maintain and Customize the New TDL Features Yourself

**Updated October 31, 2026.** This is a code-owner's guide for the Notification Center, Undo + Task History, Weekly Calendar, Visual Planner, and Full Backup/Restore. Read the [hands-on user guide](NEW_FEATURES_USER_GUIDE.md) first if you haven't used the screens yet.

The extension files have been committed to the repository. This document explains the **actual code currently present**, not only a future proposal. Full live-browser/installed-PWA testing is still recommended.

## 1. The new files, explained simply

~~~text
app/
  index.html              The original HTML/CSS/JS task dashboard
  tdl-extras.css          Styling ONLY for the new toolbar and panels
  tdl-extras-core.js      Panel shell, task Undo/Redo/history, full backup/restore
  tdl-inbox.js            In-app reminders, snoozing, unread count
  tdl-calendar.js         Weekly deadline display and separate time blocks
  tdl-planner.js          User-created boards, boxes, arrows, drag/pan/zoom
  sw.js                   Offline cache for original app AND new files
~~~

The original TDL task array and `tdl.tasks.v1` key have **not been renamed or replaced**. That matters because your previous browser data is stored under that name.

### How they load

`app/index.html` loads the original inline app logic, then loads these files at the bottom:

~~~html
<script src="./tdl-extras-core.js"></script>
<script src="./tdl-inbox.js"></script>
<script src="./tdl-calendar.js"></script>
<script src="./tdl-planner.js"></script>
~~~

**Order matters.** The last three use services created by the first. If you move the Inbox script above the Core script, it may not initialize. The browser does not magically reorder regular `<script>` elements.

The matching `<link rel="stylesheet" href="./tdl-extras.css">` appears in the HTML `<head>`.

## 2. How the new features talk to old TDL

The original code keeps its `tasks` variable inside a function. Rather than rewriting task storage or pretending `window.tasks` exists, the main app now exposes a deliberately small object:

~~~js
window.TDLAppBridge = {
  getTasks: function () { return tasks; },
  setTasks: function (next) {
    if (!Array.isArray(next)) throw Error("Invalid task array");
    tasks = next;
  },
  save: save,
  render: render,
  openTask: open,
  notify: notify
};
~~~

This object is a **bridge**. Imagine a doorway between the old task manager and the new features. It does not create a new account or send data anywhere.

For example, the Calendar can call:

~~~js
const existing = window.TDLAppBridge.getTasks();
~~~

The result is a reference to your current task array **in memory**. Do not casually change its objects without using the normal validation and save workflow.

### How Undo knows something changed

The existing `save()` function now reads the **previously saved** task-array JSON before writing the new value, then calls:

~~~js
window.TDLX.afterTaskSave(priorData);
~~~

Only when the extension exists. The history module compares **before** and **after** objects, records changed task IDs and snapshots, then makes Undo possible. If the extension is missing, the original save path still works.

**Important engineering limitation:** The old tasks key and new history key are separate `localStorage` writes. They are **not one atomic database transaction**. This is why Full Backup and conservative recovery still matter.

## 3. The shared extension API

`tdl-extras-core.js` creates `window.TDLX`. Important functions:

| Name | Meaning |
| --- | --- |
| `TDLX.register(name, title, renderFn)` | Register a page or utility dialog |
| `TDLX.open(name)` | Open a full page (Inbox/Calendar/Planner) or modal (History) |
| `TDLX.close()` | Close History, or return an active workspace page to Dashboard |
| `TDLX.navigate(name)` | Navigate to a workspace route and update the URL hash |
| `TDLX.getPage()` | Return the current page name, or blank for Dashboard |
| `TDLX.refresh()` | Redraw the active workspace page or open utility dialog |
| `TDLX.tasks()` | Read the current original task array |
| `TDLX.store(key, fallback)` | Safely parse JSON from a local storage key |
| `TDLX.put(key, value)` | Attempt to write a JSON value to browser storage |
| `TDLX.undo()` | Undo latest eligible task change |
| `TDLX.redo()` | Redo latest eligible undone task change |
| `TDLX.fullBackup()` | Download a full local TDL snapshot |
| `TDLX.escape(text)` | Escape user text inserted into generated HTML |
| `TDLX.toast(text)` | Show TDL's existing feedback message |

**Never use `TDLX.put("tdl.tasks.v1",...)` to overwrite real tasks from experimental code.** The normal task saving and history bridge should own that path.

**New layout:** Dedicated page routes (`#inbox`, `#week`, `#planner`) live in `app/tdl-extras-core.js`; their visual rules are in `app/tdl-workspace.css`. `app/tdl-calendar.js` now renders both an hourly Timeline and Agenda. See [Workspace Pages](WORKSPACE_PAGES.md) for the mental model, navigation, local test steps and data-safety rules.

## 4. Customize the Notification Center

**File:** `app/tdl-inbox.js`.

Search for these exact names:

| Want to change | Search for | What the current code does |
| --- | --- | --- |
| Maximum inbox entries | `max=250` | Tries to keep up to 250, retaining active items ahead of resolved ones |
| Time for “due soon” | `120*60000` | Uses 120 minutes (milliseconds) as the lead window |
| Snooze options | `snooze15`, `snooze60`, `snoozeTomorrow` | Sets a future time before the alert returns |
| Inbox storage key | `tdl.inbox.v1` | Where in-browser notification records live |
| Event matching | `eventKey=` | Identifies task/date/type to avoid duplicates |
| Unread counter | `function unread()` | Counts active, unread, unsnoozed items |
| Visible interface | `X.register("inbox"` | Renders the bell's inbox panel |

### Example: change due-soon lead time

**Current:**

~~~js
else if(d.valueOf()-now<=120*60000)types.push("due_soon");
~~~

To use a **3-hour** lead window for tasks not already due today:

~~~js
else if(d.valueOf()-now<=180*60000)types.push("due_soon");
~~~

**Practice:** Explain in your own words what `180*60000` means before changing it. Then test a fake task with a deadline 2 hours and 45 minutes away.

**Warning:** This is **in-app** detection. It does not create a new background push service. The app must run or be reopened to discover events.

## 5. Customize Undo + Task History

**File:** `app/tdl-extras-core.js`.

Find:

- `const historyKey="tdl.taskHistory.v1"` — browser key used for actions.
- `function diff(before,after)` — discovers which task IDs changed.
- `function afterTaskSave(beforeRaw)` — logs changes.
- `function restoreChanges(changes,target)` — applies Undo/Redo with conflict checks.
- `function undo()` and `function redo()` — action navigation.
- `function recoverDeleted(actionId,taskId)` — restore a deleted task from its history snapshot.
- `showUndoToast(label)` — short Undo prompt.

### Example: increase retained history from 50 actions to 80

Find:

~~~js
if(h.entries.length>50)h.entries.splice(0,h.entries.length-50);
~~~

Change both 50s to 80. Also update the text in the Task History panel that describes the limit.

**Tradeoff:** More full task snapshots take more local storage. Don't raise the limit to thousands without considering quota and testing recovery. History is not an off-device backup.

### Example: change Undo prompt visibility

Find:

~~~js
undoToastTimer=window.setTimeout(()=>{undoToast.hidden=true},10000);
~~~

To display it for 15 seconds, use `15000`. That only changes the **prompt visibility**, not the actual history retention window.

### A particularly important recurring-task test

1. Make a fake weekly recurring task.
2. Complete it.
3. Confirm the original occurrence becomes completed and the next occurrence is created.
4. Click Undo.
5. Confirm the original is incomplete and that the new occurrence disappears.
6. Click Redo.
7. Confirm both changes return **exactly once**.

If step 5 or 7 fails, don't merge the change.

## 6. Customize Weekly Calendar

**File:** `app/tdl-calendar.js`.

| Want to change | Search | Current behavior |
| --- | --- | --- |
| Stored work blocks | `tdl.timeBlocks.v1` | Separate from actual task deadlines |
| Number of days | `length:7` | Exactly seven days |
| Week starts Monday | `(x.getDay()+6)%7` | Monday is day zero |
| Block data validation | `validTimes(start,end)` | Requires sensible chronological local datetimes |
| Add/Edit work block | `id="tdlx-block-form"` | Shows block title, start/end, linked task, notes |
| Block storage limit | `next.length>500` | Prevents excessive local growth |
| Moving between days | `c.ondrop=e=>` | Shifts block date, keeping its clock time |
| Open original task | `window.TDLAppBridge.openTask(t)` | Doesn't duplicate or recreate a task |
| Calendar UI | `X.register("calendar"` | Renders a 24-hour weekly Timeline and Agenda inside the full page |
| Timeline events | `daySegments(d)` and `eventChip(event)` | Splits blocks across days and assigns lanes for overlaps |
| Agenda rows | `agenda(days)` | Alternative list view on narrow screens |
| Page styling | `app/tdl-workspace.css` | Grid tracks, deadline row and full-page editor |

### Example: change to Sunday week start

**Current calculation:**

~~~js
const getWeek=d=>{
  const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  x.setDate(x.getDate()-((x.getDay()+6)%7));
  return x;
};
~~~

For Sunday-first weeks:

~~~js
const getWeek=d=>{
  const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  x.setDate(x.getDate()-x.getDay());
  return x;
};
~~~

**Important:** Test a week spanning December 31–January 1. Changing only the visible weekday labels would not change where events belong.

### How dates are kept separate

- A task keeps `dueDate` and `dueTime`.
- A scheduled block has `start` and `end`.
- A block can reference `taskId`, but that does not make it the task.

The calendar is deliberately **not** a second copy of your entire to-do list.

## 6a. Connected task graph and Planner node references

TDL now has an independent `app/tdl-connections.js` module and `tdl.connections.v1` storage key for validated directional and symmetric relationships. **Planner nodes** can optionally store a `taskId` referring to an existing original task; this does not rewrite the underlying task. To navigate from a Planner node, use `window.TDLConnections.openTask(taskId)`. See [Connections](CONNECTIONS.md).

## 7. Customize Visual Planner

**File:** `app/tdl-planner.js`.

Find:

| Want to change | Search | Meaning |
| --- | --- | --- |
| Storage key | `tdl.boards.v1` | Browser-stored board records |
| Max number of boards | `next.length>30` | Prevents excessive board creation |
| Max nodes per board | `b.nodes.length>120` | Current node limit |
| Max connections per board | `b.edges.length>300` | Current arrow limit |
| Node width and height | `width=172,height=82` | Used to position arrow endpoints |
| Minimum/maximum zoom | `clamp(zoom+0.15,.4,1.8)` | Current zoom range |
| Node creation | `id="tdlx-node-form"` | Node title + notes |
| Arrow creation | `connectFrom` | Source node then destination node |
| Move a node | `window.addEventListener("pointermove"` | Pointer drag; position saved on release |
| Keyboard movement | `c.onkeydown=e=>` | Arrow keys, with Shift for larger movement |

### Change the colors, corners, or node sizes

**File:** `app/tdl-extras.css`.

Look for:

~~~css
.tdlx-node { ... }
.tdlx-board-viewport { ... }
.tdlx-board-lines { ... }
~~~

If you change the node's CSS width/height, update `width=172,height=82` inside the JavaScript as well, or the arrows may attach at the wrong point.

### Change initial node positions

Search for:

~~~js
x:120+Math.floor(Math.random()*200)
~~~

The code spreads new boxes slightly instead of stacking all of them in the same spot.

### Basic board data structure

~~~json
{
  "id": "board-1",
  "title": "Robot Build",
  "nodes": [
    {"id":"n1","title":"Choose motor","notes":"","x":120,"y":130},
    {"id":"n2","title":"Test motor","notes":"","x":340,"y":150}
  ],
  "edges": [
    {"id":"e1","from":"n1","to":"n2","label":"Then"}
  ]
}
~~~

**This is an illustrative JSON example**, not the contents of your private browser. Each arrow references two node IDs, not two copies of a node.

### Keep the graph valid

- Deleting a node should remove arrows pointing to it.
- Renaming a node must preserve its ID; connections depend on it.
- Changing a board's title shouldn't affect its node IDs.
- Invalid imported or stored nodes should be ignored or quarantined, not executed as code.
- Never replace escaped user titles with raw `innerHTML` interpolation.

## 8. Customize the styling safely

**File:** `app/tdl-extras.css`.

Every new selector starts with `.tdlx-`. That's intentional: the existing dashboard has its own CSS rules and shouldn't be globally restyled just because you change the Visual Planner.

For example:

~~~css
.tdlx-card {
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
}
~~~

Change the border radius on a **test branch** and see which screens it affects. The `var(--line)` syntax reuses the original TDL theme color rather than inventing another hard-coded color.

## 9. Export, Restore, and Recovery internals

**File:** `app/tdl-extras-core.js`.

Search for:

- `function fullSnapshot()`: reads recognized `tdl.*.vN` keys.
- `function downloadJSON(value,name)`: creates a downloadable backup file.
- `function fullBackup()`: initiates a full export.
- `function validateBackup(b)`: validates basic backup structure.
- `async function restoreFile(file)`: previews and restores selected keys after confirmation.

**Caution:** This is a **localStorage snapshot**, not a multi-device sync engine. Restoring one device's full snapshot on another can replace the second device's unique tasks.

The restore code attempts to back up existing storage first and to roll back a failed write. Browser storage writes across multiple keys aren't a database transaction, and partial failures can still require manual recovery from the downloaded file.

### The single most important debugging distinction

- **Git revert:** Undo a change to the app's code.
- **Undo button:** Undo a recent task mutation tracked by the new history system.
- **Full restore:** Replace browser storage values from an external backup, after confirmation.
- **Cloud sync:** Not implemented; none of the above makes devices synchronize automatically.

## 10. How to test changes without harming your real tasks

1. Open TDL and click **Full backup** on your primary device. Confirm the download is present.
2. Create a Git **branch** for your feature.
3. Serve the repo on `http://localhost:8000/app/` using `python3 -m http.server 8000` from its root.
4. Use **fake tasks** on localhost. Those are separate from your real GitHub Pages storage.
5. Test Create/Edit/Delete/Complete/Undo/Redo and recurrence.
6. Test Inbox when native notification permission is blocked.
7. Test Week navigation and changing block times without changing a task deadline.
8. Test the Planner with at least two nodes, an arrow, dragging, and deleting a node.
9. Test full export and full restore **in the local test origin**.
10. Check DevTools Console for red errors; check Network for missing script files.
11. Review the Git diff and open a PR before merging to `main`.

**Never clear site data as a quick fix for an app that won't load.** Browser data and source-code changes are distinct.

## 11. Known limitations and improvement ideas

- The extension system still lives alongside a large original inline JavaScript file. A future refactor would benefit from automated browser tests.
- Task History uses two separate localStorage writes; it isn't fully transactional like a multi-store IndexedDB operation.
- Calendar blocks and planner nodes are not yet part of the *task* Undo history; a later release could add a separate Undo stack for them.
- The new Calendar is a seven-day agenda layout rather than a full hourly timesheet.
- The Planner uses browser text prompts for naming boards and connection labels; a polished modal editor may be preferable later.
- External notification banners may still be suppressed by the OS, and there is no closed-app push scheduler.
- There is no Firebase or other device sync. Copies of TDL on different devices remain separate.

Those limits should be understood, not hidden. Expand the code carefully after you can reproduce and test the current behavior.

## 12. How to update this documentation

Whenever you modify a feature:

1. Describe **what changed** and **why**.
2. Show the exact file and function you changed.
3. Record a test you ran with fake data.
4. Record whether the storage format changed.
5. Document rollback and backup implications.
6. Update this guide and the user guide before release.

**The objective is to make you the maintainer of your own software**, not merely a user of code someone else understands.
