import { useEffect, useState } from 'react'
import {
  DockviewReact,
  DockviewDefaultTab,
  themeLight,
  themeDark,
  directionToPosition,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelHeaderProps,
  type IDockviewPanel,
} from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'
import { useLayoutStore, type LayoutToggle, type LayoutVisibility } from '../../state/layoutStore'
import { useThemeStore } from '../../state/themeStore'
import { usePresetStore, type PresetId } from '../../state/presetStore'
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
 *
 * **Workspace presets** (`WORKSPACE_PRESETS`/`applyPreset`, `presetStore.ts`,
 * a "Workspace" menu group in `menuConfig.ts`) are a whole-arrangement
 * switch layered on top of everything above — "I'm doing recipe creation
 * now" rearranges which of the 7 previously-always-on core panels
 * (`recipeOptions`/`recipeView`/`ingredientOptions`/`ingredientView`/
 * `molstar`/`tableOptions`/`recipeTable`) exist and how big they are, plus
 * sets sensible defaults for the 4 `layoutStore` toggles above. `molstar`
 * and `ingredientView` are the two Mol-star-backed panels (real WebGL
 * contexts) and are NEVER removed by a preset, only resized — dockview's
 * default panel renderer is `'onlyWhenVisible'` (confirmed by reading
 * `dockview-core`'s source), meaning even making one an inactive tab would
 * unmount it, so "de-emphasize" always means "shrink," never "hide," for
 * these two specifically. Every other core panel is cheap and freely
 * removable, same as the 4 toggle groups already are. See this file's
 * `WORKSPACE_PRESETS` table and `web/README-modernization.md`'s "workspace
 * layout presets" section for the full design and the panel-mapping
 * rationale per preset.
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

/** The 7 panels a workspace preset controls directly (everything else belongs to `TOGGLE_GROUPS`). */
type CorePanelId = 'recipeOptions' | 'recipeView' | 'ingredientOptions' | 'ingredientView' | 'molstar' | 'tableOptions' | 'recipeTable'

const CORE_PANEL_IDS: CorePanelId[] = ['recipeOptions', 'recipeView', 'ingredientOptions', 'ingredientView', 'molstar', 'tableOptions', 'recipeTable']

/**
 * `molstar`/`ingredientView` are real WebGL contexts (see this file's docstring) — a preset
 * may shrink them but must never remove them. Every other core panel is a cheap
 * placeholder/native React component, freely removable/re-addable.
 */
const NEVER_REMOVE: ReadonlySet<CorePanelId> = new Set(['molstar', 'ingredientView'])

type PlacementDirection = 'left' | 'right' | 'below' | 'within'

interface CorePanelPlacement {
  id: CorePanelId
  title: string
  /**
   * Omitted only for `ingredientView`'s own entry — it is the one core panel a preset never
   * repositions (see `applyPreset`'s docstring for why one fixed, always-present anchor is
   * required). Every other panel must reference `ingredientView` or a panel placed earlier in
   * the same preset's list — never assume "first in the list = starts as the grid root," which
   * is only true the very first time the workspace ever mounts (found live: it broke every
   * later switch back to a preset once the grid already had other panels in it).
   */
  position?: { referencePanel?: CorePanelId; direction: PlacementDirection }
  initialWidth?: number
  initialHeight?: number
}

interface WorkspacePreset {
  id: PresetId
  label: string
  /** Ordered; a `CorePanelId` not listed here is fully removed (except `NEVER_REMOVE` members). */
  panels: CorePanelPlacement[]
  /** Applied to `layoutStore` as part of switching to this preset — see `setVisibility`. */
  layoutToggles: LayoutVisibility
  /**
   * Makes a specific toggle-group tab active instead of its anchor once the switch settles —
   * needed because `sequenceFeatures`'s tabs share `molstar`'s column/group (see
   * `TOGGLE_GROUPS`), so a preset that wants those tabs to be the visible focus (not Mol-*)
   * has no other way to express that without resizing `molstar` down to nothing, which would
   * also shrink the tabs sharing its column.
   */
  activatePanel?: PanelId
}

/**
 * `ingredientView` is *always* listed first, with no `position` — every preset's list is
 * built as if starting from an empty grid with `ingredientView` as the sole occupant, then
 * everything else placed relative to it (or to a panel placed earlier in the same list). This
 * isn't just a style choice: `ingredientView` is the one core panel guaranteed to already
 * exist (it's in `NEVER_REMOVE`) by the time any preset *other than the very first one ever
 * applied* runs, so anchoring every other placement to it (directly or transitively) is the
 * only way a preset's arrangement is reproducible regardless of which preset ran before it.
 *
 * Sizing follows the empirically-learned rule documented in `applyPreset`/below: only the
 * most-recently-added panel in a split chain reliably keeps its exact requested
 * `initialWidth`/`initialHeight`, so narrow "rail" panels are always placed *last*, split off
 * an already-placed panel.
 */
const WORKSPACE_PRESETS: Record<PresetId, WorkspacePreset> = {
  default: {
    id: 'default',
    label: 'Default (all panels)',
    panels: [
      { id: 'ingredientView', title: 'Ingredient View' },
      { id: 'ingredientOptions', title: 'Ingredient Options', position: { referencePanel: 'ingredientView', direction: 'left' } },
      { id: 'recipeView', title: 'Recipe View', position: { referencePanel: 'ingredientOptions', direction: 'left' } },
      { id: 'molstar', title: 'Mol-*', position: { referencePanel: 'ingredientView', direction: 'right' } },
      { id: 'recipeOptions', title: 'Recipe Options', initialWidth: 160, position: { referencePanel: 'recipeView', direction: 'left' } },
      { id: 'recipeTable', title: 'Recipe table', initialHeight: 260, position: { direction: 'below' } },
      { id: 'tableOptions', title: 'Table Options', initialWidth: 160, position: { referencePanel: 'recipeTable', direction: 'left' } },
    ],
    layoutToggles: { sequenceFeatures: true, objectProperties: true, interactionTable: true, searchTable: true },
  },
  // Recipe creation: building compartments/ingredients and finding structures for them.
  // Emphasizes Recipe Options/View/Table + PDB/UniProt search; de-emphasizes the
  // per-ingredient detail panels (nothing is being curated yet). `ingredientOptions` is
  // omitted entirely (cheap, no cost to removing it) — `molstar`/`ingredientView` stay
  // present but shrunk, since they can't be removed.
  recipeCreation: {
    id: 'recipeCreation',
    label: 'Recipe creation',
    panels: [
      { id: 'ingredientView', title: 'Ingredient View', initialWidth: 200 },
      { id: 'molstar', title: 'Mol-*', initialWidth: 200, position: { referencePanel: 'ingredientView', direction: 'right' } },
      { id: 'recipeView', title: 'Recipe View', position: { referencePanel: 'ingredientView', direction: 'left' } },
      { id: 'recipeOptions', title: 'Recipe Options', initialWidth: 160, position: { referencePanel: 'recipeView', direction: 'left' } },
      { id: 'recipeTable', title: 'Recipe table', initialHeight: 260, position: { direction: 'below' } },
      { id: 'tableOptions', title: 'Table Options', initialWidth: 160, position: { referencePanel: 'recipeTable', direction: 'left' } },
    ],
    layoutToggles: { sequenceFeatures: false, objectProperties: false, interactionTable: false, searchTable: true },
  },
  // Recipe curation: reviewing/editing one ingredient's details. Emphasizes the Recipe
  // table (to pick an ingredient), Ingredient Options/View, and sequence/domain features.
  // `molstar` (the packed-model viewer, not needed for single-ingredient work) stays present
  // but shares its column with the sequence-feature tabs rather than being pixel-shrunk —
  // shrinking it would also shrink those tabs, since they dock into the same group
  // (`TOGGLE_GROUPS`'s `sequenceFeatures` anchors to `molstar`). `activatePanel` makes one of
  // those tabs the visible one instead of Mol-* once they exist.
  recipeCuration: {
    id: 'recipeCuration',
    label: 'Recipe curation',
    panels: [
      { id: 'ingredientView', title: 'Ingredient View' },
      { id: 'ingredientOptions', title: 'Ingredient Options', initialWidth: 260, position: { referencePanel: 'ingredientView', direction: 'left' } },
      { id: 'molstar', title: 'Mol-*', position: { referencePanel: 'ingredientView', direction: 'right' } },
      { id: 'recipeTable', title: 'Recipe table', initialHeight: 320, position: { direction: 'below' } },
      { id: 'tableOptions', title: 'Table Options', initialWidth: 160, position: { referencePanel: 'recipeTable', direction: 'left' } },
    ],
    layoutToggles: { sequenceFeatures: true, objectProperties: false, interactionTable: false, searchTable: false },
    activatePanel: 'seq',
  },
}

/**
 * Moves an *already-mounted* panel into place, for `molstar`/`ingredientView` surviving a
 * preset switch — found live: resizing them in place (the original approach) is not enough.
 * Switching "Recipe curation" → "Default" left Mol-* at its curation-era size and, more
 * visibly, still sharing a group with the sequence-feature tabs instead of standing alone next
 * to Ingredient View — because nothing had ever told it to *move*, only to resize. A preset
 * that doesn't reposition a surviving panel (i.e. its entry has no `position`, true only for
 * `ingredientView` itself) intentionally leaves it exactly where it is.
 *
 * Moves the panel's *group* (`panel.api.group.api.moveTo`), not the panel itself
 * (`panel.api.moveTo`) — found live, a second time, right after the first fix: moving `molstar`
 * alone relocated only that one panel, stranding its `sequenceFeatures` tab-mates (`seq`/
 * `protvista`/`topo`/`uniprot`, added `within` molstar's group by `TOGGLE_GROUPS`) behind as
 * their own orphaned group, since nothing re-syncs a toggle group's tabs when its anchor moves
 * (`syncGroupPanels` only runs on a *visibility* change, and switching between two presets that
 * both want `sequenceFeatures` on doesn't change that boolean, so it never re-fires). Moving the
 * whole group takes every tab in it along together — correct here because, by construction,
 * nothing besides a panel and its own toggle-group tabs ever shares a group in this app.
 */
function movePanel(api: DockviewApi, panel: IDockviewPanel, position: CorePanelPlacement['position']) {
  if (!position?.referencePanel) return
  const targetGroup = api.getPanel(position.referencePanel)?.api.group
  const currentGroup = panel.api.group
  if (!targetGroup || currentGroup === targetGroup) return
  currentGroup.api.moveTo({ group: targetGroup, position: directionToPosition(position.direction) })
}

function applyPreset(api: DockviewApi, preset: WorkspacePreset) {
  const wanted = new Map(preset.panels.map((p) => [p.id, p]))
  for (const id of CORE_PANEL_IDS) {
    if (wanted.has(id) || NEVER_REMOVE.has(id)) continue
    const existing = api.getPanel(id)
    if (existing) api.removePanel(existing)
  }
  for (const placement of preset.panels) {
    const existing = api.getPanel(placement.id)
    if (existing) {
      // Already present (only possible for `molstar`/`ingredientView` surviving a preset
      // switch, since every other core panel was just swept above if unwanted) — move it into
      // its new position (see `movePanel`'s docstring for why resizing alone isn't enough),
      // then resize.
      movePanel(api, existing, placement.position)
      if (placement.initialWidth != null) existing.api.setSize({ width: placement.initialWidth })
      if (placement.initialHeight != null) existing.api.setSize({ height: placement.initialHeight })
      continue
    }
    api.addPanel({
      id: placement.id,
      component: placement.id,
      title: placement.title,
      initialWidth: placement.initialWidth,
      initialHeight: placement.initialHeight,
      position: placement.position,
      // `molstar`/`ingredientView` must survive being an *inactive* tab too, not just avoid
      // `removePanel` — found live: `recipeCuration`'s `activatePanel` makes a sequence-feature
      // tab active in `molstar`'s shared group, which made `molstar` itself inactive, which
      // (under dockview's default `'onlyWhenVisible'` renderer) unmounted its WebGL canvas
      // just as thoroughly as `removePanel` would have (canvas count measurably dropped from
      // 2 to 1). `renderer: 'always'` keeps their content mounted regardless of active/visible
      // tab state, closing this off definitively rather than relying on "just don't make it
      // inactive," which the next preset to use `activatePanel` could easily reintroduce.
      renderer: NEVER_REMOVE.has(placement.id) ? 'always' : undefined,
    })
  }
}

export function Workspace() {
  const layout = useLayoutStore()
  const setLayoutVisibility = useLayoutStore((s) => s.setVisibility)
  const presetId = usePresetStore((s) => s.current)
  const theme = useThemeStore((s) => s.theme)
  const [api, setApi] = useState<DockviewApi | null>(null)

  const onReady = (event: DockviewReadyEvent) => {
    setApi(event.api)
  }

  // Applies the current workspace preset's core-panel arrangement, then sets `layoutStore`
  // to that preset's chosen defaults for the 4 pre-existing toggle groups — the effect below
  // reacts to that state change to actually sync those groups' panels, so this effect only
  // ever touches the 7 core panels `applyPreset` owns.
  useEffect(() => {
    if (!api) return
    const preset = WORKSPACE_PRESETS[presetId]
    applyPreset(api, preset)
    setLayoutVisibility(preset.layoutToggles)
  }, [api, presetId, setLayoutVisibility])

  // Layout Options toggles are the single source of truth for which togglable panels
  // exist — see this file's docstring for why dockview's native tab close is disabled
  // instead of the alternative (syncing `layoutStore` off `onDidRemovePanel`, which also
  // fires on ordinary drag-moves, not just closes). Also applies the current preset's
  // `activatePanel`, if any, once that tab exists — see `WorkspacePreset.activatePanel`'s
  // docstring for why that can't happen in the effect above.
  useEffect(() => {
    if (!api) return
    for (const group of TOGGLE_GROUPS) {
      syncGroupPanels(api, layout[group.flag], group.anchor, group.panels)
    }
    const activate = WORKSPACE_PRESETS[presetId].activatePanel
    if (activate) api.getPanel(activate)?.api.setActive()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, layout.objectProperties, layout.sequenceFeatures, layout.interactionTable, layout.searchTable, presetId])

  return (
    <div className="workspace">
      <DockviewReact components={components} defaultTabComponent={NoCloseTab} onReady={onReady} theme={theme === 'dark' ? themeDark : themeLight} />
    </div>
  )
}
