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
