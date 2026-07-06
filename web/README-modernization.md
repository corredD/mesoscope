# Mesoscope modernization (`web/`)

This directory is the Vite + React + TypeScript rewrite target for Mesoscope,
built alongside the legacy static app (repo root: `index.html`, `js/`,
`data/`, `cgi-bin/`, `localCGIServer.py`). It does not modify, move, or
depend on a build step for any legacy file.

Full context — audit, wrap-vs-migrate risk map, phased checklist, and the
confirmed URL/coexistence strategy — lives in the migration plan:
`~/.claude/plans/snoopy-snuggling-teacup.md`. This README covers day-to-day
commands only.

## Why a separate app, not an in-place rewrite

The legacy app has no build step and ~33k lines of globally-shared JS state
(`js/main.js` alone is 6100 lines). Rewriting it in place risks breaking
production mid-migration. Instead this is a **strangler-fig migration**:
the new app grows here, feature by feature, while the legacy app keeps
running unchanged — including on the production root path `/` — until an
explicit, separately-approved cutover once feature parity is verified.

## Running things

From `web/`:

```bash
npm run dev          # modern app only, Vite dev server (default :5173)
npm run dev:legacy   # legacy app only, runs `python3 ../localCGIServer.py` (:8080)
npm run dev:all      # both at once (concurrently), for side-by-side testing
```

The Vite dev server proxies `/recipe_json`, `/recipe_proxy`, and `/data/*`
to `http://localhost:8080` (see `vite.config.ts`), so the modern app can load
the same example recipes and use the same recipe-bridge/proxy endpoints as
the legacy app without a second backend. This means `npm run dev:legacy`
must be running for those proxied routes to work in the modern app; `npm run
dev:all` handles that automatically.

```bash
npm run build        # typecheck + production build to web/dist/
npm run preview       # serve the production build locally
npm run lint          # oxlint
npm run typecheck     # tsc project-reference build, no emit
npm run test          # Vitest (unit/component)
npm run test:watch    # Vitest watch mode
npm run test:e2e      # Playwright (starts the dev server itself)
```

## Directory map (current + planned)

```
web/
  src/
    app/                App.tsx (root component; routes/providers land here as needed)
    components/
      layout/           [done] AppShell.tsx, MenuBar.tsx (menuConfig.ts), Workspace.tsx, Panel.tsx,
                         TabbedPanel.tsx, Dialog.tsx — see "Phase 3" below for what's structural
                         vs. real
      recipe/           [partial] RecipeLoader.tsx, RecipeSaver.tsx (Load/Save wiring), RecipeTable.tsx
                         (native React ingredient table, NOT a SlickGrid wrap), ColumnMappingDialog.tsx
                         (CSV load), MergeDialog.tsx (JSON merge-on-append), RecipeCanvas.tsx (native
                         d3.hierarchy/d3.pack circle-packing view, NOT a wrap of update_graph) — see
                         "Phase 4" below
      pdb/              [partial] PdbSearchPanel.tsx/UniprotSearchPanel.tsx (native React result tables,
                         NOT grid_pdb/grid_uniprot wraps), MolstarViewer.tsx (modern molstar npm package,
                         NOT extras/molstar/ wrap — "Mol-*" tab, reserved for a later full-model-loading
                         phase), IngredientViewer.tsx/IngredientOptions.tsx (a SECOND, independent Mol-star
                         instance replacing NGL entirely for "Ingredient View"/"Ingredient Options" — see
                         "Phase 4" below; NglViewer.tsx and the `ngl` npm dependency removed);
                         ProtVista/PDB Component Library panels not started
      skills/           [done] SkillMenu.tsx (Skills > Copy LLM Recipe Skill / Open SKILLS.md)
    state/              [done] layoutStore.ts, recipeStore.ts (Zustand) — graph/format/error/loading +
                         loadEmpty/loadFromJson/loadFromUrl/applyColorPalette/applyMolarityCount/
                         updateIngredient/deleteIngredient/mergeGraph/selectedNode/selectNode/
                         applyPdbPick/patchSelectedIngredient; ingredientViewerStore.ts (plugin/chains/
                         structure/structureRef — shared handle between IngredientView/IngredientOptions);
                         uiStore lands when a later Phase 4 item needs it
    domain/
      recipe/           [done] types.ts, parseLegacyRecipe.ts, serializeRecipe.ts, validateRecipe.ts,
                         mergeRecipe.ts (JSON merge-on-append, ported + empirically verified against
                         the running legacy app — see "Phase 4" below), clustering.ts (k-means/bounding-
                         sphere LOD construction, pure — no Mol-star dependency)
      colors/           [done] colorPalette.ts (Load/Save > Color palette),
                         colorMapping.ts (import/export logic done; no menu wiring — see "Phase 4" below)
      files/            [done] csv.ts (Save > Spreadsheet CSV), loadFile.ts (FileReader wrapper),
                         saveFile.ts (Blob download), columnMapping.ts (allfield/GuessColumn port),
                         parseCsvRecipe.ts (CSV -> RecipeGraph, plain CSV only), clipboard.ts
                         (copyTextToClipboard + DOM fallback); zipExport.ts not started (cellPAINT
                         sprites zip); XLSX parsing not started (needs a dependency)
      pdb/              [done] pdbSearch.ts (PDB/UniProt search against current, not legacy's dead,
                         provider APIs — see "Phase 4" below), structureSource.ts
                         (resolveStructureSource: extension -> cellPACK_data repo file, no
                         extension -> RCSB id — used by both viewers), molstarCustomShapes.ts (generic
                         custom sphere/cylinder mesh injection — LOD beads + orientation gizmos),
                         molstarStructureUtil.ts (listChains/getAtomPositions), ingredientViewControls.ts
                         (chain-filtered representation, gizmo build/clear, LOD render, sprite capture)
      skills/           [done] skillsCopyText.ts (getMesoscopeBaseUrl/buildRecipeSkillsCopyText/
                         the safety-disclaimer text, ported verbatim from js/main.js)
      legacy/           (Phase 2+: legacyAdapters — URL parsing ported from legacy main.js;
                         legacyGlobals — typed seam to still-global legacy functions during Wrap)
    data/               (Phase 4: examples.ts — metadata only, fetches real files from ../../data/)
  tests/
    smoke.test.tsx           Vitest: AppShell menu + workspace arrangement + Layout Options toggles +
                             Empty Recipe (real action) + Save-with-no-recipe error dialog
    layout-store.test.ts     Vitest: layoutStore toggle behavior
    recipe-store.test.ts     Vitest: loadEmpty/loadFromJson/loadFromUrl/applyColorPalette/
                             applyMolarityCount, incl. all 7 "Load > From Examples" fixture files
    recipe-saver.test.ts     Vitest: each RecipeSaver action produces the right filename/content,
                             DOM download calls mocked via vi.spyOn(saveFile, ...)
    recipe-table.test.tsx    Vitest/RTL: RecipeTable renders/edits/deletes rows through recipeStore
    recipe-canvas.test.tsx   Vitest/RTL: RecipeCanvas empty state, one circle per graph node,
                             click-to-select and click-background-to-deselect via recipeStore
    parse-csv-recipe.test.ts Vitest: GuessColumn against documented keyword lists, CSV round trip oracle
                             (export HIV_serialized.json to CSV, reimport, compare per-ingredient fields),
                             synthetic ParseBU branch coverage
    recipe-loader-csv.test.tsx Vitest/RTL: RecipeLoader opens ColumnMappingDialog for a .csv file,
                             confirm loads into recipeStore, cancel discards without touching it
    merge-recipe.test.ts     Vitest: 3 legacy-captured oracle scenarios (fixtures/merge-oracle/, captured
                             by running the real legacy app against data/Mpn_1.0_2.json) + synthetic
                             coverage for createWhenMerge/field-flag/reparenting/link-merge branches
    recipe-loader-merge.test.tsx Vitest/RTL: RecipeLoader.mergeFromUrl opens MergeDialog and merges on
                             confirm; pickMergeFile rejects .csv/.xlsx/.zip
    skill-menu.test.tsx      Vitest/RTL: SkillMenu's disclaimer-decline short-circuits both actions;
                             copySkill fetches+copies+alerts on success, alerts (no copy) on fetch failure
    pdb-search.test.ts       Vitest: RCSB/UniProt response-mapping against real captured response shapes,
                             204-as-empty-list handling
    pdb-search-panel.test.tsx Vitest/RTL: PdbSearchPanel/UniprotSearchPanel Apply is gated on
                             recipeStore.selectedNode and writes the pick back onto it
    structure-source.test.ts Vitest: resolveStructureSource extension detection (.pdb/.cif/.mrc -> repo
                             file, no extension -> RCSB id), incl. an oracle count against the real HIV
                             fixture (8 of 26 ingredients resolve as ids, 18 as repo files)
    clustering.test.ts       Vitest: kmeans/boundingSphere (empty input, k-clamping, cluster separation,
                             radius covers every assigned point, determinism given a seed, zero-radius
                             floor) — the only Ingredient Options piece reachable from jsdom; the rest
                             (chain filtering, gizmos, LOD render, sprite capture) is browser-verified only
    recipe-parsing.test.ts   Vitest: parseLegacyRecipe against data/HIV_serialized.json + data/InfluenzaA.json
    export.test.ts           Vitest: serializeRecipe round trips + oracle checks against those fixtures,
                             plus synthetic-data cases for partner links and classic cytoplasme ingredients
    color-mapping.test.ts, validate-recipe.test.ts
    e2e/smoke.spec.ts        Playwright: menu bar, workspace arrangement, Layout Options toggle
```

Folders for later phases are created when they get real content, not as
empty placeholders — see the migration plan's phase checklist for what lands
where and when.

### Phase 3 scope: structural, not functional

Every panel/tab in `Workspace.tsx` is a **placeholder** — plain text saying
what Phase 4 will mount there. Nothing here loads NGL, Mol-star, SlickGrid,
ProtVista, or the PDB Component Library; that requires bridging the legacy
`js/*.js` globals in through `domain/legacy/legacyGlobals.ts` (not built
yet), which the plan slots into Phase 4 (items 3 "Tables and ingredient
editing" and 5 "PDB/search panels"). Likewise, Load/Save/Skills menu items
open a "not yet available" dialog instead of doing anything — only the four
Layout Options toggles are real, because that's the one piece of Phase 3
that had to behave (not just render) for the panel arrangement to be
verifiable at all.

The panel **arrangement** (which panels are grouped into which Golden-Layout
"stack", and how the two rows are composed) is verified against
`js/layout_mg.js`'s `config_light` — the only layout config actually
instantiated (`config` is dead code, never passed to `new GoldenLayout(...)`).
One deliberate divergence: the legacy Layout Options menu items' hardcoded
HTML label always reads "Show X" on first load (index.html), even though
the panels start visible — the toggle function only corrects the label after
the first click. That's a pre-existing legacy label bug. This port's menu
label is derived from `layoutStore` state from the very first render, so it
reads "Hide X" while the panel is visible, consistently, matching the
*behavior* the legacy toggle function converges to rather than the stale
initial string.

### Phase 4 progress: Load/Save wiring (item 1 and part of item 2)

Wired to real actions (`menuConfig.ts` + `MenuBar.tsx` + `recipeStore.ts` +
`RecipeLoader.tsx`/`RecipeSaver.tsx`):
- **Load**: New Recipe > Empty Recipe / From File; From Examples (all 7:
  HIV mature/immature, +Blood Plasma variants, Influenza envelope/complete,
  Exosome — all 7 verified to parse cleanly via `loadFromJson` in
  `recipe-store.test.ts`, not just the 2 that were Phase 2 fixtures);
  Colors > Load Color palette; Load Molarity/Count.
- **Save**: cellPACK/cellPAINT recipe (classic), cellPACK-gpu recipe
  (serialized), Spreadsheet CSV, Color palette, Molarity/Count.
- `Workspace.tsx`'s "Recipe View" panel shows a live summary (name, format,
  ingredient/compartment count) instead of static placeholder text.
  `AppShell.tsx` gained an app-wide error dialog (`recipeStore.error`) for
  load/save failures (bad JSON, 404, save-with-nothing-loaded).
- Verified end-to-end with a manual Playwright walkthrough: loaded HIV
  mature (26 ingredients / 4 compartments, matching the Phase 2 fixture),
  downloaded cellPACK-gpu JSON / CSV / color palette and inspected the
  content, loaded Influenza envelope (3/2), confirmed a still-deferred item
  (Mycoplasma Genitalium auto) correctly falls through to the placeholder
  dialog rather than a broken fetch.
- Found and fixed a real bug during that walkthrough: `dev:legacy`'s script
  ran `python3 ../localCGIServer.py` from `web/`, which put the server's own
  CWD at `web/` instead of the repo root, so every proxied `/data/*.json`
  example load 404'd. Now `cd .. && python3 localCGIServer.py`.

Deliberately still placeholders, and why (do not wire these without the
listed prerequisite):
- **Load**: Mycoplasma Genitalium auto/curated, YASARA Petworld items —
  `.zip`/format-specific example files aren't in the repo checkout to test
  against. Append-from-example (Merge* loaders) — needs the merge modal
  (Phase 4 item 4). Setup Data Directory — needs the `webkitdirectory`
  picker + `pathList_` port (Phase 4 item 8).
- **Save**: cellPAINT recipe+sprites zip — needs `zipExport.ts` (JSZip port,
  not started). Color mapping (Properties-Colors) save — the underlying
  `colorMapping.ts` import/export functions exist (Phase 2) but there's no
  UI to produce a `PropertyMapping` from yet (needs the canvas/property
  editor).
- **Skills** menu items — Phase 4 item 7, not started this session.
- Load Color Palette and Load Molarity/Count currently succeed silently:
  neither is reflected in the Recipe View summary or anywhere else visible,
  since the canvas (which would show color) and a molarity readout don't
  exist yet. A successful load currently looks identical to doing nothing —
  known, not broken; flagged here so it isn't mistaken for a bug later.

### Phase 4 progress: recipe table (item 3, `grid_recipe` only)

**Architecture deviation from the migration plan's risk map, confirmed with
the user before building:** the plan's risk map called for "wrap
`gridtable.js` in a thin `SlickGridPanel`." Auditing `js/gridtable.js` first
showed that doesn't hold for the editable recipe grid — cell edits call
`updateAttributesNode` (main.js:2318) and row delete splices the legacy
global D3 `graph.nodes`/`graph.links` directly (`removeRow`,
gridtable.js:2222). Wrapping it as literally specified would mean loading
jQuery + SlickGrid + `gridtable.js` + a slice of `main.js`, and keeping that
legacy `graph` global in **bidirectional** sync with `recipeStore` — exactly
the global state Phase 2/3 removed on purpose. Put to the user directly; the
answer was to build a native React table (`RecipeTable.tsx`) over
`recipeStore` instead, accepting that full SlickGrid fidelity (image
thumbnail formatter, column picker, pager, inline filter panel) is a real
reimplementation cost, not a free wrap.

Done: `RecipeTable.tsx` — one row per ingredient node
(`graph.nodes.filter(isIngredientNode)`), editable name/count/molarity
(commit on blur, matching SlickGrid's commit-on-edit-complete rather than
per-keystroke), delete button. Backed by two new `recipeStore` actions,
`updateIngredient`/`deleteIngredient`, which mutate `node.data` / splice
`graph.nodes`+`graph.links`+`parent.children` and publish a new graph
reference — the same in-place-mutate-then-new-reference pattern as
`applyColorPalette`/`applyMolarityCount`. Verified against a real recipe in
a live browser: loaded HIV mature (26 ingredients), edited a name (count
stayed 26, edit persisted), deleted a row (count dropped to 25, summary
panel updated in step).

Explicitly deferred, and why: `grid_interaction` (partner links — belongs
with the links/partners UI, not built), `grid_uniprot`/`grid_pdb` (these are
*search-results* tables, not graph-editing tables — they belong to Phase 4
item 5, PDB/search panels, not this item). Not ported: image/sprite
thumbnail column, column picker, pager, inline filter panel, `grid_pdb`-style
group-by — none of these are graph-editing behavior, so none of them forced
the wrap-vs-native decision above; they're plain missing UI, add if/when
needed.

### Phase 4 progress: column mapping (item 4, CSV load only)

**Structural deviation from the migration plan, discovered by auditing
`js/main.js`/`js/modal_merge.js` before building:** the plan's target
architecture lists `ColumnMappingDialog.tsx` and `ColumnMergingDialog.tsx` as
two independent deliverables. They aren't independent in legacy — there's
one column-mapping modal (`#slickdetail`) used for both a plain CSV/XLSX
load and a merge-on-append, with merge-only checkboxes (`merge_field`)
appended to that same modal only when merging. This is a tactical
correction (unlike item 3's fork, which was about which state is
authoritative), so it didn't need a user question — followed legacy's actual
shape and moved on.

Done: `columnMapping.ts` (ported `allfield`/`allfield_query`/`GuessColumn`'s
longest-common-substring fuzzy matcher), `parseCsvRecipe.ts` (ported
`parseSpreadSheetRecipe`, CSV only), `ColumnMappingDialog.tsx`, wired into
`RecipeLoader.tsx` — `.csv` is no longer in the unsupported-extensions list.

Real-data verification, not just self-consistency: there are no CSV/XLSX
fixtures anywhere in this repo and the legacy CSV importer isn't exercised
by anything else, so a self-round-trip alone would have been weaker than
every other oracle test in this migration. Closed that gap the other
direction instead — exported the already-fixture-verified
`HIV_serialized.json` through this app's own `exportRecipeCsv`, reimported
that CSV, and asserted per-ingredient fields matched (fingerprint-matched,
since that fixture has duplicate ingredient names). Also verified live in a
browser with a hand-authored CSV (name/pdb/count/compartment/location
columns) — correct names, compartments, and surface/interior flags landed
in the Recipe table.

One legacy-inherited lossy quirk surfaced by that oracle test, documented
rather than "fixed": `ParseBU` strips a leading `"BU"`/`"B"` prefix down to
the bare digit, so re-importing a CSV this app itself exported turns a
canonical `"BU1"` into `"1"` on that one field. This matches legacy's own
`ParseBU` behavior exactly (it's designed to parse a human-typed cell, not a
value the same tool already canonicalized) — not something this port
introduced.

Deferred, with reason:
- **XLSX** — needs a SheetJS-equivalent parsing dependency (a dependency
  decision to make deliberately, not just more UI); once added, the same
  `columnMapping.ts`/dialog should work as-is since mapping is
  format-agnostic once there are headers + rows.
- **The `comp_column` "one column per compartment" layout** (a secondary,
  multi-column compartment format) and **compartment resolution against an
  already-loaded recipe's tree** (`js/modal_canvas_comp.js`, itself unported)
  — CSV import here always starts a fresh recipe, so every named
  compartment is created flat as a new child of root; nested compartment
  paths in the `compartment` column are collapsed to their last segment
  (see `parseCsvRecipe.ts`'s docstring for the full list of scope cuts).
- **`NGL_GetSelection`'s chain-selection reformatting** — the raw
  `selection` cell is stored as-is; that reformatting belongs with the NGL
  panel wrap (item 5), which needs the same helper for hand-entered
  selections too.

### Phase 4 progress: merge-on-append (item 4, JSON only)

**Verified against the running legacy app, not just source reading —
this is the one that justified the extra step.** `js/main.js:merge_graph`
reuses `allfield`'s ~21 field keys for the merge-modal checkboxes, and
reading the source suggested most of them should work (the target key
matches a real `IngredientData` field name). Reading isn't the same as
"legacy's own output agrees" though, so before writing `mergeRecipe.ts` this
got tested empirically: `data/Mpn_1.0_2.json` loaded and merged against
itself and against a hand-perturbed copy in the actual running app
(`localCGIServer.py`), with the saved output diffed field-by-field. That
overturned the source-reading guess — several checkboxes that look live by
field-name matching are provably dead in legacy's real output, because the
declared target key never matches the ingredient's actual field name:
`bu`/`selection`/`model` target `data.bu`/`.selection`/`.model`, but the
real fields are nested under `data.source.*`; `comment` targets
`data.comment`, but the real field is `data.comments` (with an s);
`image`/`offsety`/`scale2d` target top-level fields that actually live
under `data.sprite.*`; `compartment` isn't a data field at all (it's
structural). `name`'s checkbox is inert for a different reason — it's
always a same-value overwrite, since name equality is the match key.

Consequence for the UI, not just the data layer: `MergeDialog.tsx` only
renders checkboxes for the ~12 fields confirmed live (folding
bu/selection/model into a single "source" control, since they only change
as a side effect of the whole `source` object being replaced on that
checkbox) instead of reproducing legacy's ~9 inert ones. An inert checkbox
is a UI that lies about what it does — that's a different kind of thing
than the `ParseBU` *data* quirk above, which was preserved because it's a
real (if surprising) transform on real data, not a control with zero effect.

Done: `mergeRecipe.ts` (`mergeRecipeGraphs`, `MERGEABLE_FIELDS`,
`defaultMergeFieldFlags`), `MergeDialog.tsx`, `recipeStore.mergeGraph`,
wired into `RecipeLoader.tsx` (`mergeFromUrl`/`pickMergeFile`) and
`menuConfig.ts`/`MenuBar.tsx` for Load > Append From > Examples (HIV and
Blood Plasma, Blood Plasma, Mycoplasma Pneumonia) and > File
(.json/_serialized.json only — CSV-merge is the two-dialog-in-sequence flow
and stays deferred with CSV's other merge-adjacent gaps). Test coverage:
the three legacy-captured oracle scenarios above (kept as fixtures in
`tests/fixtures/merge-oracle/`) plus synthetic cases for branches the Mpn
fixture doesn't exercise (`createWhenMerge: false`, an individually
unchecked field flag, reparenting-with-fallback-to-root, link-merge
update-only-never-add). Verified live in a browser: merging Mycoplasma
Pneumonia into a loaded Influenza envelope recipe took the ingredient count
from 3 to 183 (3 + Mpn's 180) and the compartment count from 2 to 3.

One legacy bug replicated on purpose, not fixed: "Append From > Examples >
Exosome" calls the same non-merge loader as the plain "From Examples >
Exosome" menu item (`js/main.js`'s menu wiring literally reuses
`LoadExampleExosome()` under the merge submenu) — clicking it discards the
current recipe instead of merging into it. Confirmed this port does the
same thing live in a browser, rather than "fixing" it to actually merge.

### Phase 4 progress: Skills menu (item 7)

Checked the *current* `index.html`/`js/main.js` before porting rather than
trusting the migration plan's description verbatim — recent commits
(`28a770a` "Warn users before copying or opening the LLM recipe skill",
`3b37dd6` "Remove LLM recipe menu entry") had touched this exact area since
the plan was written. Both Skills menu items and the safety-disclaimer
`confirm()` gate were confirmed still live in the current source, so the
plan's "port almost verbatim" held.

Done: `skillsCopyText.ts` (`getMesoscopeBaseUrl`, `buildRecipeSkillsCopyText`,
the disclaimer text — pure string building, no DOM), `clipboard.ts`
(`copyTextToClipboard` + the `document.execCommand('copy')` textarea
fallback for browsers/contexts without the async Clipboard API), and
`SkillMenu.tsx` (a thin imperative-handle component like `RecipeLoader`,
rendering nothing — legacy's own UI for this feature is native
`confirm()`/`alert()` dialogs, so there was no reason to build custom modal
UI for a two-action feature). Added `/SKILLS.md` to `vite.config.ts`'s dev
proxy list — it was missing (only `/recipe_json`/`/recipe_proxy`/`/data`
were proxied), which would have 404'd the skill fetch in the modern dev
server despite working fine directly against the legacy server. Verified
live in a browser with `navigator.clipboard.writeText` intercepted to
inspect the actual copied text (15KB, containing the expected skill markers
and the live-computed Mesoscope base URL).

### Phase 4 progress: PDB/UniProt search (item 5, search glue)

**Not a verbatim port — the endpoints legacy's search functions call are
dead.** Audited `js/query_helper.js`'s `queryPDBfromName`/
`queryPDBfromSequence`/`queryPDBfromUniprot`/`queryUniportKBfromName`, then
verified their target URLs directly with curl before porting anything (the
same discipline as every oracle test in this migration, applied to a live
third-party API instead of a fixture file):
- `https://www.rcsb.org/pdb/rest/search/` (old RCSB REST search) → **404**
- `https://www.rcsb.org/pdb/rest/customReport.csv` → **404**
- `https://www.uniprot.org/uniprot/?query=...&format=tab` → redirects into
  `rest.uniprot.org` with the query string mangled into the URL path,
  landing on a **400**

These are RCSB's and UniProt's own decommissions, not fixable typos —
porting the exact calls would ship a search feature that returns nothing.
Built `domain/pdb/pdbSearch.ts` against each provider's *current*
replacement instead: `search.rcsb.org/rcsbsearch/v2/query` and
`rest.uniprot.org/uniprotkb/search`, both confirmed working with wildcard
CORS (`access-control-allow-origin: *`), so no proxy is needed — unlike
cross-origin recipe loading, which is why `/recipe_proxy` exists. This
preserves the legacy feature's *intent* (search by name/sequence/UniProt
accession, populate a result table, apply a pick back onto an ingredient),
not its decommissioned mechanism.

Done: `pdbSearch.ts` (`searchPdbByText`/`searchPdbBySequence`/
`searchPdbByUniprot`/`searchUniprot`), `PdbSearchPanel.tsx`/
`UniprotSearchPanel.tsx` (native React tables, not `grid_pdb`/`grid_uniprot`
wraps — same reasoning as `RecipeTable.tsx` in item 3), and a
`recipeStore.selectedNode`/`selectNode`/`applyPdbPick` seam — the modern
`node_selected` — so clicking a `RecipeTable` row feeds a search result's
"Apply" button. Verified with unit tests using response shapes captured
from the real live endpoints (not guessed from docs), plus a live browser
walkthrough against the real, unmocked APIs: a PDB-by-name search found a
real structure and applying it set the ingredient's `source.pdb`; a UniProt
search found a real accession (confirmed via the underlying store action's
unit test, since `RecipeTable` doesn't render a uniprot/label column).

Scope cut: legacy's dead `customReport.csv` path additionally fetched rich
per-result metadata (title, experimental technique, taxonomy, molecular
weight) in a second request. There's no replacement that returns the same
columns in one call, so results here are just `{id, score}` — enough to
populate a table and apply a pick, which is the part that actually feeds
back into the recipe graph. Richer metadata display can be added later.

### Phase 4 progress: viewer mount (item 5, NGL + Mol-star)

**Confirmed with the user before building — this piece can't be
faithfully "ported" at all**, unlike everything else in Phase 4: the
modern app loaded zero of the legacy viewer libraries (verified in Phase 3),
and NGL's own migration-plan risk-map entry says "wrap indefinitely, no
rewrite planned" because of its size (5600 lines) and stateful complexity.
Investigated three mounting mechanisms and put real findings to the user
rather than picking one:
1. **Modern npm packages** — `molstar` (v5.10.1) and `ngl` (v2.4.0) are
   both actively maintained, ES-module-native, confirmed installable.
2. **Load legacy's exact bundles** — `extras/molstar/`, `extras/ngl.js` as
   global `<script>` tags, calling the existing `MS_*`/`NGL_*` globals;
   exact behavioral parity but re-couples the new app to jQuery/legacy
   globals the whole migration exists to get away from.
3. **Iframe the legacy app** for the viewer panels.

User chose modern npm packages. Built `MolstarViewer.tsx`
(`createPluginUI`/`renderReact18`, the *current* Mol-star plugin-UI API —
not legacy's older bundled `BasicMolStarWrapper` example app that
`js/molstar_wrapper.js` actually drives) and `NglViewer.tsx` (`ngl`'s
`Stage` API). New dependencies: `molstar`, `ngl` (runtime), `sass-embedded`
(dev — Mol-star's stylesheet is `.scss`, which Vite needs a preprocessor
for). **`NglViewer.tsx` and the `ngl` dependency were later removed
entirely** — see the "Ingredient Options / Ingredient View" follow-up
section below, which replaced NGL's per-ingredient viewing role with a
second Mol-star instance per a later user-directed goal.

Scope, deliberately narrow: **selecting a `RecipeTable` row with a PDB id
loads that structure into both viewers.** Not ported (each is its own,
larger slice): bidirectional highlight sync between the viewers and the
recipe table, the residue-mapping-driven chain highlighting
(`node.data.mapping[uniprot][chain]`), per-ingredient coloring
(`MS_ChangeColor`), membrane/spacefill toggles, loading a full cellPACK
results file (`MS_LoadModel`), the multi-viewer grid (`ngl_grid.js`).
ProtVista and the PDB Component Library panels (Sequence
features/protvista/Topology/Uniprot mapping) remain placeholders — neither
had a clear modern-npm-package answer in the same investigation.

Two real bugs surfaced by testing against real data and a real browser,
neither visible from reading source or from a synthetic PDB id:
- **`source.pdb` usually isn't a public PDB entry.** Counted directly from
  `data/HIV_serialized.json`: only 8 of 26 ingredients have a bare
  4-character RCSB accession ("3hvt", "1ex4", ...); the rest are custom
  cellPACK structure filenames ("MA_matrix_G1.pdb",
  "HIV1_ENV_4ncoABEFIJ.pdb", ...) that only resolve through cellPACK's own
  structure server, not `files.rcsb.org`. Fetching from RCSB unconditionally
  would 404 for most ingredients in a typical recipe. Added
  `pdbSearch.ts:isLikelyRcsbId` to gate the fetch attempt and show an
  honest "isn't a public PDB entry" message instead of a broken viewer —
  verified this message renders correctly in both viewers live in a browser.
- **React 19 StrictMode's dev-only double-invoke of effects left two
  stacked NGL canvases** in the same container: `Stage.dispose()` doesn't
  remove the DOM canvas element it created, so the second (kept) mount's
  canvas landed on top of the first (cleaned-up) mount's orphaned one.
  Mol-star's own effect already guarded against the equivalent case
  correctly (a `disposed` flag checked before `setPlugin`, so the
  first-mount's plugin never gets shown and is disposed immediately).
  Fixed by explicitly clearing the container (`container.replaceChildren()`)
  in NGL's cleanup, not just calling `dispose()`.

Verified live in a browser (loaded HIV mature, selected the "3hvt"
ingredient): both viewers rendered the real cartoon structure
(screenshot-confirmed), matching colors/orientation appropriate to each
library's own defaults. Selecting a custom-filename ingredient showed the
fallback message in both, with zero console errors either way.
Headless-Chromium note: Mol-star's WebGL2 context creation failed under
Playwright's default flags (`Could not create a WebGL rendering context`)
until launched with `--use-angle=swiftshader` — an environment/flag
requirement for *headless testing*, not a real limitation; NGL worked
without it. The gating logic in this section (originally `isLikelyRcsbId`)
is unit-tested, including an oracle count against the real HIV fixture —
see the follow-up section below, which superseded it — but Vitest/jsdom has
no WebGL, so the viewers themselves are browser-verified only, not
unit-tested; `smoke.test.tsx` mocks both components out so AppShell's
menu/layout tests don't fail on jsdom's WebGL gap.

### Phase 4 follow-up: real structure-file resolution (supersedes `isLikelyRcsbId`)

**The "isn't wired up yet" message above was wrong about *why* — corrected
once the actual resolution rule was confirmed with the user.** The original
viewer-mount cut assumed a non-RCSB `source.pdb` (e.g. `"MA_matrix_G1.pdb"`)
had nowhere to resolve from at all, and gated the fetch off entirely
(`isLikelyRcsbId`). That was incomplete: legacy's `NGL_getUrlStructure`/
`LM_getUrlStructure` (js/ngl.js:4890-4959) already had a real fallback for
exactly this case — a public GitHub repo, `cellpack_repo+"other/"+pdbname`
(`cellpack_repo` = `https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/`,
confirmed live via curl: 200, `access-control-allow-origin: *`, no proxy
needed) — checked only *after* a local uploaded-folder override
(`pathList_`, still not built, Phase 4 item 8). Missed on the first pass by
reading the viewer code without following where `source.pdb` itself comes
from and resolves.

**The confirmed rule** (`domain/pdb/structureSource.ts:resolveStructureSource`):
a `source.pdb` with a `.pdb`/`.cif`/`.mrc` extension is a filename, resolved
from the cellPACK_data GitHub repo (local-folder override still deferred,
same reason as before); a `source.pdb` with no extension is an accession
code, fetched automatically from RCSB. This replaces `isLikelyRcsbId`
entirely — there is no more "isn't wired up yet" case for either type,
only a genuine fetch-failure message if a repo file or RCSB id doesn't
actually exist.

Both viewers now branch on the resolved `extension`, since `.mrc` is a
density/volume map, not a structure — a materially different pipeline:
- **NGL** (`NglViewer.tsx`): `.pdb`/`.cif` load via `stage.loadFile(url, {
  ext })` same as before, rendered `cartoon`; `.mrc` uses NGL's built-in MRC
  parser (`stage.loadFile` auto-selects it from `ext: 'mrc'`) rendered
  `surface` (isosurface), not `cartoon`.
- **Mol-star** (`MolstarViewer.tsx`): `.pdb`/`.cif` still go through
  `builders.structure.parseTrajectory`, now with the `format` passed through
  (`'pdb'` or `'mmcif'`) instead of hardcoding `'mmcif'`, and pointed at the
  repo URL instead of always RCSB. `.mrc` uses an entirely different,
  previously-unused Mol-star pipeline — `Ccp4Provider` from
  `mol-plugin-state/formats/volume.js` (`builders.data.download({ isBinary:
  true })` → `Ccp4Provider.parse` → `Ccp4Provider.visuals`) — since there's
  no `builders.volume` on this Mol-star version's plugin context; volume
  loading isn't a `builders.structure` variant.

Verified: `structure-source.test.ts` (8 cases: extension detection per
format, case-insensitivity, empty/unrecognized-extension fallback, and an
oracle against the real HIV fixture — 8 of 26 ingredients resolve to `id`,
18 to `repo-file`, matching the earlier `isLikelyRcsbId` count exactly since
it's the same partition, just now with a real destination instead of a
dead end). Live-browser-verified for `.pdb`: selected the `MA_matrix_G1.pdb`
ingredient (previously the "isn't wired up yet" example) and confirmed both
viewers rendered the real structure fetched from the GitHub repo
(screenshot-confirmed, zero console errors). **Not** end-to-end verified for
`.mrc`: no `.mrc`-extension file exists in this repo's `other/` folder today
(checked via the GitHub API — 862 `.pdb`, 2 `.map`, 1 `.cif`, no `.mrc`) or
in any local recipe fixture, so the volume pipeline is implemented against
Mol-star's/NGL's own public, documented APIs (read directly from
`node_modules`, not guessed) and type-checks, but hasn't been exercised
against a real density map through this app. Flagged rather than silently
assumed working.

### Phase 4 follow-up: Ingredient Options / Ingredient View (NGL dropped, Mol-star only)

**User-directed goal, not a checklist item: replace "NGL Options"/"NGL View"
with a Mol-star-based "Ingredient Options"/"Ingredient View" at the same
control fidelity, keeping the "Mol-*" tab's viewer separate for a later
full-packed-model-loading phase.** NGL (both `NglViewer.tsx` and the `ngl`
npm dependency) is fully removed — Mol-star is now the only 3D library in
this app's per-ingredient viewing role.

**Audit first, matching the pattern for every other Phase 4 slice.** A full
line-referenced audit of `js/layout_mg.js:317-491` (`ngl_widget_options_collapsible`)
and `js/ngl.js` found two distinct legacy control surfaces (the "NGL Options"
side panel and a few inline controls in "NGL View" itself), roughly 40 rows
of controls in 6 groups (Molecule/chain, 3D Membrane, Fiber, Beads and Geom,
Sprites, View). Key findings that shaped scope:
- Chain selection is legacy's own **rebuild-the-representation-from-scratch**
  model (`NGL_ChangeChainsSelection`/`NGL_ChangeSelection`), not a
  show/hide toggle — this port does the same.
- "3D Membrane"/"Fiber" orientation are **not one control each** — they're a
  numeric apply step (`NGL_applyPcp`/`NGL_applyFiberPcp`) plus a separate 3D
  gizmo build/update step (`NGL_ShowAxisOffset`/`NGL_ShowFiberAxis`, hand-built
  `NGL.Shape` primitives — two cylinders red/blue for membrane, one arrow for
  fiber) plus draggable manipulation (shift+ctrl+drag, which just calls the
  same apply functions). Sliders are equivalent control to dragging, not a
  lesser cut — legacy's own drag handler bottoms out in the identical apply
  call a slider's `onChange` would.
- Clustering/LOD (`NGL_buildBeads`/`NGL_ClusterStructure`) is a genuine
  k-means over atom coordinates (`buildWithKmeans`), with LOD 0 always a
  single bounding sphere (`NGL_autoBuildBeads`) — **this is real,
  library-independent application logic**, not a rendering-library feature,
  confirmed by checking: `pos`/`radii` are `null` for most ingredients in
  `data/HIV_serialized.json` (checked the *actual* field names —
  `positions`/`radii_lod` in the raw JSON, not `pos`/`radii`, which are this
  app's normalized names — some ingredients, e.g. `HIV1_RT_3hvt_0_1_0`, do
  ship precomputed level-0 data), so "construction," not just
  "visualization of precomputed data," is what most ingredients need.
- "Sprite 2D" is legacy's **viewport-screenshot-to-PNG** mechanism
  (`NGL_makeImage`/`stage.makeImage`), not a 3D rendering mode — it feeds a
  *separate* 2D canvas view (`js/main.js`), which this app doesn't have a
  visual counterpart for beyond the preview image itself.
- The old NGL panel's own click/hover handlers **never actually synced
  selection back to the recipe table** (`stage.signals.clicked` only drove
  local drag/resize interactions) — the legacy Mol* wrapper
  (`js/molstar_wrapper.js:MS_callback`) is what did that, for the *other*
  (whole-packed-model) viewer role, deliberately out of scope here.
- Legacy had two real, uncorrected bugs (a duplicate `showaxis` element id,
  a reused `fnum4` id) — not reproduced.

**What was built**, matching the four areas named plus the representation/
color controls those need to be usable (`IngredientOptions.tsx`,
`IngredientViewer.tsx`, `domain/pdb/ingredientViewControls.ts`,
`domain/pdb/molstarCustomShapes.ts`, `domain/pdb/molstarStructureUtil.ts`,
`domain/recipe/clustering.ts`, `state/ingredientViewerStore.ts`):
- **Chain selection**: checkboxes per chain (`molstarStructureUtil.ts:listChains`,
  reading `label_asym_id` per element — no single "list the chains" API
  exists on a Mol-star `Structure`), rebuilding the whole structure hierarchy
  + a single filtered component + representation *from the trajectory* on
  any change (`ingredientViewControls.ts:buildIngredientRepresentation`, a
  MolScript `atomGroups`/`chain-test` expression via
  `plugin.builders.structure.tryCreateComponentFromExpression` — see the
  color-rendering bug below for why this rebuilds from the trajectory rather
  than patching an existing structure's components).
- **Representation/color**: a subset of Mol-star's built-in types
  (cartoon/ball-and-stick/gaussian-surface — `spacefill` deliberately
  excluded, see below) and color themes
  (chain-id/uniform/element-symbol/secondary-structure) — Mol-star's own
  registries are richer than legacy's NGL-scheme list; not all 22 NGL
  schemes were ported, since these are just configuration, not the
  commissioned "same level of control" areas.
- **Membrane/fiber orientation**: axis+offset (membrane) and axis+length+offset
  (fiber) numeric controls, writing onto `pcpalAxis`/`offset`/`fiberAxis`/
  `fiberOffset` via a new `recipeStore.patchSelectedIngredient` action, plus a
  live 3D gizmo (two cylinders / an arrow-like cylinder+cone) built with
  Mol-star's low-level custom-shape API (`molstarCustomShapes.ts`) — the
  same `MeshBuilder`/`Shape.create`/`ShapeRepresentation3D` pattern Mol-star's
  own `extensions/meshes/mesh-extension.js` uses, since there's no
  higher-level "add a custom primitive" call. Both toggles default off
  (not derived from `pcpalAxis`/`fiberAxis` presence — see the bug note
  below) and default the offset to the structure's own geometric center
  once it loads, not the world origin.
- **Clustering/LOD**: a real k-means implementation (`domain/recipe/clustering.ts`
  — pure, no Mol-star dependency, fully unit-tested with a determinism/coverage
  check) run over atom coordinates read out of the loaded structure
  (`molstarStructureUtil.ts:getAtomPositions`, honoring the current chain
  selection), building one of 3 LOD levels on demand ("Build level N"),
  storing results into the ingredient's `pos`/`radii` arrays (the same
  fields legacy/the serialized format use), with independent show/hide per
  level and 3 color-by modes (level/radius/random), rendered via the same
  custom-shape mechanism as the gizmos.
- **Sprite 2D**: a "Capture sprite from view" button using Mol-star's
  built-in `plugin.helpers.viewportScreenshot.getImageDataUri()` (a real,
  arguably better replacement for `stage.makeImage()`), stored as a `data:`
  URI directly on the ingredient (`sprite.image`) with a live preview, plus
  the 2D scale/membrane-Y-offset/fiber-length numeric fields
  (`sprite.scale2d`/`offsety`/`lengthy`).
- Two Mol-star plugin instances now coexist in the same page — confirmed
  live (2 independent `<canvas>` elements, one filterable independently of
  the other) — `IngredientViewer.tsx` uses a lean `PluginUISpec`
  (`components.controls.{top,left,right,bottom}: 'none'`) rather than
  `MolstarViewer.tsx`'s full `DefaultPluginUISpec()`, since this panel's
  controls live entirely in `IngredientOptions.tsx` and a second full default
  UI would just duplicate/compete with them.

**Explicitly not ported**, named individually rather than lumped together:
per-bead drag/resize-in-place (legacy's picking-proxy-name-parsing
interaction model), the membrane/fiber gizmo's draggable manipulation
(sliders/numbers cover the same underlying apply calls — see above), the
dead/never-fully-wired OPTICS/DBSCAN/grid-based clustering modes (no live
UI path even in legacy), the server-rendered "Illustrate" sprite path
(`cgi-bin/illustrator.py` round trip — sprite capture here is the *other*
legacy path, a real viewport screenshot), and cross-viewer/table highlight
sync beyond the existing `recipeStore.selectedNode` seam (selecting a
different structure *inside* the Ingredient View doesn't select a different
recipe row — legacy's NGL panel didn't do this either; that behavior
belongs to the whole-packed-model Mol-star role, deliberately deferred).

**Three real bugs found only by live-browser testing, not by the type
checker or unit tests** (jsdom has no WebGL, so none of this is reachable
by Vitest):
1. **Chain filtering silently did nothing.** `IngredientViewer.tsx` originally
   loaded the structure with `hierarchy.applyPreset(trajectory, 'default')`,
   which — like `MolstarViewer.tsx` — creates its own default cartoon
   representation. `IngredientOptions`'s chain-filter code only tracked and
   deleted *its own* previously-created component, never that original
   default one, so the untouched, all-chains default representation stayed
   visible underneath/alongside any filtered one. Fixed by loading with
   `{ representationPreset: 'empty' }` — `IngredientOptions` now owns the
   only visible representation from the start. Verified: hid two of three
   chains and confirmed only the third rendered, screenshot-compared against
   the unfiltered baseline.
2. **Chain checkboxes rendered permanently unchecked.** The "default to all
   chains selected" reset lived in the same effect as the rest of the
   per-ingredient UI reset, keyed on `selectedNode` — but the chain list
   itself arrives asynchronously (after the structure finishes loading), so
   that effect ran once while `chains` was still `[]`, and `selectedChains`
   never got repopulated once the real list arrived. Fixed by splitting into
   its own effect keyed on `chains`.
3. **Orientation gizmos defaulted to a degenerate or off-screen position.**
   `pcpalAxis`/`offset` are frequently a real, present-but-zero value in
   recipe JSON (`principalVector: [0,0,0]`, not absent) — a "fall back only
   if missing" default left the axis at `[0,0,0]` (an invisible, zero-length
   gizmo). Separately, defaulting `offset` to `[0,0,0]` (world origin) put
   the gizmo far from the structure, since PDB coordinate frames are rarely
   centered at the origin (offsets like `[128, -1, 74]` are typical). Fixed
   by normalizing the axis default (reusing the existing `normalize()`
   helper, which already maps a zero vector to `[0,0,1]`) and defaulting the
   offset to the structure's own computed geometric center once it loads.
   Also scaled the gizmo's size to the structure's actual bounding radius
   rather than a fixed constant, so it doesn't look like a sliver on a large
   structure or a dominant pole on a small one.

**A fourth bug found live, this one requiring real isolation work, not just a
one-line fix: `spacefill` representation permanently corrupts custom-shape
colors for the rest of the session.** The membrane/fiber gizmos' and LOD
beads' colors sometimes rendered as a uniform, unrelated color instead of
the requested ones (e.g. requesting red+blue cylinders rendered as a uniform
teal). Root-caused through a sequence of isolated A/B tests rather than
guessing:
- Direct instrumentation of `molstarCustomShapes.ts`'s `getColor(groupId)`
  callback confirmed it always receives and returns the *correct* per-group
  color, every time — ruling out this app's color data, geometry, or
  theme-wiring.
- A first hypothesis — the incremental "delete the old component, create a
  new one" chain-filter update (rather than a full reload) was carrying
  forward stale state — was directly tested and ruled out: rebuilding the
  entire structure hierarchy from the trajectory on every chain/
  representation/color change (`ingredientViewControls.ts:buildIngredientRepresentation`,
  replacing the narrower `applyChainRepresentation`) did *not* fix it.
- Systematically toggling one representation type at a time (holding
  everything else fixed) isolated it to exactly one trigger: once Mol-star's
  `spacefill` representation (GPU impostor rendering) has been used
  anywhere in the plugin, every custom shape rendered afterward — for the
  rest of the session, regardless of which representation is active or how
  many times the structure is reloaded — renders with the wrong color.
  `cartoon`, `ball-and-stick`, and `gaussian-surface` were each individually
  confirmed *not* to trigger it. The structure's own coloring (`chain-id`,
  etc.) was confirmed unaffected in every case — only this app's custom
  `Shape`-based rendering is hit, which is consistent with `spacefill`'s
  impostor shader path leaving behind some Mol-star-internal or WebGL-driver
  state that only a shape-group color theme's rendering happens to read.
- **Fixed by removing `'spacefill'` from the offered representation types**
  (`IngredientRepresentationType` in `ingredientViewControls.ts`) — a
  disclosed, deliberate scope reduction (one of four representation choices,
  not one of the four commissioned control areas), justified by a
  reproducible library-level defect rather than removed speculatively.
  Re-verified the full original repro sequence (chain uncheck → representation
  churn → chain recheck → membrane/fiber/LOD) with `spacefill` unreachable
  through the UI: all three custom-shape color paths (membrane gizmo, fiber
  gizmo, LOD beads) rendered correctly, screenshot-confirmed, including
  immediately after heavy chain/representation churn that previously
  reproduced the bug every time.

**A fifth bug, found while re-verifying after the fourth: switching to a
different ingredient could leave a previous ingredient's LOD beads
permanently visible, orphaned, and untracked.** Selecting ingredient A,
building and showing a LOD level, then selecting ingredient B could leave
ingredient A's beads on screen indefinitely — the level's checkbox correctly
showed unchecked for ingredient B, but the geometry from A never
disappeared. Root cause: `setCustomShape`/`removeCustomShape`
(`molstarCustomShapes.ts`) each independently read-modify-write a shared
`Map<key, ref>`, with no guarantee that calls for the *same key* run in the
order they were issued. Switching ingredients can fire a "show" (from the
just-finished build, still resolving) and a "hide" (from the ingredient
switch's UI reset) for the same LOD-level key in quick succession; if the
"hide" completed *before* the "show" finished registering its new ref, the
hide found nothing to remove, no-opped, and the show then registered a ref
for a shape nobody would ever ask to remove again — a permanent orphan.
Fixed by serializing all `setCustomShape`/`removeCustomShape` calls through
a per-`(plugin, key)` operation queue, so a "hide" issued after a "show"
always waits for that show to finish before running, and correctly finds
what it needs to remove. (A related but distinct fix landed alongside this:
`IngredientViewer.tsx`'s structure-reload effect wasn't awaiting
`plugin.clear()`/`clearCustomShapes()` before starting the next build either
— now properly sequenced with the rest of the reload pipeline, removing
another source of same-class races.) Re-verified: built and showed LOD
beads on one ingredient, switched to a different one, confirmed the
Ingredient View showed only the new ingredient's clean structure with zero
leftover geometry — screenshot-confirmed, repeated across multiple
ingredient switches.

Verified: unit tests for the one pure, easily-testable piece
(`clustering.test.ts` — 8 cases: empty input, k-clamping, cluster
separation, radius-covers-every-assigned-point, determinism, zero-radius
floor, bounding-sphere covers-all-points); the rest (chain
filtering/representation/color, both gizmos, LOD build/show/hide/recolor,
sprite capture, two-plugin-instance coexistence) is browser-verified only,
per-feature, with screenshots at each step, since none of it is reachable
from jsdom — consistent with how `MolstarViewer.tsx`/`NglViewer.tsx` (now
removed) were verified in the original viewer-mount slice.

### Phase 4 follow-up: membrane geometry correction, auto-enable, bead-building options

**User-directed corrections to "Ingredient Options," based on domain knowledge
not fully captured by the legacy-code audit alone.** Three changes, each
researched against the legacy source before implementing rather than guessed:

1. **Membrane/fiber orientation now auto-enable based on ingredient kind**,
   rather than always starting off. Membrane orientation defaults on for
   `data.surface` ingredients; fiber orientation defaults on for
   `data.ingtype === 'fiber'` — confirmed via a full grep of every legacy
   runtime `ingtype` check (`js/ngl.js`, `js/main.js`, `js/cp_serialized.js`):
   it's always a literal string comparison on `ingtype`, never `buildtype`
   (which governs *instance placement* — `random`/`file`/`supercell` — not
   ingredient kind). `ingtype` is derived from the classic recipe's
   `Type`/`packingMode` at parse time (`GetIngredientTypeAndBuildType`,
   js/cp_serialized.js:965-977: `Type === "Grow"` → `"fiber"`), defaulting to
   `"protein"` when absent. Confirmed against real data:
   `data/BloodPlasmaHIV_serialized.json`'s `mRNA` ingredient has
   `"ingtype":"fiber"` while every protein ingredient has `"ingtype":"protein"`.
   The user can still toggle either off/on manually regardless of the
   ingredient's kind.

2. **Membrane geometry corrected: two disks 40Å apart, fixed in world space —
   and the *protein* is transformed to align with them, not the reverse.**
   The original implementation (two cylinders positioned via `axis`/`offset`,
   moving a decorative gizmo next to a fixed protein) matched *one* of two
   conventions that coexist in legacy, but not the one the user described.
   Researched both before changing anything:
   - Legacy's `NGL_ShowAxisOffset` (js/ngl.js:3315-3385) is exactly what was
     first built — a gizmo (two cylinders, ~42Å apart) moved to `axis`/`offset`
     next to a structure that never moves.
   - But legacy's OPM-derived-structure path (js/ngl.js:4436-4468, 4564-4571)
     does the *opposite*: it loads an OPM-hosted PDB that's already
     pre-transformed into OPM's own canonical membrane frame (membrane normal
     along Z, bilayer at a fixed Z position), then *forces* `axis=[0,0,1]`/
     `offset=`(structure center) to match — the code comment at
     js/ngl.js:4563, `//this force the opm pcp and offset. it shouldnt`,
     is the author's own acknowledgment that this is a hack bridging the two
     conventions. This is the "real" semantics the user described: the
     protein moves into place against a fixed membrane, not the reverse.
   - Rebuilt on this second convention, generalized to every membrane
     ingredient (not just OPM-sourced ones): `setMembraneGeometry`
     (`ingredientViewControls.ts`) draws two *disks* (not cylinders) fixed at
     world z = ±20 (40Å apart), red = outside (z > 0), blue = inside (z < 0),
     matching legacy's own leaflet sign convention (js/ngl.js:3330).
     `membraneAlignmentMatrix` computes a rigid transform — rotate `axis` onto
     world `+Z`, translate `offset` to the world origin — applied to the
     *loaded structure itself* via Mol-star's `TransformStructureConformation`
     (`mol-plugin-state/transforms/model.js`), threaded through
     `buildIngredientRepresentation` as an optional parameter so it's part of
     the same single, correctness-preserving rebuild-from-trajectory pipeline
     as chain/representation/color changes, not a separate incremental path.
   - Verified live: rotated the camera to a side view and confirmed both
     disks render with the correct separation and leaflet colors, with the
     transformed protein sitting between them — screenshot-confirmed. Also
     confirmed the "Mol-*" tab's independent `MolstarViewer.tsx` instance
     shows the same structure *untransformed*, since the transform is scoped
     to this panel's own rebuild pipeline only.
   - This required a related architectural simplification:
     `IngredientViewer.tsx` no longer does its own initial
     `buildIngredientRepresentation` call — it only fetches/parses the
     trajectory now. `IngredientOptions.tsx`'s own rebuild effect is the sole
     builder, for the first build and every later change alike. The previous
     "skip the first run" arrangement (two components each thinking the other
     owned the initial build) would have shown a visibly wrong initial frame
     for auto-enabled membranes: the untransformed protein, then a visible
     snap into place once the second build landed.

3. **"Clustering / LOD" gained real bead-building options, geometry-related
   ones explicitly excluded per instruction.** Full audit of legacy's "Beads
   and Geom options" panel (js/layout_mg.js:317-491) first, to separate
   geometry controls (coarse molecular *surface* generation — "Show Geometry
   used," "Rebuild Geometry," "Geometry details" — a different concept from
   beads, left out) from bead-building ones (added):
   - **Auto number of beads** (`domain/recipe/clustering.ts:autoBeadCount`):
     legacy's *live* heuristic, found by tracing the actual call site rather
     than trusting the first plausible-looking function name — the
     originally-assumed `NGL_autoClusterUniqueSize` (js/ngl.js:3631-3650)
     turned out to be dead code (its only call site is commented out). The
     real, live heuristic is inlined in `buildWithKmeans`
     (js/ngl.js:3988-4007, gated by `#toggle_cluster_auto`): bead count =
     bounding volume ÷ volume of one bead at the target radius, floored at 3.
     Legacy computes the bounding volume from the structure's PCA-oriented
     principal axes; this uses an axis-aligned bounding box instead — same
     volume-ratio idea, without requiring a PCA implementation — documented
     as an approximation, not a byte-for-byte port.
   - **Overwrite cluster radius** (`clustering.ts:overrideRadii`): forces
     every bead in the level being built to a fixed radius, legacy's
     `#cl_use_radius`/`#cl_radius`.
   - **"red" added to the "Color by" dropdown** (legacy's fixed-color option,
     alongside the existing level/radius/random modes).
   - Left deferred, confirmed non-functional even in legacy: "Build on a
     grid"/"Build on a grid from level 0" (their checkboxes only ever set
     flags that nothing reads through to a real placement algorithm) and
     "Edit beads (ctrl)" (per-bead drag-in-place, already out of scope as a
     draggable-interaction feature).
   - Verified live: built a LOD level with auto-count + a fixed 8Å overwrite
     radius + red coloring together, confirmed a dense, uniformly-sized,
     uniformly-red bead cluster covering the structure — screenshot-confirmed.

Verified: 6 new unit tests for the two new pure functions
(`autoBeadCount`/`overrideRadii` in `clustering.test.ts`: empty input, floor
behavior, scaling with structure size, monotonicity with target bead radius,
radius replacement, empty-result handling) — 129 total. The membrane
transform, auto-enable, and bead-option wiring are browser-verified only
(no WebGL in jsdom, consistent with the rest of this panel).

### Phase 4 follow-up: fixed a live-reported duplicate-geometry race on the membrane offset slider

**Reported live: dragging the membrane orientation's Z offset slider left
multiple copies of the ingredient's structure visible at once, stacked along
the offset axis, between the two membrane disks.** Root-caused, not guessed:

- `buildIngredientRepresentation` (`ingredientViewControls.ts`) is the sole
  builder called by `IngredientOptions.tsx`'s consolidated rebuild effect —
  on *every* change to chain selection, representation, color, or membrane
  axis/offset. It reads the previous model's ref from a per-plugin
  `modelRefs: WeakMap`, deletes it, `applyPreset`s a new model from the
  trajectory, applies the membrane transform, and writes the new ref back —
  four `await` points spanning that read-then-write.
- The offset sliders (`Vec3Sliders`) have no debounce: a real mouse drag
  fires a native `input` event, and therefore a full effect re-run, on every
  pixel of movement.
- Two rebuilds can overlap when a slider drag fires faster than one
  rebuild's GPU-bound work (`applyPreset` + transform + component +
  representation) completes. Both read the same stale `modelRefs.get(plugin)`,
  both target it for deletion, each mints an independent new model, and only
  the *last* `modelRefs.set` wins — every earlier in-flight model is
  permanently orphaned in the state tree (never deleted, never tracked again)
  while still rendered, at whatever offset value was current when it built.
  That's the reported "copies of the object along the offset."
- **Confirmed by direct instrumentation, not just code reading** — an initial
  attempt to reproduce visually (rapid synthetic slider changes, real
  Playwright mouse drags at several speeds) failed to show overlapping calls:
  `plugin.state.data.cells.size` stayed flat across every drag variant tried,
  because Playwright's scripted input dispatch is slower than this app's own
  rebuild in a software-rendered (swiftshader) headless browser — the harness
  was too fast-relative-to-slow to ever let two calls overlap, not proof the
  race can't happen on a real GPU under a real drag. Confirmed the actual
  mechanism by temporarily widening the window between the `modelRefs` read
  and the delete (an injected 300ms delay) and re-running the same drag:
  `cells.size` climbed from 12 to 26 with `start`/`end` log lines visibly
  interleaved across calls — direct proof of the overlap and the leak.
- **Fixed with the same pattern already used for this exact class of bug** in
  `molstarCustomShapes.ts`'s `setCustomShape`/`removeCustomShape`: a
  per-plugin operation queue (`enqueueBuild`, `WeakMap<PluginContext,
  Promise>`) now serializes every `buildIngredientRepresentation`/
  `clearIngredientStructure` call for a given plugin into arrival order, so a
  rebuild fired mid-drag always waits for the previous one to fully finish
  (delete, build, transform, commit) before starting its own.
- **Verified the fix, not just its absence of new type/lint/test failures**:
  re-ran the injected-300ms-delay drag with the queue in place —
  `cells.size` stayed flat at 12/9 through every call, fully serialized, even
  with the race window forced wide open. Removed the injected delay and
  instrumentation afterward. Re-verified a real fast mouse drag on the live
  app shows no console errors and a single structure.
- The second symptom reported alongside this ("I don't see all the beads
  options" on a separate `localhost:5175` dev server instance) was checked
  against this app's own running instance rather than left unaddressed: the
  port-5175 process had since exited (confirmed via `lsof`/connection-refused),
  so it couldn't be inspected directly, but every Clustering/LOD control
  (Number of beads, Auto number of beads, Overwrite cluster radius + its
  radius field, Color by with all four modes) renders correctly here (at the
  time, gated behind selecting a non-zero LOD level — since corrected to
  always-visible, see the "bead building made automatic" follow-up below).
  Most likely explanation is the other dev server session having died, not a
  real missing-control bug; flagged rather than silently assumed.

129 tests still pass (no new test added — this is an async-ordering fix with
no new pure-function surface to unit-test; the repro/verification above is
the evidence trail instead).

### Phase 4 follow-up: bead building made automatic, matching legacy (no "Build" button)

**User-reported: the Clustering/LOD "Build level N" button didn't match
legacy's actual interaction model.** Researched legacy's real wiring before
changing anything (`js/ngl.js`'s `initListeners`, ~lines 880-906; templates in
`js/layout_mg.js:410-441`) rather than guessing from the panel's static HTML:

- **Legacy has no "Build" button for beads at all.** ("Rebuild Geometry,"
  `NGL_buildCMS()`, is a *different* control for coarse molecular-surface
  geometry — out of scope per this feature's original "beads-only" framing.)
  Bead (re)building is fully reactive: the number-of-beads slider's `mouseup`
  and its paired number input's `input` handler, and the overwrite-radius
  checkbox's `onclick`/its value's `onchange`, each call
  `NGL_updateCurrentBeadsLevel()` directly — a real re-cluster
  (`NGL_buildBeads` → `buildWithKmeans`), with no separate confirm/build step.
- **The level *selector* itself never rebuilds.** `NGL_showBeadsLevel`
  (js/ngl.js:1646) only recolors/re-renders whatever was already built for
  that level and toggles visibility across levels — switching the dropdown
  alone does not re-cluster.
- **All the number-of-beads/auto/radius controls are always visible**, not
  hidden behind a level selection — they're only *functionally* inert when
  the level selector is on a non-numeric value (legacy's "None"/"All"),
  which this app doesn't have an equivalent of.
- Rebuilt to match: removed the "Build level N" button and the `building`
  state entirely. `buildLod`'s body moved into a `useEffect` keyed on
  `[beadCount, autoBeadCountOn, overwriteRadiusOn, overwriteRadius]` —
  changing any of those now triggers an immediate re-cluster of the
  currently-selected level, same as legacy's per-control handlers.
  Deliberately excludes `lodLevel`/`structure`/`selectedChains` from the
  effect's dependency array (still read live inside it) so that merely
  switching the level dropdown, or switching to a different ingredient,
  never silently triggers a rebuild — only matches legacy's actual trigger
  set. Removed the `lodLevel > 0 &&` conditional that hid "Number of beads"/
  "Auto number of beads" at level 0 — they're now always rendered, matching
  legacy's always-visible/functionally-gated model (inert at level 0 since
  `boundingSphere()` ignores the count, same as before).
- Verified live: switching to level 1 and typing a bead count rebuilds and
  auto-marks that level visible with no button click; toggling "Overwrite
  cluster radius" and changing its value rebuilds again immediately; merely
  switching the level dropdown to an unbuilt level 2, with no other control
  touched, correctly leaves it "(not built)" — confirmed no rebuild fires
  from the selector alone, matching the audited legacy behavior exactly.

129 tests still pass (no new pure-function surface — this is a
trigger/wiring change, verified live rather than unit-tested, consistent
with the rest of this panel).

### Phase 4 progress: recipe canvas (not a numbered item — the risk map's `RecipeCanvas.tsx` row)

**Flagged by an outside review, not the original checklist.** Items 1-8 were
each finished or explicitly deferred, but the migration plan's audit also
named the D3 force-directed/circle-packing hierarchy view — the app's
centerpiece visualization, `js/main.js`'s `update_graph`/`ticked` — as its
own high-risk risk-map row (`RecipeCanvas.tsx`, marked "Wrap"). It isn't in
the numbered 1-8 list, so finishing that list left it as a text-only
placeholder ("Recipe View" showed name/format/ingredient/compartment counts
only). Built once this gap was pointed out, rather than leaving it
undeclared.

**Same "native over wrap" deviation as `RecipeTable.tsx` and the PDB search
panels, for the same reason.** The risk map's literal instruction was "wrap
in a `RecipeCanvas` component that mounts a div/canvas ref and delegates to
the existing global functions" — but auditing `update_graph`/`ticked` first
(main.js:5565-5628, 3892-4042) showed the same conflict already found for
`grid_recipe`: drag-to-reparent in legacy's edit mode mutates the global D3
`graph` directly, and the whole rendering loop reads/writes `node_selected`,
`transform`, and simulation state as globals. Wrapping it as literally
specified would mean reintroducing that global in sync with `recipeStore`.
Built `RecipeCanvas.tsx` as a native React+SVG component driven by
`recipeStore` instead, using the npm `d3` package (not the bundled `extras`
D3 v4 global).

**What was ported**: `d3.hierarchy` + `d3.pack` circle-packing layout
(main.js:5576-5581 — confirmed via audit this is circle-packing, not a
node-link force graph: the force simulation only runs cosmetic collision
avoidance after `d3.pack` computes positions, main.js:2928-2935). Compartments
render as stroked rings, ingredients as filled circles nested inside,
weighted by `size` matching legacy's `.sum(d => d.size)`. Color: `data.color`
when set (the same `[r,g,b]` 0-1 float convention `colorPalette.ts` already
uses) or an ordinal depth scale otherwise. Click-to-select writes to
`recipeStore.selectNode` — the same seam `RecipeTable`/the PDB search panels
already use — so **canvas, table, and viewer selection now all stay in
sync** (verified live: clicking a circle highlights the matching `RecipeTable`
row). Basic zoom/pan via `d3.zoom` on the SVG's transform, since it's cheap
declaratively and legacy has it too (main.js:2957-2960).

**Deliberately not ported** (each named in the audit as its own, separable
slice): the collision-avoidance force simulation (cosmetic only — `d3.pack`
alone already yields a valid non-overlapping layout), drag-to-reparent
between compartments (mutates persistent recipe structure in legacy's edit
mode — a real feature, but a distinct one from visualization), sprite/
thumbnail image rendering (`drawThumbnailInCanvas`), curved compartment-name
labels (`drawCircularText` — an SVG `<title>` native tooltip stands in for
now), the many `colorNode` property-mapping color modes beyond
explicit-color/depth, and cross-panel highlight sync beyond the existing
`selectedNode` seam (e.g. NGL/Mol-star don't yet highlight the selected
residue back onto the canvas).

Verified: 4 new Vitest cases (`recipe-canvas.test.tsx` — empty state, one
circle per graph node, click-to-select, click-background-to-deselect;
`d3.pack`/`d3.zoom` both work fine under jsdom, no WebGL/canvas dependency
since it's pure SVG) plus a live-browser walkthrough (loaded HIV mature,
26 ingredients + 4 compartments → 30 circles rendered — screenshot-confirmed
nested circle-packing layout matching legacy's visual structure; clicked an
ingredient circle and confirmed the `RecipeTable` row highlighted in step;
scroll-zoomed and confirmed the SVG group's transform updated). Also
extracted a shared `nodeKey` helper (`domain/recipe/types.ts`) out of
`RecipeTable.tsx`, now used by both, since a `RecipeNode`'s identity has no
natural id field of its own for a React/d3 join key. New dependencies: `d3`,
`@types/d3`.

### Phase 4 progress: item 8 (remaining `util.js` utilities) — audited, left deferred

Audited `js/util.js` in full (every top-level function) against what items
1-7 actually needed, rather than batch-porting the file. Two findings:

- **The data-directory picker (`Util_selectFolder`, `js/util.js:417-431`,
  the "Setup Data Directory (PDB, geoms)" menu item) is correctly a
  placeholder, not an oversight.** It populates a global `pathList_` map
  (keyed by filename, from a `webkitdirectory` folder input) that legacy's
  NGL/Mol\*/grid code checks *before* falling back to a network fetch — its
  entire purpose is resolving the same custom, non-RCSB structure filenames
  (`"MA_matrix_G1.pdb"`, sprite PNGs, `.map` density files) that
  `isLikelyRcsbId` currently gates out with the "isn't wired up yet" message
  in `MolstarViewer.tsx`/`NglViewer.tsx`. So it's a real capability gap, not
  dead legacy weight — but it has no consumer in the new app yet: porting
  the file-input widget alone would just populate an unused map. It becomes
  a small, low-risk addition once/if local custom-structure loading is built
  into the Mol\*/NGL viewers as its own slice; building it first would be
  speculative. Left as-is (`menuConfig.ts:113`, already a documented
  placeholder leaf).
- **No other `util.js` helper is a batch-porting candidate.** The file
  splits cleanly into: DOM/jQuery glue with a native React/CSS equivalent
  (`Util_showCheckboxes`, `Util_SetupCollapsible`, `Util_ClientDetection`'s
  UA-sniffing), packing/geometry-engine math with no relation to any built
  UI feature (`Util_ComputeBounds`, `Util_halton`, `Util_getRadiusFromMW`,
  `Util_FixBeadsFormat`, etc.), and small standalone helpers (color
  conversions, base64/blob, download-a-file, gzip) that have no caller yet
  because the features that would call them (sprite/property coloring,
  cellPAINT zip export) are themselves still deferred. Pulling any of these
  in ahead of their feature would be dead code; each should come in with the
  feature that needs it.

### Resizable/dockable panel layout + design-token light/dark theme (user-directed, not in the numbered list)

**User feedback: panels were all fixed-size/fixed-position, and the color
theme was hard to read and didn't look good.** Both were real, not
perception — confirmed by reading the actual code first rather than assuming:
`TabbedPanel.tsx`'s own docstring already said "No drag/dock/reorder; that's
out of Phase 3 scope," `Workspace.tsx` sized panels via hardcoded
`nth-child` flex CSS keyed to DOM position, and `layoutStore.ts` only tracked
four show/hide booleans, nothing about size or position. The theme had no
shared tokens at all — `#333`/`#555`/`#666`/`#777`/`#ccc`/`#ddd` scattered
across ~10 CSS files doing overlapping jobs, no accent color anywhere (every
"active" state reused the same gray ramp), and a `color-scheme: light dark`
declaration that nothing in the app actually adapted to.

Asked the user to pick a direction for each, rather than guessing: for
layout, full docking (`dockview`) vs. resize-only (`react-resizable-panels`)
vs. skip; for theme, light-only vs. dark-only vs. both behind a toggle. They
chose full docking and "let me see both" for theme.

**De-risked the layout choice before committing to it.** This app runs two
always-on Mol-star plugin instances (`MolstarViewer.tsx`/`IngredientViewer.tsx`),
already documented elsewhere in this file as expensive/fragile to
reinitialize (StrictMode double-mount fights, a `Stage.dispose()` DOM-leak
fix). dockview's core premise is that dragging a panel moves its DOM node
rather than unmounting/remounting the hosted React component — but that's
a premise worth checking, not trusting, given that history. Built a
throwaway spike (`DockviewSpike.tsx`, deleted after) hosting both viewers
behind a mount-count probe, dragged repeatedly between dockview groups:
zero additional mounts, zero new WebGL contexts, zero console errors across
every drag variation tried. Confirmed safe before touching the real
`Workspace.tsx`.

**Layout, built on `dockview-react`:** replaced the fixed two-row flex
layout and hand-rolled `TabbedPanel.tsx` (deleted, along with `Panel.tsx`'s
title-bar wrapper — dockview renders its own tab/group chrome, so a second
title bar would double up) with one `DockviewReact` instance. Every former
"tab" (Mol-*, Sequence features, protvista, Topology, Uniprot mapping,
Ingredient Options, Object Properties, Recipe table, Interaction table,
Uniprot search table, PDB search table) is now an independently draggable,
resizable dockview panel that starts grouped with its former siblings,
instead of a button-row switching one visible child at a time. `layoutStore`'s
four booleans keep their exact existing interface (so `menuConfig.ts` and
the existing `layout-store.test.ts` needed no changes) but now drive
`dockview.addPanel`/`removePanel` instead of conditional JSX inclusion.

Native per-tab close ("x") is deliberately disabled everywhere
(`defaultTabComponent` always passes `hideClose`) — `layoutStore`/the
Layout Options menu remains the single source of truth for which togglable
panels exist. This sidesteps a real hazard: dockview's `onDidRemovePanel`
fires on an ordinary drag-move (remove from old group, add to new group) as
well as an actual close, so it can't cheaply distinguish "the user closed
this" from "the user is relocating this" — and legacy never had a per-tab
close control to begin with, so disabling it isn't a regression.

**Two real bugs found only by live measurement, not by reading dockview's
API docs:**

1. Panels added to an existing tab group become that group's *active* tab
   by default. Building the four-panel `sequenceFeatures` toggle group left
   the last-added panel ("Uniprot mapping") visible instead of the group's
   anchor ("Mol-*"). Fixed by passing `inactive: true` on every panel added
   by the toggle-group sync helper.
2. `initialWidth` on a directional split only reliably honors the
   *most-recently-added* panel in a chain of splits — verified with a
   Playwright probe reading actual rendered `getBoundingClientRect()` widths,
   twice, because the first two mental models were both wrong: giving the
   narrow "Recipe Options" rail an `initialWidth` as the *first* panel added
   left it at over 1000px while an unrelated, later-added panel kept its
   exact requested size; giving every panel in a 3-deep middle chain an
   explicit width pinned two of them at dockview's ~100px minimum instead.
   Settled on building the narrow rails (Recipe Options/Table Options)
   *last*, split off an already-placed panel — confirmed via the same probe
   that this reliably gives them their exact requested width — and leaving
   the middle content chain unconstrained so dockview auto-balances it
   evenly, which measured out close to a 4-way even split.

**Theme:** new `themeStore.ts` (zustand, `localStorage`-persisted with plain
`getItem`/`setItem` — matching this codebase's existing no-`persist`-
middleware style rather than introducing `zustand/middleware`) and
`src/styles/theme.css` defining CSS custom properties for both themes: a
neutral gray scale plus **one** consistent accent color used for every
active/selected state (active tab, selected table row, menu-item hover,
primary actions), replacing the old pattern of reusing the same
undifferentiated grays for both chrome and "this is active" signaling. A new
toggle button in `MenuBar.tsx` (right-aligned via a flex spacer) flips a
`data-theme` attribute on `<html>` (`AppShell.tsx` effect), which every
tokenized CSS file now reads via `var(--color-*)` instead of a hardcoded
literal: `MenuBar.css`, `Dialog.css`, `Panel.css`, `SearchPanel.css`,
`RecipeTable.css`, `IngredientOptions.css`, `RecipeCanvas.css`, `Viewer.css`.

dockview ships its own built-in theme objects (`themeLight`/`themeDark`,
imported from `dockview-react`) switched from the same store, so the docking
chrome (tab strips, group borders, drag overlays) matches whichever app
theme is active. First attempt passed `className="dockview-theme-light"` /
`"...-dark"` to `<DockviewReact>` — this compiles and looks plausible from
the CSS file's own class names, but does nothing, because dockview's actual
theme switch is a dedicated `theme` prop taking one of its exported
`DockviewTheme` objects; the class-name approach was only adding an inert
extra class to the outer container. Found by reading `DockviewOptions`'s
real type instead of trusting the guess, and confirmed fixed by checking the
rendered class list on the actual themed element (`.dv-shell`), not just the
outer wrapper.

**Disclosed, not silently skipped:** Mol-star's own UI skin
(`mol-plugin-ui/skin/light.scss`, imported directly by both viewer
components) does not follow this toggle. Its skin bakes colors into
component-level rules rather than exposing custom properties, so switching
it live is a separate, heavier follow-up, not something this toggle can
half-do safely — documented directly in `themeStore.ts`'s docstring so it's
a known, intentional boundary rather than a surprise regression report.

**Tests:** `smoke.test.tsx` renders `AppShell` in jsdom, which lacks
`ResizeObserver` and real layout measurement that dockview needs at
construction time — it threw immediately without a fix. Added a lightweight
`vi.mock('dockview-react', ...)` reproducing just the `addPanel`/
`removePanel`/`getPanel` surface `Workspace.tsx` actually calls: it tracks
which panel ids are currently "added" and renders each one's title text plus
its real content component, so the existing panel-presence and
Layout-Options-toggle-visibility assertions keep exercising real application
behavior (not the mock's own logic) instead of being deleted along with the
old fixed-layout implementation. 129 tests still pass (no new pure-function
surface — this is layout/wiring, verified live in a browser instead).

New dependency: `dockview-react` (pulls in `dockview`/`dockview-core`).

**Verified live in a browser**, beyond the automated test suite: all 15
panels present at initial load; dragging a split's resize handle actually
resizes it; dragging the "Mol-*" tab into a different dockview group
completes with zero console errors and the loaded structure intact (no
reload/flash); Layout Options "Hide/Show Sequence Feature" correctly
adds/removes exactly its four panels while leaving the "Mol-*" anchor
untouched; the theme toggle flips the app's own CSS tokens and dockview's
chrome together in the same click; the theme choice survives a page reload
(`localStorage`). Screenshot-confirmed both themes render as a coherent,
readable UI (light: white/light-gray panels with a blue accent; dark: dark
charcoal panels with a lighter blue accent), with the previously-flat,
undifferentiated gray chrome gone.

### Task-oriented workspace layout presets (user-directed, not in the numbered list)

**User feedback: every task started from the same one-size-fits-all
arrangement.** Wanted named presets that rearrange the workspace for what
the user is actually doing — recipe creation (compartments/ingredients +
PDB/UniProt search) vs. recipe curation (an existing ingredient's details +
sequence/domain features) — with future 2D/3D "painting" presets flagged as
out of scope for this pass but not architecturally precluded. Researched
first: confirmed legacy has zero precedent (`js/layout_mg.js` instantiates
exactly one Golden Layout config; a `toggleLayout(layoutId)` stub exists but
its body is entirely commented out) — genuinely new feature.

**Design, confirmed with the user**: keep the existing 4-boolean "Layout
Options" menu exactly as it was (still independently usable for manual
fine-tuning), add a new "Workspace" menu for whole-arrangement presets, and
persist the chosen preset like the theme already is. `layoutStore.ts` grew
one addition, `setVisibility(partial)`, so a preset can set several of the
four existing toggles atomically; `TOGGLE_GROUPS`/`syncGroupPanels` in
`Workspace.tsx` are otherwise untouched. A new `presetStore.ts` (zustand,
`localStorage`-persisted the same plain-`getItem`/`setItem` way
`themeStore.ts` already does) holds the current preset id.

**The 7 previously-hardcoded-always-on panels** (`recipeOptions`,
`recipeView`, `ingredientOptions`, `ingredientView`, `molstar`,
`tableOptions`, `recipeTable`) needed a real mechanism to become
preset-dependent, since only the 4 toggle groups could disappear before.
Replaced `Workspace.tsx`'s hardcoded `onReady` construction chain with a
`WORKSPACE_PRESETS: Record<PresetId, WorkspacePreset>` table (`default` —
today's exact prior arrangement, kept as an escape hatch back to "show
everything"; `recipeCreation`; `recipeCuration`) and an `applyPreset(api,
preset)` function that removes any core panel the new preset doesn't want,
adds any it does (reusing the same "narrow rails split off last" sizing
rule already learned the hard way for the default layout), and sets
`layoutStore`'s 4 booleans to the preset's chosen defaults — which the
*existing*, unmodified `TOGGLE_GROUPS` effect then reacts to on its own, so
there's no duplicated logic for those 4 groups.

**Two real bugs found only by cycling through presets live with a real
structure loaded — not by reading either dockview's docs or this file's own
prior "Mol-star is expensive to reinitialize" notes carefully enough the
first time:**

1. **A silent bead-data mutation from purely switching layouts.**
   `IngredientOptions.tsx`'s automatic LOD-rebuild effect (from the earlier
   "bead building made automatic" follow-up) fires once on every mount
   regardless of its dependency array — harmless when this panel was always
   mounted exactly once for the app's lifetime, but `recipeCreation` removes
   it and switching back re-adds it (a genuine unmount/remount, since it's
   not one of the two Mol-star-backed panels). Every remount was silently
   re-clustering and overwriting the selected ingredient's Level 0 bead data
   from freshly-reset default state, visibly replacing the ingredient's real
   structure with a plain bounding sphere. First fix attempt (a "consumed
   once" `useRef` flag skipping the first effect run) did *not* actually
   work — confirmed via added debug logging that React 19 StrictMode's
   dev-only double-invoke of effects (mount → effect → cleanup → effect
   again, synchronously, same ref) flips the flag on the first synthetic
   pass and no longer guards the second. Fixed properly by comparing
   against the *previous* values of the four watched inputs instead of a
   one-shot flag — a comparison-based guard is inherently robust to being
   invoked any number of times for the same underlying state, unlike a flag
   that gets consumed.
2. **`activatePanel` (making a sequence-feature tab the visible one in
   `recipeCuration`, instead of Mol-*) silently unmounted Mol-star's WebGL
   context anyway.** `recipeCuration`'s sequence-feature tabs share
   `molstar`'s dockview group (`TOGGLE_GROUPS`'s `sequenceFeatures` anchors
   there), so making one of those tabs active makes `molstar`'s own tab
   *inactive* — and dockview's default panel renderer is `'onlyWhenVisible'`
   (confirmed by reading `dockview-core`'s source earlier this same
   follow-up), meaning an inactive tab's content unmounts exactly like
   `removePanel` would have. Measured directly (`canvas` count on the page
   dropped from 2 to 1 the moment `recipeCuration` was applied) before
   trusting the "we never call `removePanel` on these two" reasoning was
   sufficient — it wasn't, since inactivity is a second, independent path to
   the same unmount. Fixed by setting `renderer: 'always'` specifically on
   `molstar`/`ingredientView` when `applyPreset` adds them, which keeps
   their content mounted regardless of active/visible tab state — closing
   this off structurally rather than just avoiding `activatePanel` combined
   with these two panels sharing a group, which the next preset to need
   both could easily reintroduce.

**Verified live in a browser** (dockview needs real layout measurement,
same as the rest of this panel): switched between all three presets and
confirmed each shows exactly its intended panel set; loaded a real structure
(`3hvt`) and cycled through all three presets five times in a row —
`canvas` count on the page stayed at exactly 2 throughout (one per
Mol-star-backed panel, confirming neither ever unmounted), zero new console
errors beyond the two pre-existing benign StrictMode warnings, and the
structure remained correctly rendered (not reset to a bounding sphere) in
the final screenshot; confirmed the "Layout Options" menu's 4 toggles still
independently show/hide their panels after a preset has been applied;
confirmed the chosen preset survives a page reload. 129 tests still pass
(no new pure-function surface — this is layout/wiring and a mount-lifecycle
bug fix, both verified live rather than unit-tested, consistent with the
rest of this panel).

### Follow-up: switching back to "Default" didn't actually restore the layout

**User-reported: applying "Recipe curation" and then switching to "Default
(all panels)" left the layout wrong**, not reset to the real default
arrangement. Reproduced first with a width/order probe (reading actual
`getBoundingClientRect()`s and tab text, not just eyeballing screenshots)
before touching any code, confirming two compounding bugs in `applyPreset`'s
original design:

1. **The "first panel in a preset's list needs no `position`" convention only
   holds on a truly empty grid.** That's only ever true the very first time
   `Workspace` ever mounts — after even one preset switch, the grid is never
   empty again (`molstar`/`ingredientView` persist forever by design). Every
   preset's list had `recipeView` or `ingredientView` first with no
   `position`, silently assuming "this becomes the row's root" — on a
   non-empty grid, an unpositioned `addPanel` call just drops the panel into
   whatever group happens to be active, which is how "Recipe View" ended up
   missing from its own column and doubled up as a stray tab elsewhere.
   Fixed by always listing `ingredientView` first with no `position` (it's
   the one core panel guaranteed to already exist after the first switch, by
   virtue of being in `NEVER_REMOVE`) and anchoring every other panel in
   every preset's list to it, directly or transitively — never assuming an
   empty canvas.
2. **`molstar`/`ingredientView` surviving a preset switch were only ever
   resized, never repositioned**, disclosed as a known simplification when
   this feature first shipped ("repositioning an already-mounted panel
   across presets is a possible future refinement") — the user's report is
   exactly that refinement turning out to be load-bearing, not optional.
   Fixed with dockview's `panel.api.group.api.moveTo(...)`, called whenever
   an existing core panel's target preset gives it a `position`. Moving the
   panel's *group* rather than the panel itself mattered: an initial attempt
   moving just the `molstar` panel relocated it alone and stranded its
   `sequenceFeatures` tab-mates (`seq`/`protvista`/`topo`/`uniprot`, sharing
   its group) behind as their own orphaned group — because `TOGGLE_GROUPS`
   only positions those tabs once, at add time, and never re-syncs them when
   their anchor later moves for an unrelated reason. Moving the whole group
   carries every tab in it along together, which is correct here since
   nothing besides a panel and its own toggle-group tabs ever shares a group
   in this app.

Used dockview's own exported `directionToPosition` helper (`dockview-core`'s
`dnd/droptarget.ts`) to convert between this file's `left`/`right`/`below`/
`within` vocabulary and dockview's `Position` type for `moveTo`, rather than
hand-rolling the same mapping `addPanel`'s `direction` already uses
internally.

**Verified live**: switching "Recipe curation" → "Default" now reproduces
the exact same tab order and pixel widths as the very first, freshly-loaded
"Default" state (confirmed via the same width/order probe, before vs. after
— identical down to the pixel). Re-ran the full mount-safety check from the
original follow-up on top of this fix: loaded a real structure, cycled
through all three presets 7 times, `canvas` count stayed at exactly 2
throughout, zero new console errors, structure still correctly rendered,
"Layout Options" manual toggle still independently works afterward. 129
tests still pass.

### Sequence Features panel: real Nightingale (ProtVista) integration, synced to Ingredient View

**User-directed**: replace the "Sequence features" placeholder with a real feature viewer,
built on Nightingale (`github.com/ebi-webcomponents/nightingale`) and synced to the existing
"Ingredient View" Mol-star instance. Researched before building, not assumed: confirmed via
npm registry + GitHub that `@nightingale-elements/*` (not the older unscoped `protvista-*`
packages) is EBI's actively-maintained continuation of ProtVista — `uniprot.org`'s own live
feature-viewer page is itself assembled from `@nightingale-elements/*` components.

**Superseded by a follow-up correction — now `protvista-uniprot`, not hand-rolled low-level
tracks.** The first build above hand-assembled the panel directly on
`nightingale-sequence`/`nightingale-track`/`nightingale-manager`, flattening every UniProt
feature into one overlapping track row and only recognizing old-style type codes for coloring —
the user compared it against UniProt's real reference feature-viewer page (categorized accordion
sidebar: "Domains & sites," "PTM," "Structural features," etc., each colored and grouped) and it
didn't match; most modern feature-type strings rendered as unreadable black marks with no
grouping, confirmed live. Investigation found the reference page is rendered by
`protvista-uniprot` (`github.com/ebi-webcomponents/protvista-uniprot`, npm package last published
days before this correction) — a self-contained widget that takes just an `accession` and does
its own fetching/categorization/coloring. This reverses part of the original design decision
above: `@nightingale-elements/*` is still the actively-maintained low-level family, but the
unscoped `protvista-*` name isn't uniformly stale — `protvista-uniprot` itself is the real,
current thing, just built one layer up on top of `@nightingale-elements/*` internally.

Two things were verified by reading the actually-installed/packed source before installing, not
assumed: (1) `protvista-uniprot`'s `nostructure` prop gates whether its own embedded structure
sub-component (`@nightingale-elements/nightingale-structure`, its own bundled Mol-star) is ever
inserted into the render tree at all — confirmed via its Lit `render()` method's conditional, so
no insertion means no `connectedCallback`, means no Mol-star ever instantiated, not just hidden;
this is the same "avoid a third, version-mismatched Mol-star" concern the original design solved
by avoiding `nightingale-structure` directly, just satisfied through `protvista-uniprot`'s own
opt-out instead. (2) `protvista-uniprot`'s internal categorized tracks
(`nightingale-track-canvas` elements) dispatch the exact same `"change"` `CustomEvent` contract
(`detail: {eventType, feature}`, via the shared `createEvent` helper in
`@nightingale-elements/nightingale-new-core`, confirmed against its installed `bindEvents.ts`)
that the existing Mol-star sync bridge (`residueHighlight.ts`) already listens for — so the
bridge logic didn't need to change, only what renders above it.

This was a user-confirmed tradeoff, not unilateral: presented as a choice between the heavier
dependency (~10 more `@nightingale-elements/*` sub-packages pulled in transitively, plus a global
`<style>` injection into `<head>` since `protvista-uniprot` deliberately avoids shadow DOM — "we
are not using shadowDOM because of Mol*," per its own source comment) versus hand-rolling a
type→color→category mapping in-house; user chose to install `protvista-uniprot`.

`npm install protvista-uniprot`; removed the now-redundant direct dependencies
`@nightingale-elements/nightingale-sequence`/`nightingale-track`/`nightingale-manager`
(`protvista-uniprot` bundles its own copies internally). `uniprotFeatures.ts` (the manual
`rest.uniprot.org/uniprotkb/{accession}.json` fetch module described above) is now dead code —
deleted, along with its test (`uniprot-features.test.ts`); nothing else imported either.
`SequenceFeaturesPanel.tsx` now renders `<protvista-uniprot key={accession} accession={accession}
nostructure />` inside a wrapper div, with a single `"change"` listener on that div (not
shadow-DOM-scoped, since `protvista-uniprot` uses light DOM) bridging to the same
`highlightResidueRange`/`clearResidueHighlight` functions as before — the sync bridge itself is
unchanged. `SequenceFeaturesPanel.css` simplified to just `protvista-uniprot { display: block;
width: 100%; }` (no more per-element Nightingale selectors).

**This app's first Web Component integration** — confirmed by reading the actually-installed
package's own bundled source rather than trusting documentation. `src/types/nightingale.d.ts` now
types a single tag, `<protvista-uniprot accession nostructure notooltip>`, via
`declare module 'react' { namespace JSX { interface IntrinsicElements {...} } }`.
`accession`/`nostructure`/`notooltip` are declared `reflect: true` properties (confirmed by
reading `protvista-uniprot.ts`'s `static get properties()`), meaning they're also real HTML
attributes Lit keeps in sync — so plain JSX attributes work directly, unlike the old
`nightingale-track`'s `data`/`sequence`, which held non-attribute-serializable data and needed
imperative property assignment via a ref.

**Residue-numbering caveat, disclosed in the UI, not just in code**: maps UniProt sequence
position directly onto the structure's `auth_seq_id` (not `label_seq_id`, which always starts
at 1 and would be wrong by a construct's start offset whenever a modeled fragment doesn't begin
at UniProt residue 1). `auth_seq_id` is frequently set by depositors to match UniProt numbering
for straightforward, tag-free entries, so this is often correct in practice but not guaranteed —
a visible note renders in the panel itself. Legacy's `mapping[uniprot][chain]` (a SIFTS-style
mapping) was apparently pre-baked into recipe JSON at authoring time, not computed live, so
porting it isn't shovel-ready; a real SIFTS/PDBe-mappings lookup is a separate, unattempted v2.

**Sync is one-way for v1** (Nightingale feature click/hover → Mol-star highlight only),
matching an existing precedent in this codebase (`MolstarViewer.tsx`'s own docstring already
scopes out "bidirectional highlight sync" for a structurally similar gap).

**Tab cleanup, confirmed with the user**: removed the now-redundant "protvista" placeholder tab
entirely (Nightingale *is* the modern ProtVista, so a separate tab pointing at the same library
would read as duplicated functionality). "Topology"/"Uniprot mapping" remain untouched
placeholders — RCSB's separate, non-Nightingale PDB Component Library, out of scope here.

**Two real things found only by testing live, not from documentation:**

1. **`smoke.test.tsx` broke immediately** — jsdom has no `ResizeObserver`, and Nightingale's
   `withResizable` mixin references it eagerly as soon as the custom elements are defined (the
   side-effect imports in `SequenceFeaturesPanel.tsx` run at module load, before any component
   even mounts). Fixed with a minimal no-op `ResizeObserver` polyfill in `vitest.setup.ts` — a
   standard, low-risk fix for this exact gap, different from how dockview's mock works
   elsewhere in this same file (dockview needs *real* layout measurement jsdom can't provide at
   all, so that one mocks the whole library; Nightingale's elements just need to not throw on
   mount, so a polyfill is enough).
2. **The first real test ingredient picked (`LDHA` from `data/exosome_catalase.json`) silently
   showed "no UniProt accession"** despite the file visibly containing `"uniprot": "P00338"` —
   turned out that value lives at `LDHA.source.uniprot`, while the ingredient's *own* top-level
   `uniprot` field (what the parser actually reads, and what `UniprotSearchPanel.tsx`'s "Apply"
   button writes) is empty for this specific ingredient — a pre-existing inconsistency in that
   source file, not a bug in this feature. Switched to `ALB` (top-level `uniprot: "P02768"`,
   matching its `source.uniprot`) for verification instead.

**Dockview width bug found during the correction's live verification, fixed**: the default
column width for the shared "Mol-*"/"Sequence features" dockview group (236px in both the
`default` and `recipeCuration` `WORKSPACE_PRESETS` entries) was far too narrow for
`protvista-uniprot`'s categorized accordion + tracks to render legibly at all — confirmed
functional from ~420px up, unusable below, via live width probing. Fixed by adding
`initialWidth: 480` to the `molstar` panel entry in both presets (`Workspace.tsx`). 480 was
chosen empirically to balance legibility against not starving the neighboring
`ingredientOptions`/`ingredientView` panels into dockview's tab-overflow dropdown on a common
~1440px-wide window — an initial attempt at 700 looked fine on a wide 1800px window but visibly
starved those neighbors at 1440px, found live by testing both widths, not assumed.

**Verified live in a browser (re-verified after the correction)**: selected `ALB` (real
accession P02768) in the Recipe table. Initial headless-Chromium (Playwright) verification
showed the panel stuck permanently in a loading state with zero data — root cause, confirmed via
a curl A/B test, is that EBI's legacy Proteins API (`www.ebi.ac.uk/proteins/api/*`, which several
of `protvista-uniprot`'s categories fetch from) silently hangs (no response, no error) any
request whose User-Agent string contains "HeadlessChrome"; an otherwise-identical request with
that substring stripped from the UA returns instantly. This is server-side bot detection on
EBI's end, unrelated to the app or to real users (whose browsers don't send "HeadlessChrome") —
an environment quirk of the verification setup, not an app bug. Re-verified with a Playwright
browser context using a realistic Chrome UA override: full correct rendering of the real
categorized accordion (Molecule processing, Sequence information, Domains, Sites, PTM, Epitopes,
Antigenic sequences, Mutagenesis, Variants, Proteomics, PDBe 3D structure coverage,
AlphaMissense), correct per-type coloring (e.g. Domain = the reference's blue `#9999FF`), and,
via a synthetic `"change"` event dispatched directly on a `nightingale-track-canvas` element
(bypassing canvas-coordinate-click flakiness), confirmed the Mol-star highlight bridge still
fires correctly with zero console errors. Canvas count stayed at exactly 2 real WebGL contexts
throughout (11 additional lightweight 2D `<canvas>` elements appeared, one per
`protvista-uniprot` track row — expected and harmless, not a regression of the "avoid a second
Mol-star" invariant). Confirmed both guard paths (no ingredient selected; ingredient with no
UniProt accession) still show the right message with no errors.

New dependency: `protvista-uniprot` (replacing the three `@nightingale-elements/*` direct
dependencies above, which it now bundles internally). `npm run typecheck`/`npm run lint` clean.
129/129 tests pass (19 files) — down from 135/135 (6 new) in the original build, reflecting the
deletion of `uniprotFeatures.ts` and `uniprot-features.test.ts` as dead code.

### Known gaps in the Phase 2 data layer (carry into Phase 4, don't assume covered)

- `helper_getFiberIngredientDescription` (legacy fiber-description lookup enrichment,
  depends on a server-fetched dictionary + fuzzy string matching) is intentionally not
  ported — see the docstring in `domain/recipe/parseLegacyRecipe.ts`.
- Ingredients that pack extra cellPACK-gpu-specific fields without listing them in a
  `custom_data` array (e.g. `data/Mpn_1.0_2.json`'s DNA/mRNA/peptide fibers — `uLength`,
  `walkingMode`, `partners_position`, ...) lose those fields on parse, matching legacy
  `OneIngredient`'s identical limitation. Only fields modeled on `IngredientData` round-trip.
- `domain/files/loadFile.ts` / `saveFile.ts` / `zipExport.ts` (DOM wiring for the CSV/JSON/zip
  save-download and file-picker load flows) don't exist yet — `csv.ts`/`serializeRecipe.ts`
  only produce strings/objects. That wiring is Phase 4 UI work.

## Ground rules carried over from the migration plan

- **Don't touch `/` in production.** The legacy app owns the production root
  path, including every existing shared recipe link
  (`?recipe=`, `?recipe_url=`, `?recipe_json=`, `?recipe_format=`), for the
  entire migration. The modern app deploys to a subpath or staging URL until
  an explicit cutover decision — that decision is out of scope for any single
  phase and needs its own sign-off.
- **Data examples are not duplicated.** `data/examples.ts` (Phase 4) will
  reference the existing top-level `../../data/*.json` files directly, not
  copies.
- **Wrap before you rewrite.** NGL, Mol*, SlickGrid, Golden Layout, and
  ProtVista integrations are wrapped in thin React components that call the
  existing legacy global functions — see the risk map in the migration plan
  for which modules are "migrate now" (pure data transforms: recipe
  parsing/serialization, color/molarity import-export, CSV) vs. "wrap"
  (anything DOM/canvas/third-party-viewer-stateful).
