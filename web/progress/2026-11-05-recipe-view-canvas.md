# Recipe view: re-port of the legacy canvas and physics (2026-11-05, lane `recipe-view-canvas`)

## Brief

- **Asked** (Ludovic's words): "The important first step is to get the Recipe / d3 view exactly as in the original. As
  this was working really well." After trying Dragology (PR #47, closed): "revert to our original idea. Physics
  based. Experience is smoother." **Check:** run legacy (`python3 localCGIServer.py`) and the modern app side by side;
  load HIV and Influenza in both; the layout, colours, membranes, labels, popup and legend look the same; dragging
  feels the same (neighbours pushed aside, the simulation alive while dragging); wheel zoom, middle-drag pan, click on
  an ingredient and inside a compartment, Ctrl multi-select, Edit-Mode drag-to-reparent, the context menu and every
  Recipe Options control (including the force sliders) behave the same. The kept departures (`recipe-view.md §10`):
  dark background in the dark theme, the simulation comes to rest after a drag, proteins stay on the membrane, marker
  lines in surface proteins. Mpn drags smoothly in a production build.
- **Spec:** `web/_spec/recipe-view.md` §0-§8 (the contract), §9 (the 95 rows to close), §10 (Ludovic's decisions:
  canvas, physics, the kept departures). The lane updates §9 (each row's modern column and status) and
  `_spec/parity.md` §2 in the same PR.
- **Reuse from `lane/recipe-view-port`** (PR #47, closed unmerged; the branch is kept). Its renderer-independent work
  comes over first, by cherry-pick or by copying files, each in its own commit citing the source commit:
  - the legacy oracle: `web/tests/oracle/` (capture script, `legacy_server.py`), `web/tests/fixtures/recipe-view-oracle/`
    (commit `8849e59`), and `tests/recipe-view-oracle.test.ts`;
  - the pure modules that follow legacy, not Dragology: `web/src/domain/recipe/view/layout.ts` (radii, pack),
    `colors.ts`, `labels.ts`, `hitTest.ts`, `src/components/recipe/spriteCache.ts`, the PDBe sprite id fix (`7f300d1`);
    and their tests (`recipe-view-geometry.test.ts` where it is not about Dragology drags);
  - the spec corrections the oracle forced (`recipe-view.md` §5 colour mode after load is `pdb`; §8.3 null vs missing
    `color`; §9 rows 5, 6, 8, 28 now Same) — rows only, not the Dragology rows;
  - the review fixes that are not about Dragology, as tests first then fixes: a context-menu press is not a canvas
    click (`2ee4426`/`61c6697`); the multi-selection never outlives its nodes (`e188614`/`e29d23b`); an append lays out
    again (`78348a3`/`52f9dbd`); a drag is not also a click and keeps Ctrl, a node is selected once
    (`75c31eb`/`d6ca447`); Edit-Mode drop target stops at the subject's parent (`fca400a`/`c6ca193`).
  - Not reused: `dragology`, `recipeDraggable.tsx`, `view/drag.ts`, `view/viewState.ts`, the spike.
  Read the branch's progress file (`web/progress/2026-11-04-recipe-view-port.md`, Learned) before designing: its perf
  lesson (a neighbour push that scanned every sibling cost 2× on Mpn) applies to the collision and projection code here.
- **Tests:**
  1. The reused oracle and module tests pass unchanged.
  2. New against the oracle: force parameters as configured (§3, rows 10-14; extend the capture if `updateForce`'s
     values are not in it yet), draw order of one frame through a recording mock `CanvasRenderingContext2D` (row 29),
     hit-testing (deepest disk wins, row 48), Edit-Mode drop (overlap test, root fallback, target grows by r/2,
     `surface` recomputed: rows 66-68), node CRUD (§7, rows 70-78).
  3. The §10 departures, each with its own test: HiDPI bitmap scale, dark background, cooling to rest, membrane
     projection and rigid compartment drag, marker lines, delete-compartment and link right-click don't throw.
  4. Perf guard (the first per-frame path, How we work): one tick plus one draw at n and 4n nodes, with a quadratic
     control; no allocation per tick or per pointer move in the hot path; a browser check that an Mpn drag holds the
     frame rate in a production preview build (the old lane learned the dev build can't).
  5. E2E (`E2E_PORT=5182`): load both examples; screenshots of the legacy and modern Recipe view at 1200×800 saved for
     Ludovic's side-by-side check; gestures (drag, Edit-Mode reparent, wheel, middle-drag, click, Ctrl-click, context
     menu).
  Existing tests that assert behaviour the spec replaces (`recipe-canvas.test.tsx`, `recipe-forces.test.ts`,
  `compute-recipe-layout.test.ts`, `color-modes.test.ts`, the Recipe View cases of `e2e/smoke.spec.ts`) are rewritten
  to the spec; each changed or removed assertion is listed in the PR body with the §9/§10 row it follows.
- **Touches:** `src/components/recipe/RecipeCanvas.tsx`, `RecipeCanvasToolbar.tsx`, `src/domain/recipe/`
  (`useRecipeSimulation.ts`, `recipeForces.ts`, `computeRecipeLayout.ts`, `colorModes.ts` replaced by the reused
  `view/` modules plus new `view/simulation.ts`, `view/draw.ts`), `src/state/recipeStore.ts`, `uiModeStore.ts`, the
  tests above. **Stays off:** the table, the viewers, the loaders, the shell (no other lane in flight). Selection side
  effects go through the store (`selectNode`); Mol\* hover highlight (row 60) and link hover/click into the viewers
  (rows 46-47) stop at the store and are listed as open for the viewer lanes.
- **Size:** ~1,300 production lines (tests apart), of which ~550 reused from `lane/recipe-view-port`.
- **Steps and models:**
  1. Bring over the reused work, run its tests (Sonnet).
  2. Design: the module split (pure simulation, draw and hit-test over one canvas, a thin React component), how
     §10.5's projection sits on legacy's all-node simulation, the per-frame allocation plan (Opus).
  3. Author the simulation and draw modules against the oracle, then the component and the toolbar (Opus).
  4. Rewrite the existing tests, run the checks (Sonnet).
  5. Screenshots of both apps for Ludovic (Sonnet).
  6. Gate: reviewer and skeptic (Opus), fixes with failing tests first.
- **Ports:** Vite `5182`, e2e `E2E_PORT=5182`, legacy `8092`.
- **Pins:** legacy reference `web-modernization` (legacy files unchanged from `master`); legacy d3 v4.13.0
  (`extras/d3.v4.min.js`); modern d3 v7 (numeric differences: row 94, §8.20).

## Built

## Decided

## Learned

## Size

<measured> against ~1,300; what took the room.

## Review

| Finding | Severity | Verdict | Commit / open |
| ------- | -------- | ------- | ------------- |
