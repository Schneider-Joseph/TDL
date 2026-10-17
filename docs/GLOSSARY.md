# TDL Glossary — Technical Words Translated into Plain English

You can refer to this whenever a guide uses a word you're not familiar with. The examples relate to the **actual TDL project** unless marked as future concepts.

## Web application basics

| Term | Plain-English meaning | TDL example |
| --- | --- | --- |
| **Website** | Pages/files your browser loads from an address | TDL at GitHub Pages |
| **Web app** | Website with interactive program behavior | Add Task saves and updates tasks |
| **Frontend** | Code running in the user's browser | `app/index.html` |
| **Backend** | Code running on a remote server that performs trusted operations | TDL has **no custom backend today** |
| **PWA** | Progressive Web App; a website with install-like behavior | Installed TDL Chrome app |
| **Service worker** | Browser-run script that can intercept network requests and cache files | `app/sw.js` |
| **App shell** | Minimum files needed to display an app | TDL HTML, icon, manifest |
| **Manifest** | Data describing install name, icon, launch URL, colors | `app/manifest.webmanifest` |
| **Origin** | Scheme + hostname + port identifying a web security boundary | `https://schneider-joseph.github.io` |
| **URL** | Address of a resource | `https://schneider-joseph.github.io/TDL/app/` |
| **HTTP / HTTPS** | Protocol used to exchange web requests/responses; HTTPS encrypts transit | GitHub Pages uses HTTPS |
| **DNS** | System that translates site names into addresses | Involved when Chrome finds GitHub Pages |
| **CORS** | Browser rules for reading responses from other website origins | Would matter for direct Blackboard fetches; no integration exists |
| **API** | Defined way for software systems to exchange requests/data | Future Firebase SDK calls Firestore APIs |
| **SDK** | Tools/libraries supplied by a platform | Firebase JavaScript SDK (future) |

## HTML, CSS and JavaScript

| Term | Plain-English meaning | TDL example |
| --- | --- | --- |
| **HTML** | Structure of buttons, forms, headings | `<button id="add">` |
| **CSS** | Instructions for colors, spacing, font, layout | `.btn { ... }` |
| **JavaScript** | Code that makes interactions actually work | Task-form submit handler |
| **DOM** | Browser's live representation of the HTML elements | `document.querySelector(...)` |
| **Selector** | Way to identify an HTML element | `#title`, `.btn` |
| **ID** | Unique name for an element or record | `id="category"`, task `id` |
| **Class** | Reusable styling/grouping label | `class="btn primary"` |
| **Variable** | Named container holding a value | `tasks` |
| **Array** | Ordered list of values | The `tasks` array |
| **Object** | Collection of named properties | A task with `title` and `dueDate` |
| **Function** | Named/reusable piece of logic | `save()`, `render()` |
| **Event** | Something happened | “User clicked Save” |
| **Event listener** | Function waiting for an event | `addEventListener("click", ...)` |
| **State** | Current information the program is using | Task completed or incomplete |
| **Render** | Draw/update the visible interface | `render()` |
| **Parse** | Convert text into a structured value | `JSON.parse(...)` |
| **Serialize** | Convert structured data into a storable/transmittable format | `JSON.stringify(...)` |
| **Exception/error** | The program could not complete an operation | `SyntaxError`, `ReferenceError` |
| **Milliseconds** | Thousandths of a second | 90 minutes = `90 * 60000` milliseconds |
| **Timestamp** | Numeric or structured representation of a moment in time | `Date.now()`, future server timestamp |

## Storage and data

| Term | Plain-English meaning | TDL example |
| --- | --- | --- |
| **localStorage** | Small browser storage tied to a website origin | `tdl.tasks.v1` |
| **Cache Storage** | Browser storage for cached network files | TDL's offline app shell |
| **IndexedDB** | Browser database often used for larger offline caches | Possible future Firestore persistent cache |
| **JSON** | Text format for structured data | TDL export backup file |
| **Backup** | Extra copy kept in case the original disappears | Export tasks before code changes |
| **Restore** | Put a backup back into use | TDL Import replaces tasks |
| **Merge** | Combine two sets of records without blindly replacing one | Needed for future two-device sync |
| **Schema** | Agreed shape/fields/types of stored data | Task fields such as `title`, `completed` |
| **Migration** | Safely change data to a newer format/location | Local tasks → future Firestore |
| **UID** | Unique identifier | Task ID, or future Firebase user UID |
| **Idempotent** | Safe to repeat without duplicating the effect | Importing same task twice should not duplicate it |
| **Revision** | Version number of an individual record | Proposed conflict-detection field |
| **Tombstone** | A marker recording intentional deletion | Proposed for future sync |
| **Conflict** | Two versions differ and neither should silently win | A task edited on two offline devices |
| **Source of truth** | Place treated as authoritative for a particular piece of data | Must be defined carefully during sync |
| **Optimistic update** | UI immediately displays a change before server confirmation | Possible future cloud sync behavior |

## Git and development workflow

| Term | Plain-English meaning | TDL example |
| --- | --- | --- |
| **Repository (repo)** | Version-controlled project folder | `Schneider-Joseph/TDL` |
| **Git** | Tool that records changes to files | Commits/branches in TDL |
| **GitHub** | Website hosting the repository | github.com |
| **GitHub Pages** | Static website hosting built from repository files | TDL's live URL |
| **Branch** | Separate line of development | Test changes without immediately deploying |
| **main** | Primary branch published by this TDL setup | Production source |
| **Commit** | Saved snapshot with a message | “Make Category editable” |
| **Diff** | Line-by-line comparison of changes | Review before merging |
| **Pull request / PR** | Proposed changes for review | A safe route from test branch to main |
| **Merge** | Bring branch changes together | Publish a tested feature |
| **Revert** | Make a new commit that undoes an earlier change | Safer response to broken deployment |
| **Clone** | Copy repository to your computer with Git history | `git clone ...` |
| **Push** | Upload your local commits to GitHub | `git push` |
| **Deploy** | Publish the current version to the live website | GitHub Pages publishes main |
| **Staging** | A separate testing environment before production | Future recommended preview site |
| **Production** | Version real people rely on | Your actual TDL task dashboard |
| **Regression** | Old behavior breaks after a change | Task edit stops working after new feature |
| **Smoke test** | Short checklist that major functions still work | Add, edit, refresh, export |

## Security, ownership and cloud (future concepts)

| Term | Plain-English meaning | TDL example |
| --- | --- | --- |
| **Authentication (AuthN)** | Proving who is signed in | Future Google sign-in |
| **Authorization (AuthZ)** | Deciding what that identity may access | Firestore rules: only your tasks |
| **OAuth** | Protocol family supporting delegated sign-in/permissions | Common in Google sign-in |
| **Firebase** | Google's app services platform | Proposed, not installed |
| **Firestore** | Firebase's cloud document database | Proposed task storage |
| **Security Rules** | Server-side authorization rules | Needed before real Firestore access |
| **Emulator** | Local development simulation of a service | Test Firestore permissions without production data |
| **Offline-first** | Essential operations work locally despite unavailable network | TDL's existing design |
| **Cloud sync** | Reconcile local and shared records across devices | Planned, not deployed |
| **API key** | Identifier/credential used for API access; sensitivity depends on type | Firebase web config differs from a service-account private key |
| **Secret** | Credential that must not be disclosed | Service account private key, password |
| **Open source** | Source distributed under a qualifying license granting reuse rights | TDL is **not** currently open-source licensed |
| **Proprietary** | Source whose owner does not grant broad reuse permission | TDL's all-rights-reserved notice |
| **Public repository** | Everyone can read the repository | TDL currently public |
| **Private repository** | Access requires permission | A future option if hosting is addressed |
| **CSP** | Content Security Policy, a browser security defense | May be added in a future hardening pass |
| **XSS** | Cross-site scripting—untrusted text interpreted as executable markup/script | Why TDL calls `esc()` when constructing task HTML |

## Learning tip

If you encounter an unfamiliar term, ask three questions:

1. **Is it a file, a piece of data, a function, or a network service?**
2. **Does it run in my browser, on my computer, on GitHub, or in Firebase?**
3. **If it breaks, will it affect my code, my saved data, or both?**

Those three questions are often enough to identify what part of TDL you need to inspect next.
