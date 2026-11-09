# TDL Studio UI — A Guide to Editing Your Own Design

**Status:** Visual redesign for October 31, 2026. This guide describes the design branch and, once merged, production. The redesign changes layout and styling, not task storage.

## First: the important files

| File | Job |
| --- | --- |
| [app/tdl-theme.css](../app/tdl-theme.css) | **Main visual customization file**: colors, sizes, cards, typography, desktop/mobile rules |
| [app/index.html](../app/index.html) | Main header HTML, labels, task dashboard and original task functionality |
| [app/tdl-extras-core.js](../app/tdl-extras-core.js) | Workspace navigation for Inbox, Week, Planner, Undo/Redo and More tools |
| [app/tdl-extras.css](../app/tdl-extras.css) | Base styles for the extra feature panels; the new theme overrides these where needed |
| [app/icon.svg](../app/icon.svg) | Icon of the installed app |
| [app/manifest.webmanifest](../app/manifest.webmanifest) | Installed app name and colors |
| [app/sw.js](../app/sw.js) | Offline app-shell cache, including the theme CSS |

For Git and local testing, also read [Editing TDL](EDITING_TDL.md). The full-page layouts live in [app/tdl-workspace.css](../app/tdl-workspace.css) and are explained in [Workspace Pages](WORKSPACE_PAGES.md).

## 1. Make it your own: change the palette

Open **app/tdl-theme.css** and find `:root`. These are editable CSS variables, also called design tokens.

~~~css
:root {
  --bg: #090f18;           /* Page background */
  --text: #f3f0f6;         /* Primary text */
  --muted: #9cabb9;        /* Secondary text */
  --green: #d0b5ec;        /* Old app's accent variable */
  --ui-surface: #121b27;  /* Panel surfaces */
  --ui-accent: #d0b5ec;   /* Main purple accent */
  --ui-accent-strong: #ae84d9;
  --ui-accent-ink: #1e122b;
  --ui-radius: 19px;       /* Main card roundness */
}
~~~

Change **one variable at a time** on a test branch, refresh, and check contrast. Some gradients deliberately have hard-coded colors; to recolor the entire theme, search for other lavender and violet hex codes.

### Example: change purple to blue

~~~css
--ui-accent: #a9d5ff;
--ui-accent-strong: #8dc3f5;
--ui-accent-ink: #102336;
~~~

You may also change `--green` because older controls reference it.

## 2. Find the part you want to adjust

Search for these selectors inside `app/tdl-theme.css`:

| Selector | What you will change |
| --- | --- |
| `.wrap` | Maximum page width and outer margins |
| `header`, `.brand`, `.logo` | App identity at the very top |
| `.header-actions` | Settings, Tools and New task buttons |
| `.tdlx-header`, `.tdlx-tabs` | Inbox, Week, Planner and Undo navigation |
| `.intro`, `.date` | Greeting and current date |
| `.time-tools`, `.time-card` | Clock and focus-timer cards |
| `.stat` | The four open/today/overdue/completed cards |
| `.layout`, `.side` | Sidebar width and filters |
| `.toolbar` | Task-list heading, search and sorting |
| `.task`, `.pill`, `.actions` | Task rows, metadata chips, Edit/Delete controls |
| `.activity-section` | Bored? Do This. panel |
| `.modal`, `.focus-dialog`, `.tdlx-dialog` | Add/Edit and History dialogs |
| **`.tdlx-page`, `.tdlx-calendar-*`, `.tdlx-inbox-*`** | **Full-page views** in `app/tdl-workspace.css` |
| **`.tdlc-*`** | **Connections task graph, linked nodes and badges** in `app/tdl-connections.css` |

**Example:** To fit more tasks on screen, find the last `.task` rule and reduce its padding from `17px 16px` to `13px 14px`. Then test a task with a long title, notes, subtasks and action buttons.

## 3. Change navigation without breaking functionality

In `app/index.html`, find `class="header-actions"`. The current controls are **Settings**, **Tools**, and **New task**.

The Tools dropdown is a built-in HTML `details` / `summary` element. It holds the original **Export tasks**, **Import tasks**, and **Paste assignment** buttons.

The second row is created in `app/tdl-extras-core.js`. Search for `bar.innerHTML=`. Main tabs are **Dashboard**, **Inbox**, **Week**, **Planner**, **Undo**, and **Redo**. The **More tools** dropdown contains **Task history**, **Full backup**, and **Full restore**.

**Never rename IDs** like `add`, `settingsOpen`, `export`, `importBtn`, `quickAdd`, `tdlx-undo`, or `tdlx-backup` just to change their labels or move them. JavaScript uses those exact IDs.

You can edit the *visible words* safely while preserving the IDs and the `data-tdlx-open` attributes.

The navigation icons are SVG paths in the `tdlxIconPaths` object. Replacing an SVG path changes the icon, not what happens when you click the button.

## 4. Make it fit your devices

At the end of the theme CSS are responsive rules:

- `@media (max-width: 1050px)` — narrower laptop/tablet.
- `@media (max-width: 780px)` — task sidebar becomes horizontally scrollable filters; clock/timer stack.
- `@media (max-width: 550px)` — phone layout with compact toolbars.
- `@media (max-width: 375px)` — small-phone action sizing.

The workspace navigation itself scrolls horizontally on smaller devices, so buttons should remain available without squeezing into microscopic text.

Do not remove the `prefers-reduced-motion` media query. It disables movement for people who prefer less animation.

## 5. Change hover effects and animation

The button hover style uses a tiny upward motion:

~~~css
.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
~~~

Change the value to `0` to disable the lift, or adjust border/color instead. On devices without a hover pointer, the theme already disables the hover lift.

For an app you use to study, prioritize **legibility and calm movement** over flashy animations.

## 6. The theme file is deliberately separate

The original inline app still includes legacy styles. The new stylesheet **loads after them**, so it can override visual rules without deleting task JavaScript or migrating browser data. This is intentional: a visual experiment should be reversible without risking assignments.

A future refactor can consolidate old CSS after full browser tests exist, but that's a different change from this visual release.

## 7. How to test an edit yourself

1. Open your normal TDL and use **Full backup**. Confirm the downloaded JSON exists.
2. Create a new Git branch rather than editing `main` immediately.
3. Run TDL locally with `python3 -m http.server 8000` from the repository root.
4. Open `http://localhost:8000/app/` in Chrome. It uses separate local browser storage from your live TDL.
5. Open DevTools Device Toolbar and check 375px, 550px, 768px, 1024px and 1440px layouts.
6. Use fake tasks to confirm **New task**, editing, categories, completion, Settings, Tools, Inbox, Week, Planner and backups work.
7. Run `node tests/smoke.mjs` for core behavior checks. Simulated tests do **not** replace real Chrome interaction tests.
8. Commit, review the diff and merge once satisfied.

## 8. How to roll back this design

If the layout doesn't work for you, revert the *Git code commits* introducing the new stylesheet, icon and header layout, then redeploy. Reverting CSS does **not** require deleting local task records or uninstalling the PWA.

**Do not clear site data to fix a visual problem.** Your tasks are currently stored locally on each browser/device.

## 9. What was intentionally not changed

This redesign does **not** add or modify Firebase, Blackboard, cloud synchronization, task schemas, recurring-task logic, or notification scheduling.

Only the appearance and grouping of existing controls changed. The TDL task data storage key is still `tdl.tasks.v1`.

**Recommended first customization:** change one color token, one card radius, or the max page width. These small experiments will teach you exactly how the interface is built.


## Purple accent restoration — November 2026

The original Studio UI layout has been restored. Purple/lavender replaces the green/mint accents in the dashboard, navigation, timer, dialogs, Week, Planner, Momentum, Connections and app icon. Task behavior and browser data are unchanged. The experimental appearance picker, kinetic hero, cursor bubble and chrome sculpture have been removed. App-shell v31 refreshes the restored assets without clearing saved tasks.

## Workspace sidebar — November 2026

Dashboard, Inbox, Week, Planner, Connections and Momentum now sit in a persistent left sidebar. Undo, Redo and More tools remain in that sidebar. The dashboard and purple palette retain their existing design.

On screens 900px wide or narrower, **Menu** opens navigation in a drawer on the left. The drawer contains keyboard focus, closes with Escape or a navigation choice, and returns focus to Menu when dismissed. The same navigation elements move between the desktop sidebar and drawer, so IDs, unread counts and actions stay synchronized.

`app/tdl-sidebar.css` controls positioning and responsive layout; `app/tdl-sidebar.js` handles the mobile drawer. Both are included in offline app-shell v32. Task data and storage keys are unchanged.

## Timer and category input controls — November 2026

`app/tdl-inputs.css` styles the segmented duration editor, Work until controls and editable category combobox. `app/tdl-input-utils.js` contains pure validation, local end-time calculation and category ordering. The inline timer logic keeps its existing focus-session/alarm integration. `app/tdl-categories.js` manages the keyboard/touch dropdown and stores learned usage separately as `tdl.categoryUsage.v1`; it does not migrate task records. App-shell v34 caches the new assets.

Category suggestions use existing task counts and remembered save counts, deduplicate suggestion names without rewriting task categories, and retain up to 100 remembered names. New tasks or changed categories increment usage; editing unrelated task fields does not. Default suggestions include Project alongside the original categories. Previously saved tasks retain their exact category names.
