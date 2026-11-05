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

## Decided

## Learned

## Size

<measured> against ~300 + ~1,300; what took the room.

## Review

| Finding | Severity | Verdict | Commit / open |
| ------- | -------- | ------- | ------------- |
