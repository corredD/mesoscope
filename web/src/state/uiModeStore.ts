/**
 * Recipe view UI state shared by the "Recipe Options" panel (`RecipeCanvasToolbar.tsx`) and the "Recipe View" panel
 * (`RecipeCanvas.tsx`): two dockview panels, so a store rather than props. Nothing here is recipe data or is saved.
 * Defaults are legacy's (recipe-view.md §5).
 */
import { create } from 'zustand'
import type { RecipeNode } from '../domain/recipe/types'

interface UiModeStore {
  /** `#editmode`, legacy `current_mode` (§4.7). */
  editMode: boolean
  /** Whether Edit Mode was ever toggled: until then the Add buttons show regardless (§8.19). */
  editModeToggled: boolean
  toggleEditMode: () => void
  /** Legacy `nodes_selections` (§4.5): a click sets it to the leaf, Ctrl-click appends, a link click sets its ends. */
  selectedNodes: RecipeNode[]
  setSelection: (nodes: RecipeNode[]) => void
  addToSelection: (node: RecipeNode) => void
  clearSelection: () => void
  /** "Node group by" (§6.5): null or a key; only keys outside legacy's `default_options` group. */
  groupBy: string | null
  setGroupBy: (key: string | null) => void
  /** "Node color" (§6). `pdb` after load: legacy rebuilds the select and lands on its first option (oracle, §5). */
  colorMode: string
  setColorMode: (mode: string) => void
  minColor: string
  maxColor: string
  setMinColor: (hex: string) => void
  setMaxColor: (hex: string) => void
  /** Colours set from the context menu for a category, by mode then value (row 72). */
  categoryColors: Record<string, Record<string, string>>
  setCategoryColor: (mode: string, value: string, color: string) => void
  /** "Node size" (§1.7). */
  sizeBy: string
  setSizeBy: (key: string) => void
  /** "Node label" (§2.7): name, None, pdb, uniprot, label or a custom column (row 38). */
  labelBy: string
  setLabelBy: (key: string) => void
  showSprites: boolean
  toggleShowSprites: () => void
  /** "Show latest legends" (§2.9): the colour-mode legend, and its w/h/f sliders. */
  showLegend: boolean
  toggleShowLegend: () => void
  legend: { w: number; h: number; f: number }
  setLegend: (patch: Partial<{ w: number; h: number; f: number }>) => void
  /** Legacy `data.visited`, kept out of the recipe so it is never saved. Feeds the "viewed" colour mode. */
  visitedNodes: Set<RecipeNode>
  markVisited: (node: RecipeNode) => void
  /** "Use color linear mapping" (§5). */
  useColorMapping: boolean
  toggleUseColorMapping: () => void
  /** "Scale Radius by" (§1.7). */
  radiusScale: number
  setRadiusScale: (value: number) => void
  /** "Stroke Line width" (§2.6). */
  strokeWidth: number
  setStrokeWidth: (value: number) => void
}

export const useUiModeStore = create<UiModeStore>((set) => ({
  editMode: false,
  editModeToggled: false,
  toggleEditMode: () => set((state) => ({ editMode: !state.editMode, editModeToggled: true })),
  selectedNodes: [],
  setSelection: (nodes) => set({ selectedNodes: nodes }),
  // Only once: legacy adds a node not already selected (main.js:5124).
  addToSelection: (node) => set((state) => (state.selectedNodes.includes(node) ? state : { selectedNodes: [...state.selectedNodes, node] })),
  clearSelection: () => set({ selectedNodes: [] }),
  groupBy: null,
  setGroupBy: (key) => set({ groupBy: key }),
  colorMode: 'pdb',
  setColorMode: (mode) => set({ colorMode: mode }),
  minColor: '#ff0000',
  maxColor: '#00ffbf',
  setMinColor: (hex) => set({ minColor: hex }),
  setMaxColor: (hex) => set({ maxColor: hex }),
  categoryColors: {},
  setCategoryColor: (mode, value, color) =>
    set((state) => ({ categoryColors: { ...state.categoryColors, [mode]: { ...state.categoryColors[mode], [value]: color } } })),
  sizeBy: 'size',
  setSizeBy: (key) => set({ sizeBy: key }),
  labelBy: 'name',
  setLabelBy: (key) => set({ labelBy: key }),
  showSprites: true,
  toggleShowSprites: () => set((state) => ({ showSprites: !state.showSprites })),
  showLegend: false,
  toggleShowLegend: () => set((state) => ({ showLegend: !state.showLegend })),
  legend: { w: 100, h: 40, f: 30 },
  setLegend: (patch) => set((state) => ({ legend: { ...state.legend, ...patch } })),
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
  radiusScale: 1,
  setRadiusScale: (value) => set({ radiusScale: value }),
  strokeWidth: 1,
  setStrokeWidth: (value) => set({ strokeWidth: value }),
}))
