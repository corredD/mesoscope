# Mesoscope modern app: queue

Ludovic's items, in order, in Ludovic's words (what to see, how to check it). A lane takes the top item: the
coordinator writes its brief (`progress/<date>-<slug>.md`) and the spec it needs first (`_spec/`). Evaluation of where
each legacy feature stands: `_spec/parity.md`.

## Next

1. **Mol\* v6 spike.** Render one PDB in `web/` with the Prism viewer from `~/Developments/molstar` (not on npm):
   decide how `web/` consumes it (built packages linked, or the single-file `prism-viewer.js`). Check: a structure
   shows in a panel, build and e2e pass.
2. **Ingredient view on Mol\* v6.** The protein-in-focus viewer (Ingredient View/Options: chains, membrane and fiber
   orientation, beads/LOD, sprite) moves from Mol\* 5 to Prism. Spec: `_spec/ingredient-view.md`.
3. **Full-scene viewer on Mol\* v6.** Load a whole packed model (legacy `MS_LoadModel`, e.g. Sars-cov-2 mature) in the
   main 3D view. Spec: `_spec/scene-view.md`.
4. **Recipe links in the URL.** `?recipe=`, `?recipe_url=`, `?load_recipe=`, `?recipe_json=`, `?recipe_format=` load
   a recipe as in legacy, so shared links and the Skills (LLM) flow work. Spec: `_spec/recipe-model.md`.
5. **Deploy path.** `web/` reaches a beta subpath: Vite `base`, and either a committed build or a build step in the
   post-receive hook. Check: the beta URL opens the modern app.
6. **Remaining loaders and savers.** `.xlsx` and `.zip` import, Spreadsheet XL, Color mapping load/save, cellPAINT
   sprites zip, Setup Data Directory, the missing examples.
7. **Remaining panels and pages.** Object Properties; Help, FAQ, About, Contact, Settings. (Topology and UniProt
   mapping come from Mol\* v6 Prism with the Ingredient view, item 2: Ludovic, 2026-11-05.)
8. **Bundle size.** Mol\* and protvista load lazily; the main chunk shrinks from 4 MB.
9. **Recipe view follow-ups (left open by PR #49).** S1: root label and compartment titles are black on the dark
   background: Ludovic picks their colour. S2, S4, N2-N4, N6 and X1 (the context menu does not close on a press
   outside it): the Review table of `progress/2026-11-05-recipe-view-canvas.md`. Group by: the examples have almost
   no field with two values (HIV: `surface`; Influenza: none): offer fields every recipe has, or keep it as is
   (Ludovic to decide).
10. **Design follow-ups (left open by PR #48).** The ten proposals of `_spec/design/README.md §8` were merged
   without changes (Ludovic, 2026-11-05) and the open items of §9 stand. Nits: Exosome UniProt gap in §3.1, Esc
   ignores page and field, root inspector counts direct compartments only, selected-row accent edge, sequence band
   without UniProt, Interactions count double-counts, N1 logo dot accent, the coverage check is one-way and passes
   with 0 pages, MVS SceneSelector path not checked (`progress/2026-11-05-ui-design.md`, Review).
