# builder-mockup (2026-11-05)

Lane `builder-mockup`, worktree `~/Developments/mesoscope-lanes/builder-mockup`, branch `lane/builder-mockup` from
`origin/web-modernization` at `5077cf5`. No ports (static mockups). Queue item 11.

## Brief

**Goal.** The builder/painter mode in the design mockups (`web/design/mockups/`): painting and placing happen in
prism-me (the full-model view), Mesoscope keeps the recipe, and the two stay in sync.

**Decided (Ludovic, 2026-11-05).**
- Ingredient viewer: Mol\* v6 Prism. Full-model view: prism-me (`~/molstar-prism-me/apps/prism-me`).
- Painting and placing happen in prism-me, with modern physics rebuilt there (queue item 12). Legacy's
  `extras/gpuphysics/main_physics.js` (gp.js, three.js r113) is old, does not run properly and is not ported: read it
  only for *what* the builder did, not how. The mockup does not depend on the physics.
- This lane designs the sync with the recipe, in mockups and spec. No production code (`web/src` untouched).
- Topology and UniProt mapping come from Prism (design §9).

**Reads.**
- Legacy builder, for behaviour: `extras/gpuphysics/main_physics.js` (compartment metaball meshes
  `GP_createOneCompartmentMesh`, distribute by count `GP_GPUdistributes`, fibers `GP_walk_lattice`), the cellPAINT
  recipe and sprites export (`index.html:573-575`), and how `js/main.js` hands the recipe to it.
- prism-me, read-only (never edit `~/molstar-prism-me`): `apps/prism-me/_spec/README.md`, `features.md`, `ui.md`,
  `plans/2026-11-05-physics-eval.md` ("draw mode").
- Ours: `web/_spec/design/README.md` (the Focus D2, fixed regions D3, inspector D4, §6 tokens, §9), the existing
  mockups (`mock.js`, `mock.css`, `tokens.css`, `sample-data.js`, `shared-pages.js`, `check.mjs`), `web/_spec/parity.md`
  §5.

**Produces.**
1. A new section of `web/_spec/design/README.md`, "Build and paint", with the **sync contract** between the recipe and
   prism-me: recipe → scene (compartments as meshes, ingredients as a paint palette, counts/molarity as targets);
   scene → recipe (placed/painted counts against targets, new instances, fibers drawn as curves); the Focus shared
   both ways; what lives in which app; undo across both; conflicts (an ingredient edited after it was painted). Each
   rule cites legacy `file:line` or the prism-me spec it comes from. Renumber nothing that code or specs cite; add the
   section where it fits and update the coverage table (§7).
2. Two or three new mockup screens in the existing style, light and dark, HIV sample data: **Paint** (prism-me stage,
   palette from the recipe, brush, target vs placed counts), **Place** (one ingredient on a membrane or a fiber path),
   **Sync** (Recipe view or Table beside the stage, counts updating, the Focus mirrored). Linked from `index.html`,
   covered by `check.mjs`, screenshots regenerated.
3. Open questions for Ludovic and for prism-me in §8/§9 (e.g. who owns the counts; live sync or on save).
4. `parity.md` §5 builder row: point at the new section.

**Ludovic's check.** From the workstation: open `web/design/mockups/index.html` (and `?theme=dark`), walk the new
screens; read the sync contract and answer its open questions.

**Tests.** `node web/design/mockups/check.mjs` passes (all pages, both themes, no console errors, no network, coverage,
contrast). No `web/src` change, so the app checks are not required; run `npm run lint` only if a file it covers changes.

**Size.** No production lines. ~150-250 lines of spec, 2-3 screens (+ shared mock code as needed).

**Models.** Lane on Sonnet. The sync contract and the screen layouts are design: one Opus subagent (`model: "opus"`).
Mechanical steps (screenshots, checks) on Sonnet. The gate's reviewer and skeptic are Opus.

## Progress

**Built.** `web/_spec/design/README.md` §5.7 "Build and paint" (sync contract in 5.7.1-5.7.9, legacy builder behaviour,
who owns what, recipe -> scene, scene -> recipe, the Focus both ways, undo, conflicts, live vs on save), decisions D11-D15
in §8, open questions in §9, §7.3 rows, §10 rows. Mockups 10-paint, 11-place, 12-sync (prism-me stage mocked) with nine
`scene.*` commands and a Scene menu in the `mock.js` registry; Table gets Target / In the scene columns. `parity.md` §5
builder row points at §5.7. No `web/src` change.

**Decided.** D11 by Ludovic (2026-11-05: paint/place in prism-me, physics rebuilt there, not ported). D12-D15 are
proposals by the lane (sync key is the ingredient path; a placed count never overwrites the recipe count on its own; no
paint on compartments with geometry None; no silent change to painted work). Sections 5.7.5 and 5.7.7 are marked as
proposals. Screen 12 puts the stage above the Table, not beside it (Table unreadable at ~350 px).

**Learned.** HIV has no counts (all 0), so placed counts and two targets are mocked, said on screen. Legacy's metaball
gizmo was live behind a GUI toggle and wrote back into the recipe nodes (the first draft said never). Legacy target
order is molarity then count. Legacy `results` has two shapes. prism-me's plan path is `apps/prism-me/plans/...`.

**Size.** No production lines. Spec ~200 lines added (brief: 150-250); mock.js ~+250, 3 pages.

**Gate** (reviewer R1-R21, skeptic verdicts, N1-N3 new). Fixed: R1 f88d272, N1 38b5cb9, R3 7d5dcc8, R4 55c6911, R5 feec565,
R6/R21 569f70a, R7 27ca053, R8 3a7e880 + f6f0c5e, R9 4a2776c, R18 72753f7, R10-R12/R15 ae62b09, R14/N3 1647b0b (open
question). R5-R7 guarded by check.mjs probes (e6a0e5d). Refuted: R13, R17, key half of R7. Open: R16 (listbox ARIA),
R19 (inert controls, as in earlier mockups), R20 (indexOf per row, 26 items), N2 (palette colour vs outline swatch).
R2 (this file) done here.
