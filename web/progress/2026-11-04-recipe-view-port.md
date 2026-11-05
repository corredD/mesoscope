# Recipe view: rebuilt on Dragology from the legacy spec (2026-11-04, lane `recipe-view-port`)

## Brief

- **Asked** (Ludovic's words): "The important first step is to get the Recipe / d3 view exactly as in the original. As
  this was working really well." Then: use Dragology, "combine the multi-circle points with the graph idea, so big
  circles can also go inside each other; I probably won't need the physics"; "use the two-kinds-of-tree approach when
  changing grouping, or even create our own behaviour, these are just examples." **Check:** run legacy (`python3
  localCGIServer.py`) and the modern app side by side; load HIV and Influenza in both; the layout, colours, membranes,
  labels, popup and legend look the same; drag an ingredient (stays inside its compartment, out of its neighbours), a
  surface protein (slides on the membrane), a compartment (its contents come along); in Edit Mode drag an ingredient or
  a compartment into another compartment (a live preview of where it lands, then it lands there); wheel zoom,
  middle-drag pan, click, click inside a compartment, Ctrl multi-select, the context menu and the Recipe Options
  controls behave as legacy. Changing the group-by property animates the nodes into their groups. Mpn
  drags smoothly.
- **Spec:** `web/_spec/recipe-view.md` §0-§7 (the contract), §9 (the 95 rows to close), §10 (Ludovic's decisions:
  Dragology and SVG, no live physics, layout as a pure function of the tree with grouping as a tree level, our own
  operators where the demos don't fit, the kept departures). The lane updates §9 (each row's modern column and
  status) and `_spec/parity.md` §2 in the same PR.
- **Step 0, the spike (go/no-go, half a day):** a throwaway `DraggableRenderer` over HIV and Mpn (parsed by the app's
  own parser; count the real nodes), with legacy's pack and radii, nested compartments (circles inside circles,
  `multi-circle-points` × `graph`), ingredients `d.vary` with containment and sibling non-overlap constraints, surface
  ingredients on the membrane, Edit-Mode reparenting over every candidate parent (`two-kinds-of-tree` style), a
  group-by switch animated between two layouts, and a first cut of a "push neighbours" modifier. Measure, at 1200×800 in Playwright's
  Chromium: time per pointer move during a drag (ingredient, compartment, Edit-Mode reparent) on HIV and Mpn; whether
  drags stay correct inside a zoomed and panned `<g>`; whether click, Ctrl-click, hover, wheel and context menu still
  fire beside `dragologyOnDrag`. **Go** if every drag on Mpn stays under 16 ms per move and the events work. **No-go**
  or a partial fit: stop and report to Ludovic with the numbers (the fallback is §10's previous canvas plan with a
  small constraint solver of our own). The numbers go in this file's Learned.
- **Tests:**
  1. Oracle fixtures (`tests/fixtures/recipe-view-oracle/`), captured from the running legacy app on
     `data/HIV_serialized.json` and `data/InfluenzaA.json`: per node (name, depth, parent, surface, `r`, fill and
     stroke colour per colour mode, label text and font size); the draw order of one frame (a recording wrapper around
     legacy's `CanvasRenderingContext2D`); the selection and table effects of click, Ctrl-click and click inside a
     compartment. Legacy runs on `8091`.
  2. Unit tests against the fixtures: radii (§1, rows 4-8), colour modes (§6, rows 81-90), labels (rows 34-38), the SVG
     layer order against legacy's draw order (row 29), hit-testing (deepest disk wins, row 48), node CRUD (§7, rows
     70-78).
  3. Layout as a pure function: `layout(tree, grouping, options)` against the oracle radii; group-by adds one level
     per compartment; switching grouping keeps every node and only moves it.
  4. Drag specs and our own operators as pure functions of the state (no DOM): containment, sibling non-overlap, on-membrane, rigid
     compartment move, Edit-Mode candidate parents and the drop (root fallback, target grows by r/2, `surface`
     recomputed: rows 66-68).
  5. The §10 departures, each with its own test: dark background, membrane constraints, marker lines,
     delete-compartment and link right-click don't throw.
  6. Perf guard (the first per-pointer-move path, How we work): one drag frame at n and 4n nodes, with a quadratic
     control; the spike's 16 ms bound on Mpn as a browser check.
  7. E2E (`E2E_PORT=5181`): load both examples, screenshots of the legacy and modern Recipe view at 1200×800 saved as
     test artifacts for Ludovic's side-by-side check; gestures (drag, Edit-Mode reparent, wheel, middle-drag, click,
     context menu).
  Existing tests that assert behaviour the spec replaces (`recipe-canvas.test.tsx`, `recipe-forces.test.ts`,
  `compute-recipe-layout.test.ts`, `color-modes.test.ts`, the Recipe View cases of `e2e/smoke.spec.ts`) are rewritten
  to the spec; each changed or removed assertion is listed in the PR body with the §9/§10 row it follows. Never
  deleted silently.
- **Touches:** `web/package.json` (adds `dragology`, pinned to 0.1.7), `src/components/recipe/RecipeCanvas.tsx`,
  `RecipeCanvasToolbar.tsx`, `src/domain/recipe/` (`useRecipeSimulation.ts`, `recipeForces.ts` removed (§10.2); `computeRecipeLayout.ts`, `colorModes.ts`; new pure modules for layout, drag specs and
  our operators, hit-test, draw order), `src/state/recipeStore.ts` and `uiModeStore.ts` (reparent, add, delete, recolour), the tests
  above. ~2,750 lines today in these files, read before sizing. **Stays off:** the table, the viewers, the loaders, the
  shell (no other lane in flight). Selection side effects go through the existing store (`selectNode`); Mol\* hover
  highlight (row 60) and link hover/click into the viewers (rows 46-47) stop at the store and are listed as open for
  the viewer lanes.
- **Size:** spike ~300 lines (thrown away or kept as the start); then ~1,300 production lines (tests apart), replacing
  most of the ~2,750 above.
- **Steps and models:**
  0. Spike and go/no-go (Opus); measurements run by Sonnet.
  1. Oracle capture: a Playwright script against legacy on `8091`, fixtures committed (Sonnet).
  2. Design: the state shape Dragology renders (the tree, grouping as a level), the module split, the drag specs and
     operators per node kind (Opus).
  3. Author the pure modules against the fixtures, then the draggable, the component and the toolbar (Opus).
  4. Rewrite the existing tests, run the checks (Sonnet).
  5. Screenshots of both apps for Ludovic (Sonnet).
  6. Gate: reviewer and skeptic (Opus), fixes with failing tests first.
- **Ports:** Vite `5181`, e2e `E2E_PORT=5181`, legacy `8091`.
- **Pins:** legacy reference `web-modernization` (legacy files unchanged from `master`); legacy d3 v4.13.0
  (`extras/d3.v4.min.js`); `dragology` 0.1.7 at `b145bdd` (`~/Developments/_refs/dragology`: `docs/AGENTS.md`, demos
  `multi-circle-points`, `point-on-circle-via-constraint`, `point-in-circle`, `graph`, `sprouting-tree`, `two-kinds-of-tree`; "Writing Your Own Operators").

## Built

- **Oracle** (`tests/oracle/`, `tests/fixtures/recipe-view-oracle/`): `legacy_server.py` serves `localCGIServer.py` on
  8091 without editing it; `capture-recipe-view.mjs` records from legacy, on HIV and Influenza, every node's radius per
  size mode, fill per colour mode, stroke, a frame's draw calls (plain and zoomed), the click/Ctrl-click/compartment
  click effects, and a screenshot. `tests/recipe-view-oracle.test.ts` checks our radii, fills, strokes, titles,
  ingredient labels and layer order against it.
- **Pure modules** (`domain/recipe/view/`): `layout.ts` (§1.7 radii, the layout as a function of the tree with
  group-by as a level, `reconcileView` for edits without repack), `colors.ts` (`ChangeCanvasColor`/`colorNode`/
  `Highlight`), `labels.ts`, `hitTest.ts`, `drag.ts` (containment, membrane, push neighbours, Edit-Mode target and
  drop), `viewState.ts`. `tests/recipe-view-geometry.test.ts` tests them, with the perf guard (n vs 4n, quadratic
  control) on the per-move push.
- **The view**: `recipeDraggable.tsx` (the Dragology draggable: layers, drag specs, `isTracking` fast path),
  `RecipeCanvas.tsx` (view state in step with the store, hover/click/menu by hit-test, d3-zoom for wheel, double-click
  and middle-drag, popup and root label overlay), `spriteCache.ts`, `RecipeCanvasToolbar.tsx` (legacy §5 options;
  Forces removed). Stores: legacy selection (`setSelection`/`addToSelection`), category colours, legend sizes, Edit
  Mode first-toggle flag, add-ingredient defaults, apply-colour on every node.
- Removed: `useRecipeSimulation.ts`, `recipeForces.ts`, `computeRecipeLayout.ts`, `colorModes.ts` and their tests
  (`recipe-forces`, `compute-recipe-layout`, `color-modes`), replaced by the tests above.

## Decided

- **Stay on npm `dragology@0.1.7`** and use only what it exports (Opus, after the advisor; the brief's pin "0.1.7 at
  b145bdd" is two different codes). Our "operators" are state derivations in render plus `onDrop`.
- **Edit-Mode reparent by legacy's deepest-overlap rule**, not `d.closest(...).withFloating()` over candidate states
  (Opus): `closest` compares gaps, and every compartment containing the pointer has gap 0, so it cannot pick the
  deepest; one free `varyFunc` plus the target derived in render is also one render per move instead of one per
  candidate. §10.1/§10.2 allow our own operators where the demos don't fit.
- **The dragged subtree is never a drop target** (Opus): legacy excludes only direct children, so a grandchild could
  become the parent, a cycle (§10.6, a reproduction that would break the tree).
- **Group-by eligibility as legacy** (keys outside `default_options`; Opus, following §9 row 89). With HIV and
  Influenza, which have no custom column, grouping changes nothing in either app; check it with a CSV recipe that has
  a custom column. Open question for Ludovic in the PR.
- **Colour mode after load is `pdb`**, as the oracle shows legacy doing (Opus); the spec said `default`. **A null
  colour shows the depth colour** in `default` mode, as the oracle shows on HIV (Opus); §8.3's black applies only to a
  missing key, which our parser never produces.
- **The depth ramp starts at hcl(148, 2, 100)** (Opus): d3 v4 gave white a hue where v7 gives none; fitted to the
  oracle within 2 per channel.
- **No compartment or empty-compartment pack radius**: a compartment without leaf children encloses its
  sub-compartments +25, an empty one is 150 (Opus; legacy's pack radius depends on the canvas).
- **Push neighbours, not sibling constraints** (Opus): a non-overlap constraint would block the drag in a packed
  compartment; legacy's collisions moved neighbours aside.

## Learned

### Step 0: the spike (GO)

Measured by `web/tests/spike/measure.mjs` (Playwright Chromium 149, 1200×800, headless, Apple-silicon Mac) on
`web/spike.html` (commit 64e1237). Per pointer move = Dragology's behaviour on one frame (timed inside the spec with
`changeFrame`/`changeResult`) + the React commit of the `DraggableRenderer` subtree (Profiler `actualDuration`); one
of each per rAF during a drag. Browser style/layout/paint are not in it; the rAF interval stayed at p50 8.3 ms
(headless runs at 120 Hz). HIV = 30 nodes, Mpn = 182 nodes (180 leaves, 35 on the membrane, one compartment).

Production build (React profiling build, the numbers that count), ms per move:

| Drag | HIV p50 / p95 / max | Mpn p50 / p95 / max |
| ---- | ------------------- | ------------------- |
| Interior ingredient (containment + push neighbours) | 1.0 / 1.5 / 2.8 | 2.6 / 3.0 / 5.8 |
| Surface ingredient (angle on the membrane + push) | 0.9 / 1.1 / 1.5 | 2.1 / 2.3 / 5.0 |
| Compartment (rigid subtree, containment + push) | 1.0 / 1.2 / 2.1 | 2.3 / 2.6 / 5.7 |
| Edit-Mode reparent (deepest-overlap target preview) | 1.0 / 1.2 / 1.9 | 2.1 / 2.4 / 5.1 |
| Interior ingredient at k=0.5 panned / k=3 panned | — | 1.9 / 2.2 / 5.3 and 1.9 / 2.1 / 4.8 |

Dev server (React development build), same drags on Mpn: p50 5.7-6.5, p95 10.9-12.4, max 16.3-26.1 (the max is one
frame per drag, the first or a GC). Every Mpn drag is under 16 ms per move in production at its worst frame, and at
p95 in development. Events beside `dragologyOnDrag`, all checked on Mpn: click selects the deepest node under the
pointer, Ctrl-click adds (2 selected), hover sets, wheel zooms (k 0.32 → 0.42), right-click opens the menu and does
not drag, middle-drag pans (view +60 px) and moves no node. The grab point stays under the pointer at k=0.5 and k=3
after a pan (max error 1.44 px, the circle's bounding-box rounding). A group-by switch animates through the
controlled `state` prop (26 commits, max 7.1 ms in production).

What made it fit, each measured:
- **`isTracking` fast path, required.** `d.vary` renders the whole draggable on every optimizer evaluation (about 22
  per frame). Returning only the view `<g>` and the dragged node when `isTracking` is true takes Mpn from p50 46-51
  ms per move (dev) to 6 ms. The tracking path also reads only the dragged node's parent chain, not every node.
- **No `.during` for derived previews.** In 0.1.7 `during` renders the state a second time per frame. The push of
  neighbours and the reparent target are instead derived inside the full render from a marker on the state
  (`pushFor`, `drag`) and applied in `.onDrop`: Mpn behaviour p50 6.6 → 4.0 ms (dev).
- **Containment as a clamped parametrization** (`varyFunc` whose state clamps the point into the disk) costs the same
  as a COBYLA `lessThan` constraint (dev p50 6.4 vs 6.6 ms on Mpn) and cannot start infeasible (HIV's capsid pair,
  §8.1). Surface ingredients vary one angle: always exactly on the membrane, no `equal` constraint.

### After the build

- Dev and production differ about 4× per drag frame: on Mpn the real view drops frames in the dev build (rAF p95
  41 ms) but not in production (p95 9.3 ms at 120 Hz). React's development element creation dominates the dev
  profile. The e2e frame budget therefore runs against `vite preview` (a second Playwright web server on E2E_PORT+10).
- The first real-view profile found `pushNeighbours` at ~5 ms a frame on Mpn: cells sized by the largest sibling
  held every sibling, so the "grid" was a full scan. Cells sized by the mean diameter and flat arrays fixed it.
- Dragology 0.1.7 blends children by index unless they carry `dragologyKey`; anything that may appear between two
  renders (a sprite that just loaded) needs a key, or a spring throws.
- Legacy's `anotherSubject` stops at the subject's own parent (main.js:4908-4910), which the spec had left out: the
  reviewer found it, not the oracle (the oracle has no Edit-Mode gesture).

### Dragology on npm is not the reference checkout

`dragology@0.1.7` on npm (published 2026-05-01) is not `b145bdd` (2026-11-03, same version string). npm 0.1.7 has no
`Operator`/`Modifier`/`modifier`/`renderStateReadOnly` exports, no component elements, and its `DragResult.preview`
is eager. Its `AGENTS.md` stops at Gotchas. It does have `varyFunc`, `during`, `onDrop`, `changeFrame`,
`changeResult`, `custom`, `isTracking` and `dragThreshold`. Our "operators" (push neighbours, Edit-Mode reparent) are
therefore written as derivations of the state in render plus `onDrop`, which 0.1.7 supports; nothing the spec needs is
missing. Also: Dragology hoists every `id`'d element to a flat layer, so a DOM `onClick` on an ancestor `<g>` never
sees clicks on nodes; the click, hover and context menu are handled on the wrapper with legacy's hit-test, and a no-op
`onClick` on the root `<g>` only turns on the 2 px click-versus-drag threshold. Dragology's injected `onPointerDown`
ignores the button, so a capture-phase listener on the wrapper stops non-left presses.

## Size

Spike ~420 lines (thrown away after the go). Production: +1,677 / −2,161 in `web/src` (the view's own modules
~1,670 lines with their doc comments) against the brief's ~1,300, so ~370 over; tests +1,344 / −838 (fixtures apart).
What took the room: the colour port (`ChangeCanvasColor` and `colorNode` mode by mode, ~200), the screen overlays
(popup, root label) and the context menu with resize and category colours (~150), and the state sync with the store
(layout vs reconcile vs append, selection pruning).

## Review

Reviewer (Opus, read-only) on 961eddd: 4 must-fix, 8 should-fix, 6 nits. Skeptic: 17 confirmed (one in part), 0
refuted, plus one new nit; severities as the skeptic set them.

| # | Finding | Severity | Verdict | Commit / open |
| - | ------- | -------- | ------- | ------------- |
| 1 | A sprite loading mid-spring throws "Cannot lerp ... image and g" | must-fix | confirmed | be04961 test, 26353e0 fix |
| 2 | Edit-Mode target ignores legacy's stop at the subject's parent | should-fix | confirmed | fca400a test, c6ca193 fix + spec |
| 3 | Multi-selection keeps deleted nodes: dangling link | should-fix | confirmed | e188614 test, e29d23b fix |
| 4 | A context-menu press also clicks the node under it | must-fix | confirmed | 2ee4426 test, 61c6697 fix |
| 5 | Append stacks merged nodes at the centre | should-fix | confirmed | 78348a3 test, 52f9dbd fix |
| 6 | A drop drops Ctrl; a drag back to start also clicks | should-fix | confirmed / plausible | 75c31eb test, d6ca447 fix |
| 7 | Hover hit-test allocates positions per move | nit | confirmed | open (queue) |
| 8 | Two small quadratics in `layoutRecipe` | nit | confirmed | open (queue; d3 dominates at 8000 leaves) |
| 9 | "Scale Radius by" lays out again on every slider tick | should-fix | confirmed | open: §10.2 decides re-layout; commit-on-release is for Ludovic |
| 10 | Perf e2e passes uniformly slow frames, never checks the move | should-fix | confirmed | 6b79fc6 |
| 11 | Oracle gestures, markers, link menu untested; a smoke test deleted | should-fix | confirmed | 6b79fc6 |
| 12 | §10.1's wording vs the lane's Decided | should-fix (doc) | confirmed | 341f2fe (a note for Ludovic) |
| n1 | Ctrl-click selects a node twice | nit (skeptic) | confirmed | 75c31eb / d6ca447 |
| n2 | metaKey counted as Ctrl; hoveredLink not cleared on leave; a link click keeps `selectedNode`; Resize ≤ 0; per-frame typed arrays in the push | nits | confirmed | open (queue) |
