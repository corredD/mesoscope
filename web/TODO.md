# Mesoscope modern app: queue

Ludovic's items, in order, in Ludovic's words (what to see, how to check it). A lane takes the top item: the
coordinator writes its brief (`progress/<date>-<slug>.md`) and the spec it needs first (`_spec/`). Evaluation of where
each legacy feature stands: `_spec/parity.md`.

## Next

1. **Recipe view exactly as the original.** The legacy D3 Recipe view "was working really well": the modern one must
   look and behave the same. Check: load HIV and Influenza in both apps side by side; same layout, colors, labels,
   drag, zoom, click-to-select, Edit Mode, options panel. A 2D canvas with legacy's physics
   (`_spec/recipe-view.md §10`); proven by a legacy oracle capture.
2. **Mol\* v6 spike.** Render one PDB in `web/` with the Prism viewer from `~/Developments/molstar` (not on npm):
   decide how `web/` consumes it (built packages linked, or the single-file `prism-viewer.js`). Check: a structure
   shows in a panel, build and e2e pass.
3. **Ingredient view on Mol\* v6.** The protein-in-focus viewer (Ingredient View/Options: chains, membrane and fiber
   orientation, beads/LOD, sprite) moves from Mol\* 5 to Prism. Spec: `_spec/ingredient-view.md`.
4. **Full-scene viewer on Mol\* v6.** Load a whole packed model (legacy `MS_LoadModel`, e.g. Sars-cov-2 mature) in the
   main 3D view. Spec: `_spec/scene-view.md`.
5. **Recipe links in the URL.** `?recipe=`, `?recipe_url=`, `?load_recipe=`, `?recipe_json=`, `?recipe_format=` load
   a recipe as in legacy, so shared links and the Skills (LLM) flow work. Spec: `_spec/recipe-model.md`.
6. **Deploy path.** `web/` reaches a beta subpath: Vite `base`, and either a committed build or a build step in the
   post-receive hook. Check: the beta URL opens the modern app.
7. **Remaining loaders and savers.** `.xlsx` and `.zip` import, Spreadsheet XL, Color mapping load/save, cellPAINT
   sprites zip, Setup Data Directory, the missing examples.
8. **Remaining panels and pages.** Topology and UniProt mapping (PDB Component Library), Object Properties; Help,
   FAQ, About, Contact, Settings.
9. **Bundle size.** Mol\* and protvista load lazily; the main chunk shrinks from 4 MB.
