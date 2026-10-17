# Editing TDL — Step by Step, Without Relying on Anyone Else

The point of this guide is that **you can modify your own app confidently**. Every example below tells you *which file*, *what to search for*, *what to change*, *how to test*, and *how to undo it*.

**The rules before touching code:** Keep a backup of your TDL data. Keep a working Git version. Test small changes before putting them on the live site.

## 1. Safest beginner route: edit through GitHub

You do not have to install Git or write Terminal commands to begin.

1. Go to https://github.com/Schneider-Joseph/TDL and sign into the account with access.
2. Open `app` → `index.html`.
3. Click the pencil **Edit this file**, or press `.` on the repository page to open github.dev (the browser-based code editor).
4. **Create a new branch for this edit** instead of committing directly to `main`, when the interface offers that option.
5. Make one small change.
6. Look at the **diff**. Red lines were removed; green lines were added.
7. Write a clear commit message, such as `Make task headings larger`.
8. Open a pull request, review the diff, and merge only when satisfied.
9. Refresh the live app after deployment. Cached versions can take time to update.

**Caution:** GitHub Pages serves the main branch. A branch is not automatically a separate public preview. For testing actual behavior before merging, use a local copy or a separate staging site.

### What are branches, commits, and pull requests?

- **Branch:** A separate path for experimenting without immediately changing production.
- **Commit:** A named, saved snapshot of changes.
- **Diff:** A view of exactly what changed between snapshots.
- **Pull request (PR):** A place to review changes before merging them.
- **Merge:** Incorporate your tested changes into the live branch.

You can make a mistake on a branch without affecting production, provided you haven't merged it.

## 2. Local development on a Mac (recommended for real changes)

### One-time setup

Install **Visual Studio Code** and Git (Git is often available through macOS developer tools; check before installing anything). Open **Terminal**, then:

~~~bash
git --version
python3 --version
git clone https://github.com/Schneider-Joseph/TDL.git
cd TDL
code .
~~~

If `code .` is not recognized, open VS Code normally, choose **File → Open Folder**, and select the TDL directory.

**Do not enter credentials into files or paste secret tokens into chat.** Git may prompt you to authenticate before pushing; use GitHub's supported sign-in/credential flow.

### Start a safe branch

~~~bash
git switch -c learn-change-button-style
~~~

### Run the existing app locally

From inside the `TDL` folder:

~~~bash
python3 -m http.server 8000
~~~

Then in Chrome open:

~~~text
http://localhost:8000/app/
~~~

Stop the local server with **Control + C** in Terminal.

**Why use a server instead of double-clicking HTML?** The PWA service worker requires a secure context (HTTPS or supported localhost development). Local file URLs (`file://`) can have different browser security/storage behavior. A local HTTP server makes testing closer to real deployment.

**Data warning:** `localhost` has its *own* browser storage. It is not the production site's storage. This is a feature: you can experiment with fake tasks there.

## 3. Change the colors

**File:** `app/index.html`, near the top.

**Search for:** `:root{color-scheme:dark;`

You'll find CSS variables similar to:

~~~css
:root {
  --bg: #11151d;
  --panel: #1a202b;
  --text: #eef2f8;
  --green: #b3f28a;
}
~~~

Examples:

- Change `--bg` to alter the main background.
- Change `--panel` to alter card backgrounds.
- Change `--green` to change the accent color.
- Change `--text` to change primary text.

**Test:** Reload your local app and verify text still contrasts with its background. Check buttons, badges, focus timer, and mobile screen width.

**Undo:** In VS Code, use Undo before committing, or run `git restore app/index.html` *only if you want to discard every uncommitted change in that file*.

## 4. Change the top-left rotating quotes

**File:** `app/index.html`.

**Search for:** `var taglines=`

The current array contains **two quotes**:

~~~js
var taglines = [
  "Man... DO DAT SHET.",
  "This needs to get done like today btw."
];
~~~

Edit the words between quotation marks to your preference.

**Search for:** `},15000);` near the tagline rotation code.

`15000` is **15,000 milliseconds**, which equals **15 seconds**. For a 30-second rotation, change it to `30000`.

Don't accidentally change another unrelated timer. Search for the specific `taglines` block first.

**Search for:** `.brand p{` to change tagline weight/size. The styling currently reserves space so changes in quote length don't push the Settings/Export buttons sideways. If you remove that spacing or alter `header` layout, test narrow screens carefully.

## 5. Change the default focus timer

**Without editing code:** Open **TDL → Settings** and change **Default timer duration (minutes)**. The supported range is 1–180 minutes.

**In code:** Search for `function readSettings()` and its fallback value `25`. It currently defaults to 25 minutes *only when no valid preference is stored*. If you change the fallback to 35, devices that have already saved a 25-minute preference may still display 25.

This teaches an important idea: **a user preference in storage takes precedence over a code default**.

**Don't change the focus timer's milliseconds calculations unless you understand its use of `Date.now()` and `remainingMs`.**

## 6. Change the 90-minute overdue reminder interval

**File:** `app/index.html`.

**Search for:** `CHECKIN_MS=90*60000`

Why multiply by `60000`? JavaScript clocks use **milliseconds**. One minute is 60 seconds × 1,000 milliseconds = 60,000.

Examples:

~~~js
CHECKIN_MS = 30 * 60000;  // 30 minutes
CHECKIN_MS = 90 * 60000;  // 90 minutes (current)
CHECKIN_MS = 120 * 60000; // 2 hours
~~~

**Be aware:** A saved check-in timestamp is compared with the new threshold. Changing the interval doesn't magically create a background alarm or clear saved reminder history.

**Test:** Create a disposable task with a deadline in the past, observe the first prompt, and verify that declining doesn't immediately loop. Use a test browser profile to avoid mixing this with your real assignments.

## 7. Change the Activity Bank unlock rule

**Search for:** `function activityBlockers()`

Current logic (simplified):

~~~js
function activityBlockers() {
  return tasks.filter(function (t) {
    return !t.completed && t.dueDate && t.dueDate <= today();
  });
}
~~~

Translate it into English:

- `!t.completed` = task is not finished.
- `t.dueDate` = task has a due date.
- `t.dueDate <= today()` = date is today or earlier.
- `filter` returns those tasks, which keep the activity bank locked.

If you later want to block activities when *any* task is unfinished, you could experiment on a branch with:

~~~js
return tasks.filter(function (t) {
  return !t.completed;
});
~~~

But that changes the purpose of the feature. Test before merging.

## 8. Add or change categories

**No code edit needed:** Click **Add task**, type a category in the text box, and save. Categories with tasks automatically appear in the sidebar.

The default category names are also in `renderCategoryNav()`. Changing those default display names does not automatically rename categories already saved on tasks. The category is stored as a text property on each task.

If you want to *rename every saved category*, that is a **data migration**. See [Data and Backups](DATA_AND_BACKUPS.md). Never assume changing a dropdown label updates existing data.

## 9. Change the notification or focus questions

- Focus questions: Search for `var focusQuestions=[`. Each question has a `q` prompt and acceptable `a` answers; `ex` is an explanation field. Test new questions carefully.
- Notification text: Search for `sendTaskNotification(`. Changing the displayed message is different from changing *when* notifications run.
- Focus check timing: Search for `scheduleFocusCheck()`. It currently uses a randomized interval. Randomized timing and app suspension mean exact scheduling isn't guaranteed.

**Security rule:** Don't add code that requests browser notification permission without a user gesture. Browser permission prompts are controlled by the browser.

## 10. Change the installed app's name or icon

**Files:** `app/manifest.webmanifest` and `app/icon.svg`.

Change `name` and `short_name` in the manifest to change how the installed app is labeled (subject to browser support). The manifest refers to the SVG icon file.

**Possible gotcha:** Browsers can cache installed app metadata and icons separately, so changes may not appear immediately on existing installations.

**Do not change** `start_url` or `scope` casually. Those values define how the PWA launches and which URLs belong to it.

## 11. Learn to add a new feature (a safe example)

Suppose you want a button that shows a helpful hint.

**Step A: Add HTML**, near an appropriate existing button:

~~~html
<button class="btn" id="hintButton" type="button">Show hint</button>
~~~

**Step B: Add a JavaScript listener**, inside the existing `<script>` block before its final closing lines:

~~~js
$("#hintButton").addEventListener("click", function () {
  notify("Work on one thing at a time.");
});
~~~

**Step C: Test locally.** Click the button, look for errors in the Console, and check small screens.

**Step D: Commit.** Because this example does not alter stored tasks, it has relatively low risk.

For anything that *does* change task data, follow the full lifecycle described in [How TDL Works](HOW_TDL_WORKS.md): input → validation → state → persistence → render.

## 12. A check-before-merging checklist

On a **test origin/profile** with fake data, check:

- [ ] The page loads without red Console exceptions.
- [ ] Add a task and refresh; it remains.
- [ ] Edit task title/category/due date.
- [ ] Create a custom category and click its sidebar filter.
- [ ] Toggle a subtask and parent task.
- [ ] Delete a disposable task.
- [ ] Create/complete a recurring task; verify the next occurrence.
- [ ] Run, pause, and reset the timer.
- [ ] Add an optional activity when unlocked.
- [ ] Export a JSON backup, confirm the file exists, and inspect it.
- [ ] Check the layout at narrow mobile width.
- [ ] Check a brand-new browser profile for first-run notification permission behavior.
- [ ] Verify no real tasks or credentials are included in commits.

Do not clear your *real* TDL site's storage while testing.

## 13. Check the JavaScript for syntax errors

If you have Node installed, you can extract the inline script or use your editor's JavaScript language diagnostics. The easiest beginner check is:

1. Open your **local** TDL page.
2. Press **Command + Option + J** on Mac Chrome (Control + Shift + J on Windows) for the Console.
3. Reload the page.
4. Find the **first red error** and the file/line reference.

A syntax check catches malformed JavaScript but **does not prove buttons work**. Always test behavior too.

## 14. Commit and push local changes

~~~bash
git status
git diff
git add app/index.html
git commit -m "Improve task interface"
git push -u origin learn-change-button-style
~~~

Open the branch on GitHub and create a PR. After review, merge to `main`.

**GitHub Pages can take some time to publish changes.** Refreshing Chrome may also show an old service-worker cache. Use the [Troubleshooting](TROUBLESHOOTING.md) guide rather than deleting storage.

## 15. Undo mistakes safely

**Uncommitted change you want to discard:**

~~~bash
git restore app/index.html
~~~

This replaces the working copy of that file with its last committed state. Any uncommitted edits in that file are lost.

**A change was already committed and pushed:**

1. Locate the problem commit in GitHub's **Commits** history.
2. Use a **Revert** action if available, or from a local branch:

~~~bash
git revert YOUR_COMMIT_SHA
git push
~~~

Do not paste `YOUR_COMMIT_SHA` literally. Replace it with the real commit hash. **Revert creates a new commit** that undoes the old one; that is usually safer than force-pushing or rewriting history.

**Never use `git reset --hard` or force push as your first response to a bug.** These can discard work or rewrite shared history.

## 16. An upgrade you should consider later: automated tests

Today's app primarily relies on manual checks. As the source grows, consider:

- Unit tests for `parseDate()` and `nextRepeatDate()`.
- Tests for filters and priority sorting.
- Local-storage migration tests.
- Browser tests for creating, editing, and completing tasks.
- Service-worker update and offline-launch tests.
- Future Firebase Security Rules emulator tests.

The long-term goal is to make it safe for *you* to change the app without fearing every edit.

Next: [Data and Backups](DATA_AND_BACKUPS.md) explains exactly what you risk when changing persistence.
