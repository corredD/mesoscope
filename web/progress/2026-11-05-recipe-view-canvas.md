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

The Recipe view as a canvas with legacy's physics: `view/simulation.ts` (all-node force simulation, forces, constraints,
nudges, cooling), `view/draw.ts` (one frame, legacy draw order), `view/hitTest.ts`, `view/layout.ts`, `colors.ts`,
`labels.ts`, `recipeView.ts` (d3-drag/zoom gestures, scene), a thin `RecipeCanvas.tsx` with the context menu, the
toolbar, the legacy oracle capture and fixtures, a perf guard (n and 4n with a quadratic control), unit tests per spec
row and e2e (gestures, Mpn frame budget in a production build). Spec rows in `recipe-view.md` §9 and `parity.md` §2 updated.

## Decided

- Ludovic: canvas, physics, the kept departures (`recipe-view.md` §10).
- Lane: the all-node simulation carries membrane projection and rigid compartment drag (§10.5).
- Lane (review): a resize below what draws (compartment < 5, leaf < 0) is ignored (§10.7); the menu is viewport-fixed.

## Learned

- A child's passive effect runs before the parent's: the canvas read the theme token before AppShell set `data-theme`;
  a MutationObserver on the attribute re-reads it.
- React's `onChange` on `<input type=color>` is the input event; commit on the native `change`, as legacy.
- d3-drag's `.subject` runs before `start`: guards belong there too.
- The dev build can't hold the Mpn frame rate; the e2e frame budget runs on a production build.

## Size

About 2,080 production lines in `src` (added) against ~1,300: the oracle-forced modules, the full draw path (legend,
popup, titles) and the context menu took more than briefed.

## Review

| Finding | Severity | Verdict | Commit / open |
| ------- | -------- | ------- | ------------- |
| M1 left press with no recipe throws, pans | should-fix (skeptic) | confirmed | 7855f78, 8394dd5 |
| M2 context menu offset by panel position | must-fix | confirmed | 079905a |
| M3 dark bg not applied on toggle | must-fix | confirmed | 261c11d |
| S1 titles and root label black on dark bg | should-fix | confirmed, spec gap | open: needs Ludovic's colour choice (§10.3) |
| S2 `selection.includes` per node per frame | nit (skeptic) | confirmed | open: s stays tiny, legacy does the same |
| S3 colour picker rebuilds on every input | should-fix | confirmed | 9f5ef2d |
| S4 Edit-Mode select loads viewers | nit (skeptic) | confirmed | open: row 62 wording / queue; base did the same |
| N1 Resize below r 5 stops the frame loop | should-fix (skeptic) | confirmed | 794af8f |
| N2 stale hover popup after merge | nit | plausible | open |
| N3 drawPopup allocates | nit | confirmed | open |
| N4 literal `#171a1f` duplicates the token | nit | confirmed | open |
| N5 dead SVG-era CSS | nit | confirmed | 98fedaa |
| N6 DPR read only on resize | nit | confirmed | open |
| X1 menu not dismissed by a press outside the canvas | nit | confirmed | open |
| B1 (Ludovic, testing PR #49) a nested compartment jumps on press and will not move | confirmed: HIV_serialized PackInner r 145 in PackOuter r 65, clamp limit 0, 106 px snap to the parent centre, pin reset there | 59a87a3 (test), 99b8625 (test, interior ingredient), 7690d38 (`clampInside` and the drag subject's `project` skip when it does not fit; §10.5, rows 58-59 say so) |
| B2 (Ludovic) "Node group by" has no effect | confirmed: legacy refused every built-in key and the examples have no custom columns; decision (Ludovic, 2026-11-05): group by real fields. Only HIV has a 2-valued field (`surface`), Influenza none; after the heat 7 of HIV's leaves outside their cluster become 3 in 248 ticks (the unscaled 0.01 pull stops at the cluster edge) | tests then the fix and §6.5/row 89 in the next two commits |
