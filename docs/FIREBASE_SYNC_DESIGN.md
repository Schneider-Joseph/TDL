# Firebase Cross-Device Sync — DESIGN ONLY, NOT IMPLEMENTED

**Status: planning and learning document.** As of October 2026, **nothing in TDL connects to Firebase**. No Google sign-in, Firestore database, SDK, credentials, or automatic task synchronization have been added. This guide is a blueprint for a future implementation that *you* can understand, review, and change.

**Goal:** A task changed on the MacBook appears on your PC and phone, while the app stays usable offline. **Safety requirement:** A first sign-in must never silently replace existing tasks.

If you're new to TDL, read [Start Here](START_HERE.md), [How TDL Works](HOW_TDL_WORKS.md), and [Data and Backups](DATA_AND_BACKUPS.md) before this document.

---

## Part 1 — What problem are we solving?

Today:

~~~text
MacBook TDL       Windows TDL       Phone TDL
    |                  |                |
localStorage A    localStorage B   localStorage C
(no shared database; task copies do not stay synchronized)
~~~

Proposed:

~~~text
MacBook browser          Windows browser           Phone browser
    |                         |                         |
Local offline cache      Local offline cache      Local offline cache
    |                         |                         |
    +-------------------------+-------------------------+
                              |
                     Firebase Auth (who are you?)
                              |
                    Cloud Firestore (your records)
                              |
                 Security Rules (who may access them?)
~~~

The cloud is **not** supposed to replace local usability; it adds a shared, authenticated copy and sync operations.

## Part 2 — Firebase words, without the marketing

| Term | Meaning in TDL |
| --- | --- |
| Firebase project | The Google/Firebase container you create and control |
| Firebase app registration | Connects the TDL website to *that* Firebase project |
| Firebase Authentication | Identifies which account is signed in |
| Google sign-in | Allows a Google account to be the sign-in provider |
| `uid` | Firebase's stable unique identifier for that signed-in account |
| Cloud Firestore | Online database containing that account's task/activity documents |
| Security Rules | Server-enforced permission checks on database reads/writes |
| Firebase Web SDK | JavaScript code that communicates with Firebase services |
| Offline persistence | Local cache and queued writes so supported browsers can work disconnected |
| Migration | Carefully transferring pre-existing browser-local tasks into the new system |
| Conflict | Two devices change the same item before knowing about each other's changes |
| Tombstone | A record showing that an item was deleted, so sync doesn't recreate it |

**Key idea:** Authentication is “who are you?” Authorization is “which data may you read or edit?” Sign-in alone does not secure Firestore. **Security Rules are essential.**

## Part 3 — Keep these data groups separate

The existing app stores:

- Tasks in `tdl.tasks.v1`.
- Activity bank in `tdl.activities.v1`.
- Focus history in `tdl.focusSessions.v1`.
- Preferences in `tdl.settings.v1`.
- Check-in timestamps in `tdl.overdueCheckins.v1`.
- Browser notification history in `tdl.notificationHistory.v1`.
- Whether the notification popup was answered in `tdl.notificationPrompt.v1`.

### Recommended first sync release

**Synchronize:** Tasks, including subtasks/recurrence/categories, plus optional activities.

**Keep local initially:** Focus history, default timer minutes, focus checks preference, browser notification permission, and reminder cooldowns. The last two are especially device-specific.

**Do not pretend this is a full account migration.** The user should see which fields sync and which remain local.

## Part 4 — Suggested Firestore structure

A *collection* is similar to a folder of records. A *document* is a JSON-like record identified by a key.

~~~text
users/
  {firebaseAuthUid}/
    tasks/
      {taskId}
      {taskId}
    activities/
      {activityId}
      {activityId}
    syncMetadata/
      schema
~~~

Examples of proposed documents:

~~~json
{
  "id": "task-abc123",
  "ownerUid": "firebase-user-uid",
  "title": "Complete Network Security lab",
  "category": "Homework",
  "priority": "high",
  "dueDate": "2026-10-20",
  "dueTime": "23:59",
  "completed": false,
  "notes": "",
  "subtasks": [],
  "repeat": "none",
  "revision": 1,
  "deleted": false,
  "createdAt": 1790000000000,
  "updatedAt": 1790000000000
}
~~~

This is an **illustrative proposed schema**. Real TDL records contain additional fields. The date numbers are placeholders. Before migrating, define an explicit schema for all existing attributes, including `assignmentUrl`, `repeatEnd`, `repeatAnchorDay`, and `seriesId`.

**Use one Firestore document per task, not a single massive array.** One-document-per-task makes targeted updates easier and avoids overwriting unrelated tasks every time one checkbox changes.

## Part 5 — The critical migration scenario

Imagine the following:

- MacBook: tasks A, B, C; A is completed.
- Windows: tasks A, D, E; A is unfinished and B doesn't exist.
- Firestore: empty, because this is your first sign-in.

**Wrong implementation:** Pick one device as “the truth,” upload its list, and automatically replace every other device's list. This can delete D/E or undo completion.

**Safe implementation:**

1. **Export and verify a backup on EACH device.**
2. Sign in on one device.
3. **Read** its local data and the cloud contents. Do not overwrite either yet.
4. Show a merge preview: “3 only on this device, 0 only in cloud, 0 conflicts.”
5. Confirm what will be uploaded.
6. Write records with the intended document IDs.
7. Wait for actual server confirmation (not just a local optimistic UI update).
8. Keep the original `tdl.tasks.v1` and exports untouched.
9. On the next device, repeat the comparison: local-only, cloud-only, same-ID matching, and conflicts.
10. For conflicting records, show local, cloud, and **Keep both** options.
11. Only after all devices have migrated successfully enable ongoing background-in-app synchronization.

### Identity, duplication and repeat tasks

- **Use stable IDs** from TDL's existing tasks when possible.
- A recurring series contains multiple *occurrences*, each with a unique ID and a related `seriesId`.
- Avoid merging unrelated items simply because their titles match.
- Be cautious when a copied backup exists on two devices: duplicate IDs can refer to the *same* historical task rather than a new task.
- If an ID is reused for different content, preserve both under distinct IDs and surface the conflict.

### Initial migration must be **idempotent**

*Idempotent* means running the same migration again does not create an additional copy of every task. Track imported IDs and make retry behavior explicit. A broken network connection must not turn 20 tasks into 40.

## Part 6 — How real-time sync could work

Proposed high-level sequence:

~~~text
USER CLICKS COMPLETE
        |
Update local task state immediately
        |
Queue versioned change for Firestore
        |
Show "Syncing / Pending changes"
        |
Server accepts and confirms write
        |
Show "Synced" for that change
        |
Other devices receive update through Firestore listener
        |
Merge it into their local visible state
~~~

A suggested dedicated future module:

~~~text
app/
  js/
    storage.js         Current local read/write and backups
    sync.js            Firebase read/listen/write/merge functions
    auth.js            Google sign-in and sign-out
    migrations.js      Old localStorage records to sync schema
    conflicts.js       Conflict detection and user choices
~~~

**These files do not exist today.** Create them during a reviewed refactor; don't paste Firebase code randomly into the current 66 KB HTML file.

A **live listener** (Firebase `onSnapshot`) can report changing documents. It can also show local optimistic changes. Be sure to check snapshot metadata and distinguish locally queued writes from backend-confirmed writes.

### Status text that should be honest

- **Local only:** Sign-in is off; data remains in this browser.
- **Preparing migration:** Scanning and comparing copies; no writes yet.
- **Syncing:** Writes pending or confirmation incomplete.
- **Synced:** Required writes have been acknowledged by the backend.
- **Offline — changes pending:** App works locally; cloud is not current.
- **Conflict needs attention:** Two versions require user choice.
- **Sync error:** A write was denied/failed; local data must be preserved.

Never show a green “Synced” label merely because `save()` wrote to localStorage.

## Part 7 — The hardest part: conflicts

Two devices can change the same task while disconnected:

~~~text
Monday, 9:00 AM
MacBook: task A marked completed
Windows: task A renamed and edited

Monday, 10:00 AM
Both reconnect
~~~

A naive *last write wins* strategy may erase one of those changes.

### Recommended future solution

- Keep `revision` or another per-document version.
- Track the last cloud revision seen when the local change started (its **base revision**).
- For **online** updates, use appropriate concurrency checks / transactions.
- For **offline** changes, queue operations and compare against the current cloud version on reconnect; transactions cannot be relied on while offline.
- If both sides edited a different field, consider a careful field-level merge after validating it.
- If they edited the same field, ask the user to choose **Keep local**, **Keep cloud**, or **Keep both copies**.
- Do not silently discard unacknowledged local changes.

**Be careful with timestamps.** Current TDL `updatedAt` uses `Date.now()` from the device clock, which can be wrong. A larger number is not guaranteed to mean the most recent meaningful edit. Server timestamps and revisions can help establish order, but neither alone resolves every intent conflict.

### Deleting tasks

A deletion needs special treatment. If device A deletes a task while device B is offline, simply removing the cloud document can cause device B to upload its old copy and accidentally bring it back.

A **tombstone**—for example `deleted: true` with a deletion revision—tells devices that the task was intentionally removed. Keep it long enough for offline devices to reconnect; define a retention policy and a recovery process.

## Part 8 — Security Rules are not optional

A user's Firestore records should be scoped to their own authenticated Firebase UID.

**Example showing the access-control idea (NOT a production ruleset):**

~~~js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/tasks/{taskId} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.ownerUid == uid
        && request.resource.data.id == taskId;
      allow delete: if false; // Example assumes tombstone updates.
    }

    match /users/{uid}/activities/{activityId} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.ownerUid == uid
        && request.resource.data.id == activityId;
      allow delete: if false;
    }
  }
}
~~~

**DO NOT deploy these example rules unchanged.** They omit comprehensive field type/size validation, update invariants, schema checks, and safe error handling. They are meant to show **who can access which path**.

The *production* version should also:

- Reject extra/unexpected fields if the schema demands it.
- Validate lengths/types, including task title and due-date formats.
- Constrain array sizes such as subtasks and limit document size.
- Prevent ownership and immutable identity from changing.
- Decide whether any other document paths exist and deny by default.
- Validate soft-delete changes and revisions.
- Test all allowed and denied operations.

### Test these cases in the Firebase Emulator

| Operation | Expected result |
| --- | --- |
| Signed-out client reads a task | DENY |
| Account A reads its own task | ALLOW |
| Account A reads Account B's task | DENY |
| Account A writes into B's path | DENY |
| Account A writes a correct task in A's path | ALLOW |
| Account A attempts to change owner UID | DENY |
| Oversized or malformed task document | DENY |
| Attempt to use undocumented collection | DENY |
| Deleted task comes back from stale offline copy | BLOCK / CONFLICT |
| User signs out with pending writes | Local work preserved; no cross-account leak |

**Do not rely on hiding API keys** to secure data. Firebase's web configuration identifies the project; authorization is enforced by Firebase Authentication and Security Rules. By contrast, service-account private keys, Admin SDK credentials, OAuth client secrets, and long-lived tokens are sensitive and must **never** go into a public repository.

## Part 9 — Step-by-step Firebase setup (for a future development branch)

**Do not do these steps as though they automatically install sync.** Creating a Firebase project is only the infrastructure setup; the app still needs code, tests, and migration.

1. Open **https://console.firebase.google.com/** and sign into the Google account that should own the Firebase project.
2. Choose **Create a project**. Give it a clear name, such as `tdl-dev`, to distinguish experiments from production.
3. Review the project settings and whether you need optional Analytics (TDL doesn't require Analytics for task sync).
4. **Register a Web app** under Project Overview. Firebase will show a web config object containing project identifiers; keep that config in the *planned* `auth.js`/configuration module once we build the integration.
5. Under **Build → Authentication**, choose **Get started** and enable the Google provider if that is the account method you select.
6. Find **Authentication → Settings → Authorized domains** and authorize the relevant *hostname*, e.g. `schneider-joseph.github.io`, for the GitHub Pages deployment. Also configure allowed development origins as needed. Use the hostname, not the `/TDL/app/` path.
7. Under **Build → Firestore Database**, create a database. Choose the region deliberately: region selection has latency/cost implications and may not be reversible for the existing database.
8. Start with **locked-down/production** rules, not open test rules. Store your reviewed `firestore.rules` in version control **only when you're ready**, and test with an emulator.
9. Review the current pricing/free quotas and establish a budget or usage alert appropriate to your account. Do not assume Firestore is unlimited or guaranteed free forever.
10. In a **separate Git branch**, create the sync modules. Test Firebase initialization **without reading or writing real personal tasks**.
11. Create test users/tasks and run the negative Security Rules tests above.
12. Build backup + merge preview before enabling task upload.
13. Test two browsers and a disconnected device with dummy tasks.
14. Roll out to your actual account only after a confirmed dry-run migration and retained backups.

**Choice of SDK:** The modular Firebase Web SDK works with npm + a bundler, which Firebase generally recommends. Firebase also documents a CDN alternative for smaller no-build apps. Choose one deliberately, pin versions, and document the build process if TDL moves away from its single-file approach. Don't mix random SDK versions in production.

**Google sign-in note:** `signInWithPopup` and `signInWithRedirect` behave differently on browsers and installed PWAs. Some browsers restrict third-party storage, affecting redirect flows. Test sign-in on the MacBook, Windows, and phone; do not assume a popup that works on Chrome desktop also works everywhere.

## Part 10 — How offline persistence fits in

Firestore's web SDK supports an explicit persistent local cache for supported browsers, for example with `persistentLocalCache` and a single/multiple-tab manager. It is **not identical** to TDL's current `localStorage`, and persistent offline caching is not automatically enabled just because Firestore is imported.

Important questions before activation:

- Is this a trusted, personal device?
- Can the browser actually use persistent storage?
- What happens if the user clears site data?
- What happens when the user signs out and another user signs in?
- What if two tabs are open?
- How long can an offline device be absent before its data conflicts with deletions?

**Security/privacy nuance:** Locally cached Firestore data can remain on the device after the session; sign-out isn't necessarily a full cache erasure. Do not enable persistent storage indiscriminately on shared/public computers.

## Part 11 — Testing and rollout gates

### Unit tests

- Existing `parseDate()` and recurrence generation.
- Converting old task objects into the new schema.
- ID matching and duplicate prevention.
- Field-level merge logic and conflict prompts.
- Tombstones, restoration, and pruning.
- Data validation before writing to Firestore.

### Integration tests

- Signed-in read/write with per-user Security Rules.
- Sign-out / sign-in as a different account.
- Two devices updating the same task while online.
- Two devices updating the same task while offline.
- One device deleting and the other editing an item.
- Interrupted migration halfway through.
- Importing the same old backup twice.
- Cache and startup behavior after deploying a new app version.

### Acceptance criteria (must all pass before production)

- [ ] Old tasks are still visible on the first device after signing in.
- [ ] Importing a second device's tasks does not erase the first device's unique tasks.
- [ ] Each account can access only its own Firestore paths.
- [ ] App continues to work offline using a supported local persistence strategy.
- [ ] “Synced” only appears after acknowledgement.
- [ ] The user can export a backup without signing in.
- [ ] Sign-out doesn't leak another account's data into the UI.
- [ ] A conflict never silently destroys the only surviving copy.
- [ ] The system has a documented rollback path.
- [ ] Source code and service worker continue working without Firebase available.

## Part 12 — Rollback plan

Because the app already runs without a cloud backend, the first release should be **opt-in behind a feature flag** and default to local-only until migrations are verified.

If sync fails:

1. Stop cloud writes (without clearing browser data).
2. Preserve the queued local changes and export backups.
3. Show the last confirmed sync state.
4. Allow the local-only app to keep functioning.
5. Inspect server-side documents and logs under a test account.
6. Fix, test, and retry idempotently.
7. Never “solve” a sync conflict by deleting all local tasks.

## Part 13 — Who controls what

The Firebase project should belong to **your** account or organization. You should control billing, project IAM permissions, authentication providers, Firestore rules, and deployment credentials.

You should be able to change the sync behavior by editing **your repository**. Future code should be documented with clear module boundaries and a plain-language explanation of every cloud write path.

**We do not need to choose a final authentication provider or deploy Firebase today.** The plan intentionally leaves production behavior unchanged until you are ready.

## Official learning references

These are from Firebase's own documentation. Review them again when you implement, because console menus and APIs evolve.

- [Add Firebase to your JavaScript project](https://firebase.google.com/docs/web/setup)
- [Alternative setup methods for web apps](https://firebase.google.com/docs/web/alt-setup)
- [Google sign-in with JavaScript](https://firebase.google.com/docs/auth/web/google-signin)
- [Auth authorized domains](https://support.google.com/firebase/answer/6400741)
- [Browser redirect sign-in caveats](https://firebase.google.com/docs/auth/web/redirect-best-practices)
- [Firestore offline access](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Getting started with Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Security Rules unit tests](https://firebase.google.com/docs/rules/unit-tests)
- [Local Emulator Suite](https://firebase.google.com/docs/emulator-suite/connect_firestore)
- [Firestore pricing and usage](https://firebase.google.com/docs/firestore/pricing)

**Remember:** The fact that this design exists in the repository does not mean any cloud access is enabled.
