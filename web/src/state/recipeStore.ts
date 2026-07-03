/**
 * Holds the currently loaded recipe graph — the modern equivalent of the
 * legacy globals `graph`/`recipe_file`/`jsondic.recipe.name` (js/main.js).
 *
 * Scope note: only the load/parse paths that Phase 2/4's domain layer fully
 * supports are wired here (empty recipe, local .json/_serialized.json/.csv
 * files, the plain-JSON example recipes, and JSON-based merge-on-append).
 * Anything needing infrastructure this phase doesn't build yet — zip
 * import/export, local PDB/geometry file management, the canvas
 * coloring-by-property feature behind Color Mapping — stays a menu
 * placeholder. See web/README-modernization.md.
 */
import { create } from 'zustand'
import { detectRecipeFormat, parseLegacyRecipe, type RecipeFormat } from '../domain/recipe/parseLegacyRecipe'
import { validateRecipeJson } from '../domain/recipe/validateRecipe'
import { isIngredientNode, isCompartmentNode, type IngredientData, type RecipeGraph, type RecipeNode } from '../domain/recipe/types'
import { importColorPalette, type ColorPalette } from '../domain/colors/colorPalette'
import { importMolarityCount, type MolarityCountEntry } from '../domain/recipe/serializeRecipe'
import { mergeRecipeGraphs, type MergeOptions } from '../domain/recipe/mergeRecipe'

export interface RecipeSummary {
  name: string
  format: RecipeFormat
  ingredientCount: number
  compartmentCount: number
}

interface RecipeStore {
  graph: RecipeGraph | null
  format: RecipeFormat | null
  error: string | null
  loading: boolean
  /** The ingredient row selected in RecipeTable — the modern equivalent of
   *  legacy's `node_selected` global, which PDB/UniProt search results write
   *  their pick back onto (js/query_helper.js:customReportCB/reportResultcb). */
  selectedNode: RecipeNode | null
  loadEmpty: () => void
  loadFromJson: (json: unknown, format?: RecipeFormat | 'auto') => void
  loadFromUrl: (url: string) => Promise<void>
  loadParsedGraph: (graph: RecipeGraph, format: RecipeFormat) => void
  mergeGraph: (incoming: RecipeGraph, options: MergeOptions) => void
  applyColorPalette: (palette: ColorPalette) => void
  applyMolarityCount: (data: Record<string, MolarityCountEntry>) => void
  updateIngredient: (node: RecipeNode, patch: Partial<Pick<IngredientData, 'name' | 'count' | 'molarity'>>) => void
  deleteIngredient: (node: RecipeNode) => void
  selectNode: (node: RecipeNode | null) => void
  applyPdbPick: (patch: Partial<Pick<IngredientData, 'label' | 'uniprot'>> & { pdb?: string }) => void
  /** Legacy equivalent: js/ngl.js's many `node_selected.data.X = ...` assignments
   *  (`NGL_ChangeSelection`, `NGL_applyPcp`/`NGL_applyFiberPcp`, `NGL_buildBeads`,
   *  `NGL_UpdateThumbnailCurrent`) — used by `IngredientOptions.tsx` for chain
   *  selection, membrane/fiber orientation, LOD/clustering, and sprite fields. */
  patchSelectedIngredient: (patch: Partial<IngredientData>) => void
  setError: (message: string | null) => void
}

function summarize(graph: RecipeGraph, format: RecipeFormat): RecipeSummary {
  return {
    name: graph.nodes[0]?.data.name ?? '',
    format,
    ingredientCount: graph.nodes.filter(isIngredientNode).length,
    compartmentCount: graph.nodes.filter(isCompartmentNode).length,
  }
}

export const useRecipeStore = create<RecipeStore>((set) => ({
  graph: null,
  format: null,
  error: null,
  loading: false,
  selectedNode: null,

  loadEmpty: () => {
    // Matches legacy CreateNew(): root = {"name":"root","children":[]}, with
    // `children` explicitly present-but-empty on both the raw data and the
    // flattened node (legacy does the same via `nodes[0].children=[]` right
    // after building the hierarchy).
    const graph: RecipeGraph = {
      nodes: [
        {
          data: { nodetype: 'compartment', name: 'root', geom: '', geom_type: 'None', thickness: 7.5, color: null, children: [] },
          parent: null,
          children: [],
        },
      ],
      links: [],
    }
    set({ graph, format: 'classic', error: null, loading: false, selectedNode: null })
  },

  loadFromJson: (json, format = 'auto') => {
    const validation = validateRecipeJson(json)
    if (!validation.ok) {
      set({ error: validation.errors.join(' ') })
      return
    }
    const resolvedFormat = format === 'auto' ? detectRecipeFormat(json) : format
    const graph = parseLegacyRecipe(json, resolvedFormat)
    set({ graph, format: resolvedFormat, error: null, loading: false, selectedNode: null })
  },

  loadFromUrl: async (url) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const json = await response.json()
      const validation = validateRecipeJson(json)
      if (!validation.ok) throw new Error(validation.errors.join(' '))
      const graph = parseLegacyRecipe(json, validation.format)
      set({ graph, format: validation.format, error: null, loading: false, selectedNode: null })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  // Entry point for parsers that don't go through JSON (e.g. domain/files/parseCsvRecipe.ts)
  // but already produce a fully-built RecipeGraph.
  loadParsedGraph: (graph, format) => {
    set({ graph, format, error: null, loading: false, selectedNode: null })
  },

  // Legacy equivalent: js/main.js:merge_graph, via the "Append From" menu. No-op
  // (with an error) if nothing is loaded yet — merging needs a current graph to merge into.
  mergeGraph: (incoming, options) => {
    set((state) => {
      if (!state.graph) return { error: 'No recipe is loaded — nothing to merge into.' }
      return { graph: mergeRecipeGraphs(state.graph, incoming, options) }
    })
  },

  applyColorPalette: (palette) => {
    set((state) => {
      if (!state.graph) return state
      importColorPalette(state.graph, palette)
      return { graph: { ...state.graph } }
    })
  },

  applyMolarityCount: (data) => {
    set((state) => {
      if (!state.graph) return state
      importMolarityCount(state.graph, data)
      return { graph: { ...state.graph } }
    })
  },

  // Legacy equivalent: js/gridtable.js:updateAttributesNode (cell edit on grid_recipe),
  // ported for just the fields the native RecipeTable exposes so far.
  updateIngredient: (node, patch) => {
    set((state) => {
      if (!state.graph) return state
      Object.assign(node.data, patch)
      return { graph: { ...state.graph } }
    })
  },

  // Legacy equivalent: js/gridtable.js:removeRow — splices the node out of
  // graph.nodes/graph.links (and here, the parent's flattened children too,
  // which the legacy D3 hierarchy never needed to touch separately).
  deleteIngredient: (node) => {
    set((state) => {
      if (!state.graph) return state
      const nodes = state.graph.nodes.filter((n) => n !== node)
      const links = state.graph.links.filter((l) => l.source !== node && l.target !== node)
      if (node.parent?.children) {
        node.parent.children = node.parent.children.filter((n) => n !== node)
      }
      return { graph: { nodes, links }, selectedNode: state.selectedNode === node ? null : state.selectedNode }
    })
  },

  selectNode: (node) => set({ selectedNode: node }),

  // Legacy equivalent: js/query_helper.js:customReportCB/reportResultcb writing a PDB/UniProt
  // search pick back onto `node_selected` (query_helper.js:356-382, 140-165).
  applyPdbPick: (patch) => {
    set((state) => {
      if (!state.graph || !state.selectedNode) return state
      const data = state.selectedNode.data as IngredientData
      if (patch.pdb !== undefined) data.source.pdb = patch.pdb
      if (patch.uniprot !== undefined) data.uniprot = patch.uniprot
      if (patch.label !== undefined) data.label = patch.label
      return { graph: { ...state.graph } }
    })
  },

  patchSelectedIngredient: (patch) => {
    set((state) => {
      if (!state.graph || !state.selectedNode) return state
      Object.assign(state.selectedNode.data, patch)
      return { graph: { ...state.graph } }
    })
  },

  setError: (message) => set({ error: message }),
}))

/** Derived summary — a selector rather than duplicated state, so it can't go stale. */
export function useRecipeSummary(): RecipeSummary | null {
  const graph = useRecipeStore((s) => s.graph)
  const format = useRecipeStore((s) => s.format)
  if (!graph || !format) return null
  return summarize(graph, format)
}
