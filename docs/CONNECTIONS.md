# Task Connections — Build a network of work inside TDL

**Introduced November 1, 2026.** Connections brings Notion-style task relationships to TDL's existing offline-first task manager, with real dependency checking and a visual task network.

**Open the workspace:** https://schneider-joseph.github.io/TDL/app/#connections

Use **Connections** in the top navigation, or open any task on the original Dashboard and select **↗ Links**.

There is **no Notion account, API key, cloud service, Firebase, Blackboard integration, or task migration**. This is TDL's own relationship engine.

## 1. The three kinds of links

A relationship connects two existing TDL tasks by their stable task IDs.

| Link | Meaning | Appears on both tasks? | Directional? |
| --- | --- | --- | --- |
| **Blocks / Blocked by** | A prerequisite must be completed before dependent work is ready | Yes: **Blocks** on the prerequisite and **Blocked by** on the dependent | Yes: A → B |
| **Related** | Tasks share context without one waiting for another | Yes: **Related to** on both | No |
| **Parent / Child** | A large task contains smaller child tasks | Yes: **Parent of** on parent and **Child of** on child | Yes: Parent → Child |

### Example

A cybersecurity project might look like:

- **Build Proxmox lab** blocks **Install vulnerable test app**.
- **Install vulnerable test app** blocks **Run security tests**.
- **Write incident report** is *related to* **Run security tests**.
- **Complete incident-response project** is the parent of **Build Proxmox lab**, **Run security tests**, and **Write incident report**.

You can choose the relationship in either direction. When editing **Run security tests**, choosing **This task is BLOCKED BY another** and selecting **Install vulnerable test app** creates the correct reverse relationship automatically.

Related links are symmetric: connecting A to B is the same relationship as B to A. Duplicates are rejected.

## 2. Creating your first relationship

1. Create at least two ordinary tasks on **Dashboard**.
2. Open **Connections**, or select **↗ Links** on a task card.
3. Pick the source task from the searchable list on the left.
4. Under **Connect this task**, choose your link type.
5. Choose the target task, then click **＋ Create connection**.
6. Both tasks now show their directional or symmetric relationship in **All relationships**.

**Navigation:** Click any connected task to jump to its detail, or use **Edit original task** to return to the original TDL editor without creating a duplicate.

You can search by task title or category. The task directory has **All, Blocked, Ready, Linked** filters.

## 3. Dependency map and readiness

The visual dependency map focuses on a selected task:

**Prerequisites → Selected task → Unlocks next**

The map shows up to five incoming and outgoing prerequisites at once. All connections remain visible in the detailed list, including additional edges, related tasks, parents, and children.

Tasks receive one of these computed states:

- **Ready:** unfinished with no unresolved blocking prerequisites.
- **Blocked:** unfinished with at least one incomplete *or missing* blocking prerequisite.
- **Completed:** the task was marked finished in TDL.

The Dashboard displays link counts, blocker counts and parent–child progress. A parent's completion percentage is based on completed immediate child tasks; **it does not automatically mark the parent complete**.

### Interaction with Momentum

Momentum checks the authoritative dependency graph when you:

- Commit a new task to today's 3–5 slots,
- Select **Do 2 minutes** for an old task, or
- Start a single-task focus block.

If a prerequisite remains unresolved, Momentum refuses to start the dependent and directs you to **Connections**. Its Backlog list also marks blocked tasks and provides a **View blockers** action.

Already-running timers aren't interrupted if you add a new dependency mid-session. Review the task graph before starting another block.

### Interaction with the original Dashboard

The ordinary Dashboard task list still lets you mark a blocked task complete if you explicitly confirm an override. This is important for correcting imported data or acknowledging real-world progress out of order. TDL warns which prerequisites are still unresolved and asks before applying the change. The overdue check-in uses the same confirmation behavior.

**Neither dependencies nor parent links automatically shift due dates or complete tasks.** The task owner retains control.

## 4. Parent/child rules

TDL allows nested hierarchies—parent, child, grandchild—but each child has **one direct parent**.

A parent can have many children, and parents can themselves be children of other tasks. Circular hierarchies are refused.

Example: **Homelab** → **Networking** → **Configure VLANs**.

These are *task relations*, separate from the original lightweight subtasks inside an individual TDL task. The original subtask checklist is unchanged.

## 5. Safeguards against broken graphs

The graph engine enforces:

- No link from a task to itself.
- No duplicate link for the same two tasks and relationship type.
- No circular **Blocks** dependencies: A → B → C → A is rejected.
- No circular **Parent** hierarchy.
- No second direct parent for a child until the previous parent link is removed.
- At most 750 saved connections initially, to limit browser-storage growth.

### What happens if you delete a linked task?

The task's links are **preserved as missing references**. Nothing else is deleted, and dependent tasks do **not** silently become ready.

When that original task ID returns through **Undo**, task recovery, or a properly restored full backup, its links become active again automatically. Otherwise you can explicitly remove each missing relationship using **Unlink**.

This is deliberate: a dependency disappearing from the task list is not proof that the prerequisite is complete.

Unlinking a connection never deletes either task. Deleting a task that has connections prompts a warning.

## 6. Planner nodes can reference a real task

Inside **Planner**, create or edit a node. You will now see **Linked TDL task (optional)**.

Choose an existing task to associate its stable ID with the node.

- The node displays the linked task's title and status.
- Use **↗ Open linked task** inside the node editor to jump into its Connections detail.
- Deleting a node doesn't delete its linked task.
- Deleting a task doesn't delete the Planner node; it shows a missing reference until that task is restored.

**Planner arrows remain purely diagrammatic.** They do **not** automatically become Blocks relationships. To enforce task prerequisites, create those in the Connections workspace.

## 7. Data safety and backups

All graph data is saved in **\`tdl.connections.v1\`**, separately from:

| Existing key | Purpose |
| --- | --- |
| \`tdl.tasks.v1\` | Original task data and due dates |
| \`tdl.boards.v1\` | Planner boards, nodes (including optional \`taskId\`), and visual arrows |
| \`tdl.timeBlocks.v1\` | Separate Calendar scheduled work blocks |
| \`tdl.momentum.v1\` | Daily commitments and Momentum focus history |
| \`tdl.taskHistory.v1\` | Original task changes / Undo and Redo |

Connections never automatically modify \`tdl.tasks.v1\`. The existing **Full backup** includes \`tdl.connections.v1\` because it captures all versioned TDL storage keys.

TDL is still **offline-first and per-browser**. Connections built on Mac won't automatically appear on another computer. Export a Full backup before testing restore on another browser profile.

**Do not clear site storage, erase localStorage, or uninstall TDL to troubleshoot the new UI.** Your actual tasks are stored there.

## 8. Developer guide

| Module | Responsibilities |
| --- | --- |
| \`app/tdl-connections.js\` | Validated graph persistence, inverse relations, orphan preservation, cycle detection, task network UI |
| \`app/tdl-connections.css\` | Explorer grid, graph, relationship editor, task status chips and Planner link badges |
| \`app/tdl-extras-core.js\` | Full-page \`#connections\` navigation |
| \`app/index.html\` | Per-task ↗ Links controls, computed badges, blocked-completion confirmation |
| \`app/tdl-planner.js\` | Optional \`node.taskId\` association to a real task; never mutates task data |
| \`app/tdl-momentum.js\` | Prevents committing and starting unmet dependent tasks |
| \`app/sw.js\` | Offline caching for new JS and CSS |

**Read-only API:**

\`\`\`js
window.TDLConnections.summary(taskId)
window.TDLConnections.blockers(taskId)
window.TDLConnections.isBlocked(taskId)
window.TDLConnections.children(taskId)
window.TDLConnections.parents(taskId)
window.TDLConnections.getEdges()
\`\`\`

**Actions:**

\`\`\`js
window.TDLConnections.add(prerequisiteId, dependentId, "blocks")
window.TDLConnections.add(taskA, taskB, "related")
window.TDLConnections.add(parentId, childId, "parent")
window.TDLConnections.openTask(taskId)
\`\`\`

Use the UI for normal edits. \`window.TDLConnections.remove(linkId)\` requires confirmation.

Do not modify the relation arrays manually unless you understand the integrity and backup implications. Link edits are **not yet integrated with task Undo**; each link can be explicitly removed, and a Full backup captures all link state.

## 9. Verification

From the repository root:

\`\`\`bash
node tests/connections.mjs
node tests/smoke.mjs
node tests/momentum.mjs
node tests/ui-contract.mjs
\`\`\`

The Connections graph test covers cycle detection, two-way relations, parent hierarchy constraints, missing prerequisites, restoring deleted task references, confirmed unlink and safe escaping of task titles.

The simulated smoke suite checks that existing Dashboard/Calendar/Planner/Momentum modules boot and that Planner nodes link to TDL tasks without altering the task database.

**Still check in actual browsers:** Create A → B → C, try to add C → A; complete A and verify B unlocks; create a Planner linked node; use the graph from a task card; confirm the dependency warning from the Dashboard checkbox; test narrow screens and installed PWA offline reopening. Simulated tests do not verify real visual layout, pointer events, OS notifications, background timers, or live backup restoration.
