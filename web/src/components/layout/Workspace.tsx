import { useEffect, useRef, useState } from 'react'
import {
  DockviewReact,
  DockviewDefaultTab,
  themeLight,
  themeDark,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelHeaderProps,
} from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'
import { useLayoutStore, type LayoutToggle } from '../../state/layoutStore'
import { useThemeStore } from '../../state/themeStore'
import { useRecipeStore, useRecipeSummary } from '../../state/recipeStore'
import { MolstarViewer } from '../pdb/MolstarViewer'
import { IngredientViewer } from '../pdb/IngredientViewer'
import { IngredientOptions } from '../pdb/IngredientOptions'
import { PdbSearchPanel } from '../pdb/PdbSearchPanel'
import { UniprotSearchPanel } from '../pdb/UniprotSearchPanel'
import { RecipeCanvas } from '../recipe/RecipeCanvas'
import { RecipeTable } from '../recipe/RecipeTable'
import './Panel.css'
import './Workspace.css'

/**
 * Panel arrangement ported from the legacy Golden Layout config
 * (js/layout_mg.js:config_light — the only config actually instantiated;
 * `config` is dead code, never passed to `new GoldenLayout(...)`), now built
 * on `dockview` (`dockview-react`) instead of the earlier fixed-flex +
 * `TabbedPanel` recreation — that had no resize/drag at all (Phase 3's
 * explicit, documented scope cut). Confirmed live with a throwaway spike
 * before committing to this rewrite: dragging a panel between dockview
 * groups moves its DOM node rather than unmounting/remounting the React
 * component (checked with a mount-count probe on both Mol-star panels
 * across repeated drags — zero extra mounts, no new WebGL context, no
 * errors), which matters because this app hosts two live Mol-star plugin
 * instances that are expensive/fragile to reinitialize (see
 * `IngredientViewer.tsx`/`MolstarViewer.tsx`'s own docstrings on that
 * fragility). See `web/README-modernization.md`'s "resizable/dockable
 * panel layout" section for the full investigation.
 *
 * Every previous `TabbedPanel` "stack" (Golden Layout tab group) is now
 * built from dockview's own native grouping — each tab is a genuinely
 * independent, draggable dockview panel that happens to start grouped with
 * its siblings, rather than a hand-rolled button-row switching a single
 * visible child. Users can drag any tab into its own group, resize any
 * split, or regroup tabs freely; there is no separate "resize"/"move" mode.
 *
 * Native per-tab close (the small "x") is intentionally disabled
 * (`defaultTabComponent` below always passes `hideClose`) — `layoutStore`'s
 * four booleans remain the single source of truth for which of the
 * togglable panels exist, driven only by the "Layout Options" menu, exactly
 * matching legacy (which also had no per-tab close button, only that menu).
 * This sidesteps a real two-way-sync hazard: dockview's `onDidRemovePanel`
 * fires on every *move* as well as an actual close (a panel is removed from
 * its old group and re-added to the new one during a drag), so it can't be
 * used to distinguish "user closed this" from "user is relocating this"
 * without extra bookkeeping — not worth it for a control legacy never had.
 *
 * "Recipe table" is a native React table over `recipeStore`
 * (`RecipeTable.tsx`), not a wrap of the legacy SlickGrid `grid_recipe`: that
 * grid's cell-edit/delete write into the legacy global D3 `graph`, and
 * reintroducing that global just to reuse the grid would undo the point of
 * `recipeStore`. See `RecipeTable.tsx`'s docstring for the full reasoning.
 *
 * "Recipe View" mounts `RecipeCanvas.tsx`, a native D3-circle-packing
 * reimplementation of legacy's `update_graph`/canvas hierarchy view — same
 * "native over wrap" reasoning as the table, since that canvas also mutates
 * the legacy global `graph` directly (drag-to-reparent). Clicking a node
 * there sets `recipeStore.selectedNode` too, so canvas/table/viewer
 * selection stay in sync. See `RecipeCanvas.tsx`'s docstring for scope.
 *
 * "Uniprot search table"/"PDB search table" are real too
 * (`UniprotSearchPanel.tsx`/`PdbSearchPanel.tsx`) — not wraps of
 * `grid_uniprot`/`grid_pdb` either, since they call PDB/UniProt's *current*
 * search APIs rather than legacy's `queryPDBfromName`/`queryUniportKBfromName`,
 * whose target endpoints are confirmed dead (see domain/pdb/pdbSearch.ts's
 * docstring). Selecting a row in "Recipe table" sets `recipeStore.selectedNode`
 * (the modern `node_selected`); a search result's "Apply" button writes the
 * pick back onto it.
 *
 * "Mol-*" mounts `MolstarViewer.tsx`, confirmed with the user to use the
 * current `molstar` npm package rather than legacy's bundled
 * `extras/molstar/` (see the migration plan's Phase 4 item 5 note). Scope is
 * intentionally narrow: selecting an ingredient with a PDB id loads that
 * structure. This is a SEPARATE Mol-star plugin instance from "Ingredient
 * View" below, deliberately kept apart and left otherwise unchanged — it's
 * reserved for a later phase (loading a full packed cellPACK results file,
 * legacy's `MS_LoadModel`), not per-ingredient reference structures.
 *
 * "NGL Options"/"NGL View" were renamed to "Ingredient Options"/"Ingredient
 * View" and rebuilt on Mol-star instead of NGL — see `IngredientOptions.tsx`/
 * `IngredientViewer.tsx` for that scope.
 *
 * "Sequence features"/"protvista"/"Topology"/"Uniprot mapping" (ProtVista +
 * PDB Component Library) and "Object Properties" remain placeholders; those
 * libraries didn't have a clear npm-package answer in the viewer-mount
 * investigation and need their own follow-up.
 *
 * dockview's own theme (`dockview-theme-light`/`dockview-theme-dark`) is
 * driven by the same `themeStore` as the rest of the app's CSS custom
 * properties, so the docking chrome (tab strips, group borders, drag
 * overlays) matches whichever theme is active. Mol-star's own UI skin does
 * NOT follow this — see `themeStore.ts`'s docstring for why that's a
 * disclosed, separate follow-up rather than a silent gap.
 */

type PanelId =
  | 'recipeOptions'
  | 'recipeView'
  | 'ingredientOptions'
  | 'objectProperties'
  | 'ingredientView'
  | 'molstar'
  | 'seq'
  | 'protvista'
  | 'topo'
  | 'uniprot'
  | 'tableOptions'
  | 'recipeTable'
  | 'interactionTable'
  | 'uniprotSearch'
  | 'pdbSearch'

function RecipeOptionsPanel() {
  return <div className="panel-body">Phase 4: wraps the canvas view option controls.</div>
}

function RecipeViewPanel() {
  const summary = useRecipeSummary()
  const loading = useRecipeStore((s) => s.loading)
  return (
    <div className="panel-body">
      {loading && <p>Loading…</p>}
      {!loading && summary && (
        <dl className="recipe-summary">
          <dt>Name</dt>
          <dd>{summary.name}</dd>
          <dt>Format</dt>
          <dd>{summary.format}</dd>
          <dt>Ingredients</dt>
          <dd>{summary.ingredientCount}</dd>
          <dt>Compartments</dt>
          <dd>{summary.compartmentCount}</dd>
        </dl>
      )}
      {!loading && <RecipeCanvas />}
    </div>
  )
}

function IngredientOptionsPanel() {
  return (
    <div className="panel-body">
      <IngredientOptions />
    </div>
  )
}

function ObjectPropertiesPanel() {
  return <div className="panel-body">Phase 4: wraps the ingredient property editor.</div>
}

function IngredientViewPanel() {
  return (
    <div className="panel-body">
      <IngredientViewer />
    </div>
  )
}

function MolstarPanel() {
  return (
    <div className="panel-body">
      <MolstarViewer />
    </div>
  )
}

function SeqFeaturesPanel() {
  return <div className="panel-body">Phase 4: wraps js/pfv_util.js / PDB Component Library sequence viewer.</div>
}

function ProtVistaPanel() {
  return <div className="panel-body">Phase 4: wraps the ProtVista feature viewer.</div>
}

function TopologyPanel() {
  return <div className="panel-body">Phase 4: wraps the PDB Component Library topology viewer.</div>
}

function UniprotMappingPanel() {
  return <div className="panel-body">Phase 4: wraps the PDB Component Library UniProt viewer.</div>
}

function TableOptionsPanel() {
  return <div className="panel-body">Phase 4: wraps the options for the selected grid.</div>
}

function RecipeTablePanel() {
  return (
    <div className="panel-body">
      <RecipeTable />
    </div>
  )
}

function InteractionTablePanel() {
  return <div className="panel-body">Phase 4: wraps the SlickGrid `grid_interaction` table.</div>
}

function UniprotSearchTablePanel() {
  return (
    <div className="panel-body">
      <UniprotSearchPanel />
    </div>
  )
}

function PdbSearchTablePanel() {
  return (
    <div className="panel-body">
      <PdbSearchPanel />
    </div>
  )
}

const components: Record<PanelId, React.FunctionComponent> = {
  recipeOptions: RecipeOptionsPanel,
  recipeView: RecipeViewPanel,
  ingredientOptions: IngredientOptionsPanel,
  objectProperties: ObjectPropertiesPanel,
  ingredientView: IngredientViewPanel,
  molstar: MolstarPanel,
  seq: SeqFeaturesPanel,
  protvista: ProtVistaPanel,
  topo: TopologyPanel,
  uniprot: UniprotMappingPanel,
  tableOptions: TableOptionsPanel,
  recipeTable: RecipeTablePanel,
  interactionTable: InteractionTablePanel,
  uniprotSearch: UniprotSearchTablePanel,
  pdbSearch: PdbSearchTablePanel,
}

/** Disables the per-tab close "x" for every panel — see this file's docstring for why. */
function NoCloseTab(props: IDockviewPanelHeaderProps) {
  return <DockviewDefaultTab {...props} hideClose />
}

interface GroupPanelSpec {
  id: PanelId
  title: string
}

/** The four Layout Options-gated groups, each docked as tabs alongside a permanent anchor panel. */
const TOGGLE_GROUPS: { flag: LayoutToggle; anchor: PanelId; panels: GroupPanelSpec[] }[] = [
  {
    flag: 'objectProperties',
    anchor: 'ingredientOptions',
    panels: [{ id: 'objectProperties', title: 'Object Properties' }],
  },
  {
    flag: 'sequenceFeatures',
    anchor: 'molstar',
    panels: [
      { id: 'seq', title: 'Sequence features' },
      { id: 'protvista', title: 'protvista' },
      { id: 'topo', title: 'Topology' },
      { id: 'uniprot', title: 'Uniprot mapping' },
    ],
  },
  {
    flag: 'interactionTable',
    anchor: 'recipeTable',
    panels: [{ id: 'interactionTable', title: 'Interaction table' }],
  },
  {
    flag: 'searchTable',
    anchor: 'recipeTable',
    panels: [
      { id: 'uniprotSearch', title: 'Uniprot search table' },
      { id: 'pdbSearch', title: 'PDB search table' },
    ],
  },
]

function syncGroupPanels(api: DockviewApi, visible: boolean, anchor: PanelId, panels: GroupPanelSpec[]) {
  for (const panel of panels) {
    const existing = api.getPanel(panel.id)
    if (visible && !existing) {
      // `inactive: true` — without it, each newly-added tab steals focus from the group's
      // anchor panel (found live: adding all four `sequenceFeatures` tabs left the *last*
      // one, "Uniprot mapping," active instead of the anchor "Mol-*").
      api.addPanel({
        id: panel.id,
        component: panel.id,
        title: panel.title,
        position: { referencePanel: anchor, direction: 'within' },
        inactive: true,
      })
    } else if (!visible && existing) {
      api.removePanel(existing)
    }
  }
}

export function Workspace() {
  const layout = useLayoutStore()
  const theme = useThemeStore((s) => s.theme)
  const [api, setApi] = useState<DockviewApi | null>(null)
  const apiRef = useRef<DockviewApi | null>(null)

  const onReady = (event: DockviewReadyEvent) => {
    const { api } = event
    apiRef.current = api

    // Built widest-content-first, narrow rails split off *last* — dockview's directional
    // split allocates the newly-added panel's exact `initialWidth`/`initialHeight` and
    // shrinks whatever it split from, so a panel added early in a chain gets squeezed by
    // every later split in the same row (found live: adding the narrow "Recipe Options"
    // rail *first* made every later split eat into it unpredictably, leaving the middle
    // columns pinned at dockview's ~100px minimum while a later, unrelated panel kept its
    // exact requested size). Adding the rails last, split off an already-placed content
    // panel, gives them their exact requested width reliably. Still just a starting
    // point — every size here is freely user-adjustable afterward.
    // Deliberately no `initialWidth` on this middle chain — dockview's directional split
    // re-divides whatever's already there rather than honoring a fixed pixel request for
    // more than the most-recently-added panel in a chain (found live), so fighting it with
    // manual pixel guesses for 3+ chained splits produced a worse result (two columns
    // pinned at the ~100px minimum) than just letting it auto-balance evenly.
    const recipeView = api.addPanel({ id: 'recipeView', component: 'recipeView', title: 'Recipe View' })
    const ingredientOptions = api.addPanel({
      id: 'ingredientOptions',
      component: 'ingredientOptions',
      title: 'Ingredient Options',
      position: { referencePanel: recipeView, direction: 'right' },
    })
    const ingredientView = api.addPanel({
      id: 'ingredientView',
      component: 'ingredientView',
      title: 'Ingredient View',
      position: { referencePanel: ingredientOptions, direction: 'right' },
    })
    api.addPanel({
      id: 'molstar',
      component: 'molstar',
      title: 'Mol-*',
      position: { referencePanel: ingredientView, direction: 'right' },
    })
    api.addPanel({
      id: 'recipeOptions',
      component: 'recipeOptions',
      title: 'Recipe Options',
      initialWidth: 160,
      position: { referencePanel: recipeView, direction: 'left' },
    })

    const recipeTable = api.addPanel({
      id: 'recipeTable',
      component: 'recipeTable',
      title: 'Recipe table',
      initialHeight: 260,
      position: { direction: 'below' },
    })
    api.addPanel({
      id: 'tableOptions',
      component: 'tableOptions',
      title: 'Table Options',
      initialWidth: 160,
      position: { referencePanel: recipeTable, direction: 'left' },
    })

    for (const group of TOGGLE_GROUPS) {
      syncGroupPanels(api, layout[group.flag], group.anchor, group.panels)
    }

    setApi(api)
  }

  // Layout Options toggles are the single source of truth for which togglable panels
  // exist — see this file's docstring for why dockview's native tab close is disabled
  // instead of the alternative (syncing `layoutStore` off `onDidRemovePanel`, which also
  // fires on ordinary drag-moves, not just closes).
  useEffect(() => {
    if (!api) return
    for (const group of TOGGLE_GROUPS) {
      syncGroupPanels(api, layout[group.flag], group.anchor, group.panels)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, layout.objectProperties, layout.sequenceFeatures, layout.interactionTable, layout.searchTable])

  return (
    <div className="workspace">
      <DockviewReact components={components} defaultTabComponent={NoCloseTab} onReady={onReady} theme={theme === 'dark' ? themeDark : themeLight} />
    </div>
  )
}
