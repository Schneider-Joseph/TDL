# Troubleshooting and Recovery — What to Do When TDL Breaks

**First rule: Do not delete browser data to troubleshoot a blank page.** TDL's tasks are browser-local. Clearing site storage or uninstalling/resetting the installed app can erase information you have not backed up.

This guide separates **network problems**, **JavaScript problems**, **stale cached app files**, and **data problems**. They can look similar but require different responses.

## 1. TDL says “This site can't be reached”

Try the direct link:

https://schneider-joseph.github.io/TDL/app/

Look at the *exact* browser error.

| Error or behavior | Likely area to investigate | First safe check |
| --- | --- | --- |
| `ERR_CONNECTION_TIMED_OUT` | Network connection, routing, firewall, DNS, or temporary hosting reachability | Open another website; try a phone hotspot |
| `ERR_NAME_NOT_RESOLVED` | DNS resolution | Try a different connection; inspect DNS/network settings |
| `404 Not Found` | GitHub Pages URL, repository deployment path, or missing file | Confirm URL includes `/TDL/app/` and inspect GitHub Pages deployment |
| `403 Forbidden` | Access restrictions or hosting configuration | Inspect Pages configuration and repo visibility |
| Page loads but stays blank | JavaScript exception, missing resource, or stale service worker | Read Chrome DevTools Console |
| Installed app opens blank but website opens | App cache/service-worker update or installed app state | Check Console and cached asset requests, without deleting storage |

These are diagnostic clues, not definitive causes. A `timed out` error does **not** prove the JavaScript is broken or that GitHub Pages is down.

## 2. TDL's installed Chrome app is blank

Do these **in order**:

1. **Don't uninstall** the installed app yet.
2. Open the **same TDL URL in a regular Chrome tab**.
3. If the normal tab also fails, diagnose the connection first.
4. If the normal tab works, open DevTools in the blank installed app where supported.
5. Open **Console** and look for the first red error.
6. Open **Network** to see whether `index.html`, `sw.js`, or icon/manifest requests failed.
7. Compare the app version shown by its assets with the files on GitHub.
8. Make a task backup **from any working instance of the same browser storage** before attempting invasive repair.

**Important:** Browser HTTP cache, service-worker Cache Storage, and `localStorage` are **different**. “Clear all site data” is far more destructive than refreshing an HTML file.

## 3. The update is on GitHub but isn't showing in TDL

Possible causes:

- You edited a branch but haven't merged it to `main`.
- GitHub Pages hasn't published the latest commit yet.
- The browser is using a stale open page or app shell.
- A service worker is still controlling the old page.
- You updated a file but forgot the necessary cache/version transition.
- The host connection is failing.

**Safe sequence:**

1. Check the latest commit on the repository's `main` branch.
2. Check **Settings → Pages** or the repository's deployment information.
3. Compare `app/index.html` on GitHub with what the browser downloaded.
4. Refresh the normal Chrome tab. Use **Command + Shift + R** (Mac) / **Control + Shift + R** (Windows) if appropriate.
5. Completely close and reopen the installed app.
6. If still wrong, inspect DevTools **Application → Service Workers** and **Cache Storage**. **Observe first, do not click “Clear site data.”**

**If you need to change the service worker:** `app/sw.js` uses a cache version named `tdl-shell-v...`. Increasing it causes new shell caching and old-version cleanup during activation. Treat this as an app-code change to be tested, not a magic fix for a network outage.

## 4. “My tasks disappeared!”

Before anything else, **stop modifying data**.

1. Confirm which device and Chrome profile you used.
2. Confirm you're visiting `https://schneider-joseph.github.io/TDL/app/`, not `localhost` or a different origin.
3. Open **DevTools → Application → Local Storage** and inspect `tdl.tasks.v1` *without editing it*.
4. If the data is still there, take a safe local snapshot (see [Data and Backups](DATA_AND_BACKUPS.md)) and diagnose why the UI isn't displaying it.
5. If there is no data, locate your most recent task-export file. Don't import over a different device's unique tasks without backing that device up first.

A browser failing to render tasks is not automatically equivalent to data deletion.

## 5. A button does nothing

Open DevTools Console:

- **Mac Chrome:** Command + Option + J.
- **Windows Chrome:** Control + Shift + J.

Reload, click the button, and note the **first relevant red error**, including function name and line.

Examples of common programming problems:

- `Cannot read properties of null`: JavaScript looked for an element that does not exist or has a different ID.
- `SyntaxError`: A bracket, quote, parenthesis, or statement was malformed.
- `ReferenceError`: Code tried to use a name that was never defined.
- `QuotaExceededError`: Browser storage cannot save more data.
- `NotAllowedError`: A browser permission blocked the attempted action.

Do not paste secrets or private tasks into public bug reports just because the Console contains them.

## 6. Tasks do not sync between devices

**This is currently expected behavior.** There is no Firebase sync in production.

- Tasks on one browser/device are separate from those on another.
- Use Export/Import for intentional replacement transfer.
- If each device has unique work, exporting one and importing it into the other is **not a merge**.

See [Data and Backups](DATA_AND_BACKUPS.md) and [Firebase Sync Design](FIREBASE_SYNC_DESIGN.md) (future only).

## 7. Notification permission granted, but I still see no alerts

1. **Keep TDL open** during the test. The current app does not send closed-app push notifications.
2. Open **TDL → Settings → Notifications** and check its permission status.
3. If needed, click **Enable notifications** and grant Chrome permission.
4. Click **Send test notification**. Read the result shown in Settings.
5. If TDL says the browser accepted the notification but nothing appeared, open **macOS System Settings → Notifications** and look for **TDL** and/or **Google Chrome**. Confirm alerts are allowed, and check Focus / Do Not Disturb.
6. In Chrome, click the site-controls icon beside the website address, then check the site's **Notifications** permission. Chrome settings can block a specific website.
7. If TDL reports it could not create a notification, capture the first related Console error and your browser/OS details.

**What the test proves:** The browser or service-worker API accepted a notification. It **cannot guarantee macOS displayed a banner**. The app cannot schedule notifications while fully closed without a separate push delivery system.

## 8. Due dates or overdue reminders look wrong

Check:

1. Your device's **date, time, and time zone**.
2. Whether the task has a `dueDate` and optional `dueTime`.
3. Whether you marked the task complete.
4. Whether the tab/app was suspended, closed, or backgrounded.
5. Whether browser notification permission was granted.

No due time means the app assumes approximately 11:59 PM local time on the due date.

The **90-minute overdue check-in** runs while the app is open, with stored cooldown state. It's not a macOS background task or remote server notification.

## 9. The focus timer stops or the history seems short

JavaScript timers can slow down or stop when the browser suspends a page or the app is closed. The display countdown uses wall clock time while running; the recorded active focus time depends on ticks and can undercount while suspended.

Check whether Chrome was backgrounded or the computer slept. Avoid assuming the focus history precisely measures every real-world minute.

## 10. How to roll back a broken code change

**If you created a branch and haven't merged it:** Stop; your live branch remains untouched.

**If you merged a bad change:**

1. Identify the most recent known-good commit on GitHub.
2. Create a new branch.
3. Use a Git **revert** of the offending commit (or carefully restore the prior file contents and commit that restoration).
4. Review the diff; confirm it doesn't revert unrelated good features.
5. Test in a disposable browser profile.
6. Merge the fix.
7. Check that GitHub Pages serves the restored version.

**Why reverting is generally safer:** It produces a new auditable commit instead of rewriting old history.

### Local commands (illustrative)

~~~bash
git status
git log --oneline -10
git switch -c restore-good-version
git revert THE_BAD_COMMIT_SHA
git push -u origin restore-good-version
~~~

Replace `THE_BAD_COMMIT_SHA` with the actual ID. If Git reports a conflict, stop and review the changes rather than forcing a resolution.

## 11. The four things to collect for a useful bug report

Share these, but **not** private assignments or account tokens:

1. The exact symptom: blank page, button click fails, or connection error.
2. Where: Chrome tab / installed Chrome app / phone / different browser profile.
3. A **red Console error** or browser network error code.
4. The last code change / commit, if known.

Example:

> “The regular Chrome tab loads TDL, but the installed Mac app is blank. Console says `ReferenceError: renderActivityBank is not defined` after reload. My tasks are still present under `tdl.tasks.v1`.”

That immediately points to a code initialization problem rather than the network or task data.

## 12. Escalation: if you're truly stuck

- Save every accessible backup first.
- Keep the exact failing browser profile and origin intact.
- Work from a new Git branch.
- Prefer inspecting the code, Console, Network panel, and service-worker state.
- Only consider uninstalling, clearing data, or resetting Chrome **after you have verified a recoverable backup and accepted the consequences**.

The safest troubleshooting habit is: **preserve evidence and data first; change one variable at a time.**
