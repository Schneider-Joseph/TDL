# Data and Backups — Keep Your Tasks Safe

**Read this before you change storage code, install on another device, troubleshoot a blank page, or work on Firebase.**

## 1. Your task data is not in GitHub

GitHub stores **source files** such as `app/index.html`. The TDL app currently stores **your own task data** in your browser with `localStorage`.

Those are two different things:

~~~text
GitHub:      "Here is the task manager's program."
Your Chrome: "Here are my actual homework tasks and notes."
~~~

Anyone viewing the public repository can see the source code. They cannot automatically see your saved tasks merely because they can see GitHub. Do not commit exported backups to the public repository.

## 2. Storage keys you can inspect

TDL currently uses these local storage keys:

| Key | What it contains | Included in ordinary TDL Export? |
| --- | --- | --- |
| `tdl.tasks.v1` | Tasks, subtasks, recurrence, due dates, notes, categories | **Yes** |
| `tdl.activities.v1` | Activity bank items | **Yes** |
| `tdl.focusSessions.v1` | Recorded focus sessions and checks | **No** |
| `tdl.settings.v1` | Focus checks on/off and default timer duration | **No** |
| `tdl.overdueCheckins.v1` | Per-task 90-minute check-in timestamps | **No** |
| `tdl.notificationHistory.v1` | Deadline notification history | **No** |
| `tdl.notificationPrompt.v1` | Whether notification prompt was answered | **No** |

A key ending in `v1` is an informal storage format version. **Do not rename it just for cosmetic reasons.** Changing the key without a migration makes the app look for data under a different name.

## 3. Ordinary Export: easiest backup

1. Open your usual TDL app in the browser/device where the tasks exist.
2. Click **Export** (or **Settings → Export task backup**).
3. Confirm your browser downloaded a file similar to `tdl-backup-2026-10-16.json`.
4. Store it somewhere safe *outside the browser's site storage*—for example, a private local folder or encrypted personal storage.
5. Open it with a text editor to confirm it contains your real tasks and, if present, activities.

The JSON is structured text and can contain private information from your tasks and notes. **Do not post it to a public GitHub issue or commit.**

### What it looks like

~~~json
{
  "app": "TDL",
  "version": 1,
  "exportedAt": "2026-10-16T12:00:00.000Z",
  "tasks": [
    {
      "id": "sample-task-id",
      "title": "Finish chapter notes",
      "category": "Homework",
      "completed": false
    }
  ],
  "activities": [
    {
      "id": "sample-activity-id",
      "title": "Practice Python"
    }
  ]
}
~~~

This is a *simplified example*; real tasks have additional fields. Don't delete unfamiliar fields when editing a backup.

## 4. Import is not the same as merge

**This is extremely important.** TDL's **Import** currently uses a replacement approach:

- After confirmation, incoming `tasks` **replace** the tasks currently stored in that browser.
- If the incoming backup includes an `activities` array, it also **replaces** the activity bank.
- If the backup does not include activities, existing activities remain unchanged.
- It does **not** compare individual tasks and merge duplicates.
- It does **not** restore your separate focus history and preferences.

### Safe transfer from MacBook to Windows

1. On the **MacBook**, Export. Confirm the file exists.
2. On the **Windows PC**, **export that PC's current tasks too**. If it already has work, that backup is essential.
3. Copy the MacBook JSON backup to the Windows PC using a private method.
4. Open TDL on Windows and click **Import**.
5. Read the replacement warning. Proceed only if you intend to replace that PC's current list.
6. Verify the tasks and activities afterward.

**Example of what not to do:** You have 30 MacBook tasks and 12 unique PC tasks. Importing the MacBook backup on the PC does **not** produce 42 tasks; it replaces the 12 PC tasks with the 30 from the MacBook. If you need a merge, use a carefully designed conversion tool or wait for the future migration workflow.

## 5. Optional: back up **every** TDL localStorage key

The built-in Export doesn't cover focus records or settings. For an **advanced, read-only full local snapshot**, you can save all `tdl.*` keys through Chrome DevTools.

**Before doing this:** Make an ordinary Export too. Only run scripts you understand, on the correct TDL origin. The snippet below *reads* storage and downloads a JSON file; it does **not** clear or overwrite keys.

1. Open the TDL page that contains your real data.
2. Open Chrome DevTools Console (Mac: Command + Option + J; Windows: Control + Shift + J).
3. Review this code first. Chrome may warn before allowing Console pastes.
4. Run it only if you understand that the resulting file contains your private local information.

~~~js
(() => {
  // Read ONLY the keys that belong to TDL.
  const names = Object.keys(localStorage).filter(key => key.startsWith("tdl."));
  const data = Object.fromEntries(
    names.map(key => [key, localStorage.getItem(key)])
  );

  // Write a separate downloadable file. This code never changes localStorage.
  const backup = {
    type: "TDL full localStorage snapshot",
    origin: location.origin,
    exportedAt: new Date().toISOString(),
    keys: data
  };

  const json = JSON.stringify(backup, null, 2);
  const url = URL.createObjectURL(
    new Blob([json], {type: "application/json"})
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "tdl-full-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
})();
~~~

**Important:** That is a *snapshot*, not a one-click full restore mechanism. To restore keys manually, you would need to carefully validate the file and compatible data formats. Do **not** blindly run a script that overwrites `localStorage`. Your built-in Import remains the supported path for restoring tasks and activities.

## 6. How to *inspect* data without changing it

In Chrome:

1. Open TDL.
2. Open DevTools (right-click → Inspect or use the keyboard shortcut).
3. Choose **Application → Storage → Local Storage**.
4. Select the TDL origin (such as `https://schneider-joseph.github.io`).
5. Read the keys above; do not delete or edit them casually.

For a read-only Console check:

~~~js
JSON.parse(localStorage.getItem("tdl.tasks.v1") || "[]").length
~~~

This reports how many task objects are stored, **including completed tasks**. A count of zero might mean you're on a different browser profile/origin, not necessarily that your old data was deleted.

## 7. What can make your data seem missing?

- You opened TDL in a different browser or browser profile.
- You opened a different origin (for instance `localhost` instead of GitHub Pages).
- You changed devices.
- Your browser's site data was cleared or the profile was reset.
- A privacy feature/storage error prevented local persistence.
- The app failed to start, so it never rendered the stored tasks.
- You imported a backup that replaced the previous tasks.

**A blank screen alone does not prove data was erased.** Avoid destructive “fixes” when the app fails to load.

## 8. A safe backup routine

- **Weekly:** Export from your primary device.
- **Before every significant code change:** Export again.
- **Before an import:** Export both source and destination devices.
- **Before enabling any cloud sync:** Export every device's tasks, plus an optional full local snapshot.
- **After a migration:** Keep the pre-migration backups untouched until you've verified the new system across devices.

Consider keeping at least two older backups in case the newest file was produced after an accidental deletion.

## 9. What will happen to localStorage during Firebase sync?

**Nothing automatically. Firebase is not connected today.** A future sync implementation must:

1. Detect and preserve existing local data.
2. Make backups before the initial sign-in migration.
3. Inspect cloud and device copies separately.
4. Preview conflicts instead of replacing either collection.
5. Upload the merged result safely and verify it.
6. Keep rollback and recovery paths.

See [Firebase Sync Design](FIREBASE_SYNC_DESIGN.md). The main reason for documenting all of this *before coding* is that cloud sync adds several ways a bad implementation can erase or duplicate tasks.

## 10. If tasks disappear right now

1. **Do not clear site data, sign out of a future account, uninstall, or reset anything yet.**
2. Try the *same browser, profile, origin, and installed app* you usually use.
3. Check the Console for JavaScript errors.
4. Check the `tdl.tasks.v1` key in DevTools without editing it.
5. Make a full local snapshot if the data is present.
6. If the data is genuinely missing, locate your last verified JSON export.
7. Use TDL's Import only after you understand that it replaces current tasks.

When in doubt, preserve the existing storage state first and diagnose second.
