# Visual Planner — Implemented Feature and Design Specification

**Status: initial implementation committed October 31, 2026.** The working source is [app/tdl-planner.js](../../app/tdl-planner.js). Manual browser testing of dragging, touch input, keyboard navigation and full recovery remains necessary.

[Master plan](../NEXT_FOUR_FEATURES.md) · [User guide](../NEW_FEATURES_USER_GUIDE.md) · [Developer guide](../NEW_FEATURES_DEVELOPER_GUIDE.md)

## 1. Purpose

TDL is useful for knowing **what to do**. The Visual Planner answers **how the pieces of a bigger project connect**.

You create your own boards, nodes, and arrows rather than receiving an automatically generated plan. Each node can represent a step, question, prerequisite, or alternative path. Multiple labeled arrows may represent “Yes,” “No,” “Depends,” or “Requires.”

This is intentionally a **manual visual thinking workspace**. It doesn't automatically add or delete tasks and doesn't require cloud services.

## 2. What has been implemented

Click **⬡ Planner** in the toolbar:

- Create, select, rename, and delete independent boards.
- Add nodes with editable title and notes.
- Drag nodes to rearrange the diagram.
- Use keyboard arrow keys to nudge a focused node; hold Shift to move it farther.
- Click **Connect nodes**, then two nodes, to create a labeled directed arrow.
- Rename or remove connections through the connection list.
- Drag blank canvas space to pan the view.
- Zoom in/out and reset the viewport.
- Delete nodes; related arrows are removed without deleting any TDL task.
- Persist boards locally in `tdl.boards.v1`.
- Include board records in the **Full backup** snapshot.

Initial limits: 30 boards, 120 nodes per board, and 300 connections per board. They are conservative guards against unbounded local storage growth, not promises that the browser can always store the maximum number.

## 3. What is NOT implemented yet

- AI-generated nodes, plans, or auto-layout.
- Live links from nodes to tasks and automatic completion logic.
- A shared cloud planner, collaborative editing, or multi-device Firebase sync.
- Arbitrary images/file attachments on nodes.
- Separate, durable Undo for every board edit.
- Orthogonal auto-routed arrows and complex diagram styling.
- An unlimited-size infinite canvas.
- Verified touch-screen UX across all browsers.

Those features would require independent design, testing, backup and user approval.

## 4. Storage model: boards, nodes and edges

Example:

~~~json
[
  {
    "id": "board-1",
    "title": "Build a Robot",
    "createdAt": 1790000000000,
    "nodes": [
      {"id":"n1","title":"Choose motor","notes":"Check power draw","x":120,"y":130},
      {"id":"n2","title":"Test motor","notes":"Log observations","x":340,"y":160}
    ],
    "edges": [
      {"id":"e1","from":"n1","to":"n2","label":"Then"}
    ]
  }
]
~~~

This sample is for learning, not actual data. Every node has an **ID**. An edge stores only its own ID and the IDs of the two nodes it connects. Changing a node's title should not break its edges. Deleting a node removes edges referencing it.

Positions (`x` and `y`) are coordinates in the local board workspace, not geographic coordinates or browser pixels on the screen. The viewport applies pan and zoom on top of those saved coordinates.

## 5. How the code works

The board is drawn with ordinary HTML nodes inside a large positioned div and a separate SVG layer for arrows:

~~~text
Board data in localStorage
       |
Read board nodes + edges
       |
       +-- HTML boxes at (x,y)
       |
       +-- SVG lines between node IDs
       |
Pointer movement / keyboard changes positions
       |
Save updated board data
       |
Redraw diagram and arrow locations
~~~

When you drag a node, pointer distance is adjusted by the current zoom, so moving a box at 50% zoom doesn't move it twice as far in its saved coordinates.

**Important display limitation:** During drag, the box moves immediately but arrow lines are redrawn on release. A future smooth-drawing improvement could update arrow endpoints continuously.

### User text is data, not code

All node titles, notes and arrow labels must be escaped before inserted into HTML/SVG. Do not interpolate raw user text into executable HTML or JavaScript. Importing a board must never run code from its JSON fields.

## 6. Where to change it manually

[Open `app/tdl-planner.js`](../../app/tdl-planner.js), then find:

| Search | What it controls |
| --- | --- |
| `tdl.boards.v1` | Browser storage key |
| `function read()` | Input validation for saved boards/nodes/edges |
| `function save(next)` | Storage limits and saving |
| `function makeBoard()` | New board creation |
| `function deleteNode()` | Removes node and its attached edges |
| `function nodeForm(b)` | Node title/notes form |
| `function draw(c)` | The board UI and SVG arrows |
| `connectFrom` | Two-click arrow creation workflow |
| `onpointerdown` / `pointermove` | Drag and pan logic |
| `c.onkeydown` | Keyboard movement |
| `clamp(zoom+0.15,.4,1.8)` | Zoom-step and range |

For appearance, edit [app/tdl-extras.css](../../app/tdl-extras.css), particularly `.tdlx-node` and `.tdlx-board-viewport`.

**Keep geometry consistent:** The JavaScript declares `width=172,height=82` to determine approximate arrow endpoints. Changing node CSS dimensions without updating those values can make arrows attach oddly.

## 7. Tests to run in a browser

- [ ] Create two boards and switch between them without losing nodes.
- [ ] Add nodes, edit titles/notes, refresh, and verify persistence.
- [ ] Connect two nodes with an arrow and rename its label.
- [ ] Delete an arrow and confirm nodes remain.
- [ ] Delete a node and confirm attached arrows are removed.
- [ ] Drag nodes and verify positions remain after refresh.
- [ ] Pan and zoom; verify click/keyboard controls still work.
- [ ] Keyboard arrow keys move a focused node predictably.
- [ ] A phone can still edit/delete nodes, even if drag gestures need improvement.
- [ ] Very long user titles are displayed as text, not interpreted as HTML.
- [ ] A malformed board record does not erase `tdl.tasks.v1`.
- [ ] Full backup includes board data; restore works in an isolated profile.
- [ ] A deleted board asks for confirmation and leaves original TDL tasks intact.

## 8. Recovery and future development

A board is a separate data collection. If planner code fails, the existing task dashboard should still open. Revert the planner script rather than clearing local browser storage. Keep an off-device Full backup, particularly before restructuring the board schema.

The next improvements worth considering after real-device verification are smoother arrow updates while dragging, separate Undo for board changes, improved touch UX, and optional links to actual TDL tasks. None should automatically rearrange or generate a board without your control.
