# Parity with the legacy app

Each legacy feature → its modern state → where. States: **done** (works, tested), **partial**, **placeholder** (a menu
item that opens "Not yet available"), **missing** (no entry at all), **differs** (works, but not as legacy; see the
area spec). Seeded on 2026-11-04 from a review of `web/` at `ab6f09a`; each lane updates the rows it moves. "Done" here
means built and tested, not yet proven against a legacy oracle unless the row says so.

## 1. Recipes: load, save, model

| Legacy                                              | Modern                                                              | State                    |
| --------------------------------------------------- | ------------------------------------------------------------------- | ------------------------ |
| Load serialized / classic JSON                      | `domain/recipe/parseLegacyRecipe.ts`, `RecipeLoader.tsx`            | done                     |
| Load CSV with column mapping                        | `domain/files/parseCsvRecipe.ts`, `ColumnMappingDialog.tsx`         | done                     |
| Append (merge) a recipe                             | `domain/recipe/mergeRecipe.ts`, `MergeDialog.tsx`                   | done (legacy oracle)     |
| Load `.xlsx`, `.zip`                                | —                                                                   | missing (menu says so)   |
| Examples: HIV, Influenza, Blood plasma, Mpn, …      | `menuConfig.ts`, raw GitHub `master` URLs                           | done                     |
| Examples: MG auto/curated, Sars-cov-2, YASARA ×3    | —                                                                   | placeholder              |
| URL `?recipe=`, `?recipe_url=`, `?recipe_json=`, …  | —                                                                   | missing (blocks sharing) |
| Save JSON (cellPACK, cellPACK-gpu), CSV             | `RecipeSaver.tsx`, `serializeRecipe.ts`, `csv.ts`                   | done                     |
| Save Spreadsheet XL                                 | —                                                                   | missing                  |
| Save cellPAINT sprites `.zip`                       | —                                                                   | placeholder              |
| Color palette, Molarity/Count load and save         | `colorPalette.ts`, `recipeStore`                                    | done                     |
| Color mapping (Properties-Colors) load and save     | `colorMapping.ts` (logic only)                                      | placeholder              |
| Setup Data Directory (local PDB/geoms)              | —                                                                   | placeholder              |
| Fiber description lookup (`helper_getFiberIngredientDescription`) | —                                    | missing (by choice)      |

## 2. Recipe view (D3)

See [recipe-view.md](recipe-view.md) for the feature-by-feature divergence table. Summary: the modern view is an SVG
rewrite (`components/recipe/RecipeCanvas.tsx`) of a legacy 2D-canvas view (`js/main.js:2839-3110, 5565`); it has the
toolbar's controls but **differs** in 83 of 95 rows. It is being rebuilt on Dragology from the legacy spec
(`recipe-view.md §10`). Priority 1 in the queue.

## 3. Tables

| Legacy                                   | Modern                               | State   |
| ---------------------------------------- | ------------------------------------ | ------- |
| Recipe ingredient grid (SlickGrid)       | `RecipeTable.tsx` (native React)     | done    |
| Interaction table                        | `InteractionTable.tsx`               | done    |
| PDB / UniProt search tables              | `PdbSearchPanel.tsx`, `UniprotSearchPanel.tsx`, current provider APIs | done |
| Object Properties                        | —                                    | placeholder |

## 4. Ingredient view (protein in focus)

| Legacy (NGL)                                     | Modern (Mol\* 5.10; target Mol\* v6)                 | State   |
| ------------------------------------------------ | ---------------------------------------------------- | ------- |
| Load the selected ingredient's structure         | `IngredientViewer.tsx`, `structureSource.ts`         | done    |
| Chains, membrane orientation, fiber axis/offset  | `IngredientOptions.tsx`, `ingredientViewControls.ts` | done    |
| Beads / LOD building (k-means)                   | `domain/recipe/clustering.ts`                        | done    |
| Sprite capture / Illustrate round trip           | Mol\* image capture; no `cgi-bin/illustrator.py`     | differs |
| Sequence features (ProtVista)                    | `SequenceFeaturesPanel.tsx` (Nightingale)            | done    |
| Topology, UniProt mapping (PDB Component Library)| —                                                    | placeholder |

## 5. Scene view (whole model)

| Legacy (`js/molstar_wrapper.js`)            | Modern                                   | State   |
| ------------------------------------------- | ---------------------------------------- | ------- |
| `MS_LoadModel`: load a whole packed model    | —                                        | missing |
| Per-ingredient color, highlight sync         | —                                        | missing |
| Selected ingredient's structure in Mol\*     | `MolstarViewer.tsx`                      | partial |

## 6. Shell

| Legacy                                    | Modern                                         | State   |
| ----------------------------------------- | ---------------------------------------------- | ------- |
| Golden Layout panels, Layout Options      | dockview `Workspace.tsx`, `layoutStore.ts`     | done    |
| (new) workspace presets, light/dark theme | `presetStore.ts`, `themeStore.ts`              | done    |
| Skills: copy LLM skill, open SKILLS.md    | `SkillMenu.tsx`                                | done; its `?recipe_json=` link needs §1's URL loading |
| Help, FAQ, About, Contact, Settings pages | —                                              | missing |

## 7. Server (CGI)

| Legacy                                         | Modern                       | State   |
| ---------------------------------------------- | ---------------------------- | ------- |
| `/recipe_json` bridge, `/recipe_proxy`         | Vite proxy to legacy server  | partial |
| `cellpack_db_dev` DB browser                   | —                            | missing |
| `get_geom_dev` (MGLTools geometry)             | —                            | missing |
| `illustrator.py`, `hILL.py` (Illustrate)       | —                            | missing |

## 8. Deployment and build

| Legacy                              | Modern                                              | State   |
| ----------------------------------- | --------------------------------------------------- | ------- |
| post-receive checkout, no build     | `web/dist` gitignored, no Vite `base`               | missing |
| —                                   | one 4 MB JS chunk, 869 kB CSS                       | to fix  |
