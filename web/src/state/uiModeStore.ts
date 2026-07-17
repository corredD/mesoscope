/**
 * Recipe-canvas editing/display UI state — deliberately UI-only (nothing here is serialized or
 * touches `recipeStore.graph`'s persisted shape), a third small single-purpose Zustand store
 * alongside `recipeStore`/`layoutStore` (scoped by its own docstring to the four Layout Options
 * panel-visibility toggles, not a general UI-mode bucket).
 *
 * Two families of state, both connecting `RecipeCanvasToolbar.tsx` (lives in the "Recipe
 * Options" panel) to `RecipeCanvas.tsx` (lives in the separate "Recipe View" panel) — two
 * sibling dockview panels, not nested React components, so a shared store is the only clean way
 * to connect them:
 *
 * - **Editing**: `editMode` ("Edit Mode" checkbox, legacy `current_mode`/`switchMode`,
 *   main.js:278-290) gates both drag-to-reparent and the Add ingredient/compartment/interaction
 *   affordances — one flag, matching legacy's actual semantics, confirmed with the user rather
 *   than split into narrower independent toggles. `selectedNodes` is the Ctrl+click
 *   multi-selection it enables (`nodes_selections`), paired up 2-at-a-time by "Add interaction".
 * - **Display** (legacy's `canvasOption` toolbar, `js/layout_mg.js:155-181` — all wired to real,
 *   live functions, confirmed by reading each one's body rather than trusting the option list):
 *   `groupBy` (`ClusterNodeBy`), `colorMode`/`minColor`/`maxColor` (`ChangeCanvasColor`/
 *   `ChangeMinColor`/`ChangeMaxColor`), `sizeBy` (`mapRadiusToProperty`), `labelBy` (the
 *   `canvas_label` dropdown — real rendering, but its own `onchange` handler,
 *   `ChangeCanvasLabel`, is legacy dead code; the label text is read directly from the
 *   dropdown's live value every frame instead, so this store's `labelBy` plays that same role),
 *   `showSprites`/`showLegend` (checkboxes), `visitedNodes` (legacy's `data.visited`, kept out
 *   of `IngredientData` itself — same reasoning as everything here: a UI concern, not recipe
 *   data, so it must never round-trip through save/export), `useColorMapping` ("Use color
 *   linear mapping", `js/layout_mg.js:286`/`toggleColorMapping` — a second, easy-to-miss real
 *   control gating `"automatic"` color mode specifically; found only by re-reading the checkbox
 *   list after `colorModes.ts` had already been built against just `colorNode`'s function body,
 *   which reads the underlying flag but never shows where its default value comes from),
 *   `radiusScale`/`strokeWidth` ("Scale Radius by"/"Stroke Line width" number inputs,
 *   `js/layout_mg.js:294,297` — plain global multipliers, `radius_scale`/`stroke_line_width`,
 *   confirmed live via `js/ngl.js:864-865`'s change handler and `main.js:3611-3617`'s radius
 *   formulas/`main.js:3678`+'s `context.lineWidth` reads; an earlier pass had wrongly written
 *   `radius_scale` off as a dead control because no consumer was checked at the time), and the
 *   five "Forces Options" tuning values (`js/layout_mg.js:266-275`'s `getForcesInputs`, reading
 *   legacy's `AllForces` global, `main.js:177-183`) feeding `useRecipeSimulation`'s LIVE force
 *   simulation — `parentForce`/`surfaceForce`/`clusterByForce` are legacy's per-tick boundary/
 *   surface/cluster velocity nudges, `linkForce` is a `d3.forceLink` over `graph.links` (pulls
 *   interaction-linked ingredients together), `collisionForce` scales `forceCollide`'s strength.
 *   Defaults for `radiusScale`+the 5 force values are imported from `useRecipeSimulation.ts`'s
 *   `DEFAULT_FORCES` (a single source of truth) rather than duplicated here — this store used to
 *   hardcode its own copy that silently drifted out of sync with the layout module's own
 *   defaults (the toolbar displayed one set of numbers while the layout computation used
 *   another), a real bug found and fixed when the canvas moved to a live simulation.
 */
import { create } from 'zustand'
import type { RecipeNode } from '../domain/recipe/types'
import { DEFAULT_FORCES } from '../domain/recipe/useRecipeSimulation'

interface UiModeStore {
  editMode: boolean
  toggleEditMode: () => void
  /** Ctrl+click multi-selection, edit-mode only — paired up 2-at-a-time by "Add interaction". */
  selectedNodes: RecipeNode[]
  toggleNodeSelection: (node: RecipeNode) => void
  clearSelection: () => void
  /** Ingredient property to cluster by, or `null` for no clustering — see `computeRecipeLayout`. */
  groupBy: string | null
  setGroupBy: (key: string | null) => void
  /** "Node color" — one of `BUILTIN_COLOR_MODES` or a custom property name. See `colorModes.ts`. */
  colorMode: string
  setColorMode: (mode: string) => void
  minColor: string
  maxColor: string
  setMinColor: (hex: string) => void
  setMaxColor: (hex: string) => void
  /** "Node size" — mirrors `colorMode`'s shape but drives `computeRecipeLayout`'s pack weight. */
  sizeBy: string
  setSizeBy: (key: string) => void
  /** "Node label" — which ingredient field to display as its text label. */
  labelBy: 'name' | 'None' | 'pdb' | 'uniprot' | 'label'
  setLabelBy: (key: UiModeStore['labelBy']) => void
  showSprites: boolean
  toggleShowSprites: () => void
  showLegend: boolean
  toggleShowLegend: () => void
  /** Ingredients clicked/selected at least once — legacy's `data.visited`, feeding the
   *  "viewed" color mode. Marked via `markVisited`, called from `RecipeCanvas`'s select handler. */
  visitedNodes: Set<RecipeNode>
  markVisited: (node: RecipeNode) => void
  /** "Use color linear mapping" — gates `"automatic"` mode's sub-behavior only; legacy default
   *  `checked` (`js/layout_mg.js:286`). See `colorModes.ts`'s `automatic` case. */
  useColorMapping: boolean
  toggleUseColorMapping: () => void
  /** "Scale Radius by" — multiplies every `sizeBy` radius formula. Legacy default `1.0`. */
  radiusScale: number
  setRadiusScale: (value: number) => void
  /** "Stroke Line width" — circle/link stroke width. Legacy default `1`. */
  strokeWidth: number
  setStrokeWidth: (value: number) => void
  /** "Forces Options" tuning, legacy `AllForces` (main.js:177-183) defaults. */
  parentForce: number
  surfaceForce: number
  linkForce: number
  clusterByForce: number
  collisionForce: number
  setForce: (name: 'parentForce' | 'surfaceForce' | 'linkForce' | 'clusterByForce' | 'collisionForce', value: number) => void
}

export const useUiModeStore = create<UiModeStore>((set) => ({
  editMode: false,
  toggleEditMode: () => set((state) => ({ editMode: !state.editMode, selectedNodes: [] })),
  selectedNodes: [],
  toggleNodeSelection: (node) =>
    set((state) => ({
      selectedNodes: state.selectedNodes.includes(node)
        ? state.selectedNodes.filter((n) => n !== node)
        : [...state.selectedNodes, node],
    })),
  clearSelection: () => set({ selectedNodes: [] }),
  groupBy: null,
  setGroupBy: (key) => set({ groupBy: key }),
  colorMode: 'default',
  setColorMode: (mode) => set({ colorMode: mode }),
  minColor: '#ff0000',
  maxColor: '#00ffbf',
  setMinColor: (hex) => set({ minColor: hex }),
  setMaxColor: (hex) => set({ maxColor: hex }),
  sizeBy: 'size',
  setSizeBy: (key) => set({ sizeBy: key }),
  labelBy: 'name',
  setLabelBy: (key) => set({ labelBy: key }),
  showSprites: true,
  toggleShowSprites: () => set((state) => ({ showSprites: !state.showSprites })),
  showLegend: false,
  toggleShowLegend: () => set((state) => ({ showLegend: !state.showLegend })),
  visitedNodes: new Set(),
  markVisited: (node) =>
    set((state) => {
      if (state.visitedNodes.has(node)) return state
      const next = new Set(state.visitedNodes)
      next.add(node)
      return { visitedNodes: next }
    }),
  useColorMapping: true,
  toggleUseColorMapping: () => set((state) => ({ useColorMapping: !state.useColorMapping })),
  radiusScale: DEFAULT_FORCES.radiusScale,
  setRadiusScale: (value) => set({ radiusScale: value }),
  strokeWidth: 1,
  setStrokeWidth: (value) => set({ strokeWidth: value }),
  parentForce: DEFAULT_FORCES.parentForce,
  surfaceForce: DEFAULT_FORCES.surfaceForce,
  linkForce: DEFAULT_FORCES.linkForce,
  clusterByForce: DEFAULT_FORCES.clusterByForce,
  collisionForce: DEFAULT_FORCES.collisionForce,
  setForce: (name, value) => set({ [name]: value } as Pick<UiModeStore, typeof name>),
}))
