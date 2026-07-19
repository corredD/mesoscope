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
import { color as parseColor } from 'd3-color'
import { detectRecipeFormat, parseLegacyRecipe, type RecipeFormat } from '../domain/recipe/parseLegacyRecipe'
import { validateRecipeJson } from '../domain/recipe/validateRecipe'
import { ancestorsSelfFirst, isIngredientNode, isCompartmentNode, type IngredientData, type RecipeGraph, type RecipeLink, type RecipeNode } from '../domain/recipe/types'
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
  updateIngredient: (
    node: RecipeNode,
    patch: Partial<Pick<IngredientData, 'name' | 'count' | 'molarity' | 'source' | 'ingtype'>>,
  ) => void
  deleteIngredient: (node: RecipeNode) => void
  /** Legacy equivalent: js/main.js's `RenameNodeOver` (main.js:4812-4825) — renames either node
   *  type in place. Legacy also cascades the rename into a cached grid-display `compartment`
   *  path column (`traverseTreeForCompartmentNameUpdate`); that cache doesn't exist here since
   *  `buildAncestorCompartmentPath` derives the path live from `.parent` on every read, so
   *  renaming `data.name` alone keeps every descendant's displayed path correct for free. */
  renameNode: (node: RecipeNode, name: string) => void
  /** Legacy equivalent: js/main.js's `DeleteNodeOver` (main.js:4827-4861) for a compartment node
   *  — except legacy only detaches the compartment itself, leaving its descendants as dangling
   *  orphans still present in `graph.nodes` (a latent bug, not a real reparent-or-cascade
   *  decision — confirmed by reading the function body, no recursion over `.children` exists).
   *  This deliberately does not replicate that: deletes the compartment and its entire subtree
   *  (matching ordinary file/tree-explorer "delete folder" semantics instead). No-op on the
   *  root compartment (no parent to detach from). */
  deleteCompartment: (node: RecipeNode) => void
  /** Legacy equivalent: js/main.js's `ChangeColorNodeOver`'s direct-color branch (main.js:4763-4796,
   *  the `else` branch — the other branch remaps a live color-by-property legend entry instead of
   *  writing a per-node color, and is deliberately not ported, see README). Writes straight to
   *  `data.color`, same persisted field `applyColorModeToIngredient`/the serializers already use —
   *  unlike `_color`, there is no backup-then-restore step here since this *is* the direct
   *  per-node override action, not a bulk mode-driven bake-in. */
  setNodeColor: (node: RecipeNode, hex: string) => void
  selectNode: (node: RecipeNode | null) => void
  applyPdbPick: (patch: Partial<Pick<IngredientData, 'label' | 'uniprot'>> & { pdb?: string }) => void
  /** Recipe-canvas Edit Mode drag-to-reparent — legacy equivalent: js/main.js's `dragended`
   *  (main.js:5225-5330) splicing the node out of its old parent's `children[]` into the new
   *  one's. No-op (returns without mutating) if `newParent` is `node` itself, is already its
   *  parent, or is one of `node`'s own descendants. */
  reparentNode: (node: RecipeNode, newParent: RecipeNode) => void
  /** Legacy equivalent: js/main.js's `addLink` (main.js:4545-4610), simplified to one explicit
   *  pair per call rather than pairing up a multi-selection internally — `RecipeCanvasToolbar`
   *  does that pairing before calling this once per pair. No-op if `source === target`. */
  addLink: (source: RecipeNode, target: RecipeNode) => void
  deleteLink: (link: RecipeLink) => void
  updateLink: (link: RecipeLink, patch: Partial<Pick<RecipeLink, 'name1' | 'name2' | 'pdb1' | 'sel1' | 'sel2'>>) => void
  /** Reassigns a link's endpoint to a different ingredient — a structural change (which two
   *  nodes a link connects), kept separate from `updateLink`'s plain-field patches. */
  setLinkEndpoint: (link: RecipeLink, end: 'source' | 'target', node: RecipeNode) => void
  /** Legacy equivalent: js/main.js's `addIngredient`/`addCompartment` (main.js:4499-4680) —
   *  pushes one new node with sensible blank defaults into the recipe root, for the user to
   *  edit afterward via RecipeTable/the canvas. No-op if no recipe is loaded. */
  addIngredient: () => void
  addCompartment: () => void
  selectedLink: RecipeLink | null
  selectLink: (link: RecipeLink | null) => void
  /** Legacy equivalent: js/main.js's `applyColorModeToIngredient` (main.js:3356-3371) — bakes
   *  the currently-displayed color into each ingredient's persisted `data.color`, backing up
   *  the previous value into `data._color` the first time only (never overwrites an existing
   *  backup). Takes a resolver rather than a color mode name so `recipeStore` doesn't need to
   *  depend on `uiModeStore`/`colorModes.ts` — `RecipeCanvasToolbar.tsx` (which already reads
   *  both) supplies the actual per-node CSS color string, matching whatever `RecipeCanvas.tsx`
   *  is currently rendering. Colors are parsed via `d3-color` (handles `rgb()`/`hsl()`/named
   *  colors uniformly, same as legacy's `d3v4.color(...)`) and normalized to a `[0,1]` triplet. */
  applyColorModeToIngredient: (colorFor: (node: RecipeNode) => string) => void
  /** Legacy equivalent: js/ngl.js's many `node_selected.data.X = ...` assignments
   *  (`NGL_ChangeSelection`, `NGL_applyPcp`/`NGL_applyFiberPcp`, `NGL_buildBeads`,
   *  `NGL_UpdateThumbnailCurrent`) — used by `IngredientOptions.tsx` for chain
   *  selection, membrane/fiber orientation, LOD/clustering, and sprite fields. */
  patchSelectedIngredient: (patch: Partial<IngredientData>) => void
  setError: (message: string | null) => void
}

// Module-scoped counters for "Add ingredient"/"Add compartment"/"Add interaction" — only used
// to make new nodes/links distinguishable while the user fills in real values afterward, same
// role as legacy's `comp_count` (main.js:4508) and `id = graph.links.length` (main.js:4558) —
// a running counter here instead of `.length`-based ids since deletions would otherwise let
// ids repeat (confirmed harmless either way: `serializeRecipe.ts` never reads a link's `.id`).
let nextIngredientId = 1
let nextCompartmentId = 1
let nextLinkId = 1

function createDefaultIngredient(): IngredientData {
  const name = `newIngredient${nextIngredientId++}`
  return {
    nodetype: 'ingredient',
    name,
    label: name,
    size: 10,
    molecularweight: 0,
    confidence: 0,
    source: { pdb: '', bu: 'BU1', model: '0', selection: '' },
    count: 0,
    molarity: 0,
    surface: false,
    geom: '',
    geom_type: '',
    comments: '',
    uniprot: '',
    pcpalAxis: [0, 0, 1],
    offset: [0, 0, 0],
    fiberAxis: [0, 0, 1],
    fiberOffset: [0, 0, 0],
    pos: null,
    radii: null,
    ingtype: 'protein',
    buildtype: 'random',
    color: null,
    sprite: { image: null, offsety: 0, scale2d: 1, lengthy: 0 },
  }
}

// Matches `loadEmpty`'s root-compartment literal, above, as the template for a freshly-added
// (non-root) compartment's defaults.
function createDefaultCompartment(): RecipeNode {
  const name = `newCompartment${nextCompartmentId++}`
  return { data: { nodetype: 'compartment', name, geom: '', geom_type: 'None', thickness: 7.5, color: null, children: [] }, parent: null, children: [] }
}

function createBlankLink(source: RecipeNode, target: RecipeNode): RecipeLink {
  return {
    id: nextLinkId++,
    source,
    target,
    name1: (source.data as IngredientData).name ?? '',
    name2: (target.data as IngredientData).name ?? '',
    pdb1: '',
    sel1: '',
    sel2: '',
    coords1: [],
    coords2: [],
    beads1: [],
    beads2: [],
  }
}

/** `node` plus every descendant, self first — the cascade set for `deleteCompartment`. */
function subtreeSelfFirst(node: RecipeNode): RecipeNode[] {
  const nodes: RecipeNode[] = [node]
  for (const child of node.children ?? []) {
    nodes.push(...subtreeSelfFirst(child))
  }
  return nodes
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
  selectedLink: null,

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
  // ported for the fields the native RecipeTable exposes.
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

  renameNode: (node, name) => {
    set((state) => {
      if (!state.graph) return state
      node.data.name = name
      return { graph: { ...state.graph } }
    })
  },

  deleteCompartment: (node) => {
    set((state) => {
      if (!state.graph || !node.parent) return state
      const removed = new Set(subtreeSelfFirst(node))
      const nodes = state.graph.nodes.filter((n) => !removed.has(n))
      const links = state.graph.links.filter((l) => !removed.has(l.source) && !removed.has(l.target))
      node.parent.children = node.parent.children?.filter((n) => n !== node)
      return {
        graph: { nodes, links },
        selectedNode: state.selectedNode && removed.has(state.selectedNode) ? null : state.selectedNode,
        selectedLink: state.selectedLink && (removed.has(state.selectedLink.source) || removed.has(state.selectedLink.target)) ? null : state.selectedLink,
      }
    })
  },

  setNodeColor: (node, hex) => {
    set((state) => {
      if (!state.graph) return state
      const parsed = parseColor(hex)
      if (!parsed) return state
      const rgb = parsed.rgb()
      node.data.color = [rgb.r / 255, rgb.g / 255, rgb.b / 255]
      return { graph: { ...state.graph } }
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

  reparentNode: (node, newParent) => {
    set((state) => {
      if (!state.graph) return state
      if (node === newParent || node.parent === newParent) return state
      if (ancestorsSelfFirst(newParent).includes(node)) return state // newParent can't be node's own descendant
      if (node.parent?.children) {
        node.parent.children = node.parent.children.filter((n) => n !== node)
      }
      node.parent = newParent
      newParent.children = [...(newParent.children ?? []), node]
      return { graph: { ...state.graph } }
    })
  },

  addLink: (source, target) => {
    set((state) => {
      if (!state.graph || source === target) return state
      const links = [...state.graph.links, createBlankLink(source, target)]
      return { graph: { ...state.graph, links } }
    })
  },

  deleteLink: (link) => {
    set((state) => {
      if (!state.graph) return state
      const links = state.graph.links.filter((l) => l !== link)
      return { graph: { ...state.graph, links }, selectedLink: state.selectedLink === link ? null : state.selectedLink }
    })
  },

  updateLink: (link, patch) => {
    set((state) => {
      if (!state.graph) return state
      Object.assign(link, patch)
      return { graph: { ...state.graph } }
    })
  },

  setLinkEndpoint: (link, end, node) => {
    set((state) => {
      if (!state.graph) return state
      link[end] = node
      return { graph: { ...state.graph } }
    })
  },

  addIngredient: () => {
    set((state) => {
      if (!state.graph) return state
      const root = state.graph.nodes[0]
      const newNode: RecipeNode = { data: createDefaultIngredient(), parent: root, children: undefined }
      root.children = [...(root.children ?? []), newNode]
      return { graph: { ...state.graph, nodes: [...state.graph.nodes, newNode] } }
    })
  },

  addCompartment: () => {
    set((state) => {
      if (!state.graph) return state
      const root = state.graph.nodes[0]
      const newNode = createDefaultCompartment()
      newNode.parent = root
      root.children = [...(root.children ?? []), newNode]
      return { graph: { ...state.graph, nodes: [...state.graph.nodes, newNode] } }
    })
  },

  selectLink: (link) => set({ selectedLink: link }),

  applyColorModeToIngredient: (colorFor) => {
    set((state) => {
      if (!state.graph) return state
      for (const node of state.graph.nodes) {
        if (!isIngredientNode(node)) continue
        const data = node.data as IngredientData
        const parsed = parseColor(colorFor(node))
        if (!parsed) continue
        const rgb = parsed.rgb()
        if (data._color === undefined) data._color = data.color
        data.color = [rgb.r / 255, rgb.g / 255, rgb.b / 255]
      }
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
