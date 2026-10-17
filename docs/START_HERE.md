# Start Here — Learn TDL Without Getting Lost

**Who this is for:** The person who owns and uses TDL, even if they have never built a web application. This is a practical guide, not a computer-science exam.

**Our rule:** You should be able to answer *“What happens if I change this line?”* before changing it. When a change is risky, back up first and test somewhere other than your daily TDL app.

## 1. What is TDL, really?

TDL is a **website that can behave like an installed app**. The technical name is a *Progressive Web App* (PWA). It uses three ordinary web technologies:

- **HTML:** Defines the things you see—the Add Task button, task form, clock, and lists.
- **CSS:** Determines how those things look—the dark background, green buttons, spacing, fonts, and responsive layout.
- **JavaScript:** Makes those things work—saving a task, checking deadlines, moving tasks into categories, running the focus timer, and showing check-ins.

All three live together inside `app/index.html`. This choice makes TDL easy to deploy and inspect, although the file is now large and should eventually be split into smaller modules.

TDL also has a **service worker** (`app/sw.js`). Think of it as a small helper the browser may run separately to cache the application's files so it can reopen without a network connection. It is *not* a continuously running server or alarm clock.

## 2. Find the app and the code

- **Use TDL:** https://schneider-joseph.github.io/TDL/app/
- **Read its code:** https://github.com/Schneider-Joseph/TDL
- **Main file:** https://github.com/Schneider-Joseph/TDL/blob/main/app/index.html
- **Documentation:** Start at the repository's `README.md` and open the `docs/` folder.

The root `index.html` simply redirects to the real app at `app/`. A GitHub *repository* is the folder containing the code and its change history. GitHub *Pages* turns files from that repository into the public website.

## 3. What the screen means

When you open TDL:

1. **Top-left:** TDL branding and two rotating quotes. The quotes change every 15 seconds.
2. **Top buttons:** Settings, Export, Import, Paste assignment, and Add task.
3. **Clock:** Your device's local time and countdowns for upcoming deadlines.
4. **Focus timer:** A directly editable time field, Start/Pause/Reset controls, focus task selection, and recent session history.
5. **Four statistics:** Open, Due today, Overdue, and Completed. They also work as filters.
6. **Sidebar:** Task views and your categories, including categories you type yourself.
7. **Task area:** Tasks, subtasks, dates, priorities, notes, and Edit/Delete controls.
8. **Bored? Do This.:** A separate bank of optional activities, locked while you still have incomplete tasks due today or earlier.

## 4. Your first task: a walkthrough

Pretend you're making a test entry. Use a disposable browser profile or test copy if you don't want the example to mix with real work.

1. Click **Add task**.
2. Enter **Practice Python for 30 minutes**.
3. Click **Category**. It is a *normal editable text field*, not a fixed dropdown. Enter `Learning`.
4. Choose your priority and, if needed, a due date/time.
5. Add notes and optional steps such as `Choose exercise` and `Write solution`.
6. Click **Save task**.
7. Look at the sidebar: `Learning` now appears as a category filter.
8. Mark the subtasks complete, then the main task. Completing subtasks **does not automatically complete the parent task**.
9. Export a backup when you're done with real work.

**Why this matters:** A task is a JavaScript object. The interface turns what you typed into properties such as `title`, `category`, `dueDate`, and `completed`. Then TDL saves that object in local storage.

## 5. Where your tasks actually live

Imagine three separate notebooks:

~~~text
MacBook Chrome storage       Windows Chrome storage       Phone browser storage
         |                            |                            |
      tasks A,B                      tasks C                     tasks D
~~~

The code for TDL may be identical everywhere, but the **saved data is separate**. There is currently **no automatic synchronization**. TDL uses browser `localStorage`, not a central database.

That also means **changing code on GitHub normally does not delete your tasks**. But clearing site data, switching browsers, changing the site's origin, resetting your profile, or a storage failure can make locally saved tasks unavailable. Backups matter.

Read [Data and Backups](DATA_AND_BACKUPS.md) before moving between devices or changing storage code.

## 6. The five skills needed to maintain TDL

You can learn these progressively:

1. **Read HTML:** Recognize elements like `<button>` and inputs with an `id`.
2. **Read CSS:** Recognize selectors such as `.btn`, `#tagline`, and properties such as `font-weight`.
3. **Read JavaScript:** Recognize variables, functions, arrays, objects, and event listeners.
4. **Use Git:** Save and compare versions, then undo a bad change.
5. **Debug in Chrome:** Use DevTools Console to read the *first meaningful error*.

You do **not** need Firebase, React, Node, Python packages, or a paid hosting account to understand the current application.

## 7. A miniature example

Consider a button:

~~~html
<button id="exampleButton">Say hello</button>
~~~

- `button` means it is clickable.
- `id="exampleButton"` gives the element a unique name.
- The text between its tags is its label.

JavaScript finds that button and listens for a click:

~~~js
document.querySelector("#exampleButton").addEventListener("click", function () {
  alert("Hello!");
});
~~~

CSS makes it bold:

~~~css
#exampleButton {
  font-weight: 800;
}
~~~

That is the exact pattern used throughout TDL. Instead of showing an alert, TDL's real buttons call functions like `open()`, `render()`, or `save()`.

## 8. How I recommend learning from this repository

**Session 1: Visual changes.** Read [Editing TDL](EDITING_TDL.md) and change one CSS color in a test branch.

**Session 2: Words and labels.** Find `id="tagline"` and the `taglines` array. See how HTML and JavaScript work together.

**Session 3: Tasks.** Trace a task from the Add Task form → JavaScript submit handler → `tasks` array → `save()` → `render()`.

**Session 4: Persistence.** Open Chrome DevTools and inspect `localStorage`. Understand the difference between code and data.

**Session 5: More advanced behavior.** Study recurring tasks, overdue check-ins, the focus timer, and the service worker.

**Session 6: Architecture.** Only after the above, read the [Firebase Sync Design](FIREBASE_SYNC_DESIGN.md). It is an engineering plan, not something already installed.

## 9. A safe five-minute workflow

**Before:** Export tasks and confirm the downloaded file exists. Make a Git branch.

**During:** Change one thing, read the diff, and load a local test copy.

**After:** Check that Add/Edit/Delete, task completion, and backups still work. Commit with a message that says *what changed and why*.

**If broken:** Return to the last good commit. Don't clear browser storage to fix a programming error.

See [Troubleshooting](TROUBLESHOOTING.md) for step-by-step instructions.

## 10. My non-negotiable maintenance rules

- **Never paste your private class schedule, assignment portal token, password, or credentials into GitHub commits.**
- Never run a “fix” that starts by deleting local storage without a verified backup.
- Never leave experimental Firestore rules that allow everyone to read or write.
- Don't confuse an offline installation with cloud sync.
- Don't confuse “GitHub Pages is serving the latest file” with “Chrome is running the latest cached version.”
- Don't merge code you cannot explain without leaving notes explaining it for your future self.

If you remember only one sentence: **TDL is your software; learn how to change it safely by understanding one small part at a time.**
