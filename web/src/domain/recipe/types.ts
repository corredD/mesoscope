/**
 * Typed model for the Mesoscope recipe graph, ported from the legacy
 * globals in js/cp_serialized.js and js/main.js.
 *
 * Pipeline (mirrors the legacy parse -> update_graph -> export flow):
 *   JSON (classic or serialized) --parseLegacyRecipe--> RecipeGraph
 *   RecipeGraph --serializeRecipe--> JSON (classic or serialized)
 *
 * `RecipeTreeNode` is the raw nested tree shape produced directly by
 * parsing (each node holds its own `children` array, matching the legacy
 * parser output before it goes through `d3.hierarchy`).
 *
 * `RecipeNode` is the flattened, parent-linked shape everything downstream
 * consumes (legacy `graph.nodes`, produced by `d3.hierarchy(tree).descendants()`
 * in js/main.js:update_graph). We build the same shape ourselves in
 * `buildRecipeGraph` below, without depending on d3.
 */

export interface RecipeSourceTransform {
  offset?: number[]
  center?: boolean
}

export interface RecipeSource {
  pdb: string
  bu: string
  model: string
  selection: string
  transform?: RecipeSourceTransform
  uniprot?: string
  emdb?: string
}

export interface SpriteInfo {
  image: string | null
  offsety: number
  scale2d: number
  lengthy: number
}

export interface PositionLod {
  coords: number[]
}

export interface RadiiLod {
  radii: number[]
}

/** A leaf node: one packable molecular species. */
export interface IngredientData {
  nodetype: 'ingredient'
  name: string
  label: string
  size: number
  molecularweight: number
  confidence: number
  source: RecipeSource
  count: number
  molarity: number
  surface: boolean
  geom: string
  geom_type: string
  comments: string
  uniprot: string
  pcpalAxis: number[]
  offset: number[]
  fiberAxis: number[]
  fiberOffset: number[]
  pos: PositionLod[] | null
  radii: RadiiLod[] | null
  ingtype: string
  buildtype: string
  color: number[] | null
  sprite: SpriteInfo
  results?: unknown
  center?: boolean
  npartner?: number
  include?: boolean
  children?: never
  // Custom columns imported from CSV/XLSX (legacy `additional_data`/`custom_data`).
  [customField: string]: unknown
}

/** A branch node: a compartment (root, envelope, organelle, ...). */
export interface CompartmentData {
  nodetype: 'compartment'
  name: string
  geom: string | { name: string; radius: number } | Record<string, unknown>
  geom_type: string
  thickness: number
  color: number[] | null
  pos?: PositionLod[]
  radii?: RadiiLod[]
  types?: { types: string[] }[]
  boundingBox?: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
}

export interface RecipeTreeIngredientNode extends IngredientData {
  children?: never
}

export interface RecipeTreeCompartmentNode extends CompartmentData {
  children: RecipeTreeNode[]
}

export type RecipeTreeNode = RecipeTreeIngredientNode | RecipeTreeCompartmentNode

/** An interaction/partner link, name-addressed as produced by parsing. */
export interface RawRecipeLink {
  id: number
  source: string
  target: string
  name1: string
  name2: string
  pdb1: string
  sel1: string
  sel2: string
  coords1: number[]
  coords2: number[]
  beads1: unknown[]
  beads2: unknown[]
}

/** The result of parsing, before flattening (legacy parse function return). */
export interface ParsedRecipeTree {
  tree: RecipeTreeNode
  links: RawRecipeLink[]
}

/** A flattened, parent-linked node (legacy `d3.hierarchy(...).descendants()` entry). */
export interface RecipeNode {
  data: RecipeTreeNode
  parent: RecipeNode | null
  children?: RecipeNode[]
}

/** A link with source/target resolved to graph nodes (legacy `MapLinkToNode`). */
export interface RecipeLink extends Omit<RawRecipeLink, 'source' | 'target'> {
  source: RecipeNode
  target: RecipeNode
}

/** The working graph: what tables, exporters, and color/molarity tools read. */
export interface RecipeGraph {
  nodes: RecipeNode[]
  links: RecipeLink[]
}

/**
 * Fields every ingredient carries. Anything else on `IngredientData` is a
 * custom column (legacy `additional_data`/`custom_data`, e.g. from a CSV
 * import) and gets round-tripped through the serialized/classic `custom_data`
 * list. Unlike the legacy globals (a single `additional_data` array shared
 * across the whole parse), we compute this per-node so one ingredient's
 * extra column doesn't leak an `undefined` field onto every other ingredient.
 */
export const KNOWN_INGREDIENT_FIELDS = new Set<string>([
  'nodetype', 'name', 'label', 'size', 'molecularweight', 'confidence',
  'source', 'count', 'molarity', 'surface', 'geom', 'geom_type', 'comments',
  'uniprot', 'pcpalAxis', 'offset', 'fiberAxis', 'fiberOffset', 'pos',
  'radii', 'ingtype', 'buildtype', 'color', 'sprite', 'results', 'center',
  'npartner', 'include', 'children',
])

export function customIngredientFields(data: IngredientData): string[] {
  return Object.keys(data).filter((key) => !KNOWN_INGREDIENT_FIELDS.has(key))
}

export function isIngredientNode(node: RecipeNode): node is RecipeNode & {
  data: RecipeTreeIngredientNode
} {
  return node.data.nodetype === 'ingredient' && !node.children
}

export function isCompartmentNode(node: RecipeNode): node is RecipeNode & {
  data: RecipeTreeCompartmentNode
  children: RecipeNode[]
} {
  return !!node.children && node.children.length > 0
}

/** Flatten a raw parse tree into parent-linked nodes, pre-order (root first). */
export function flattenRecipeTree(tree: RecipeTreeNode): RecipeNode[] {
  const nodes: RecipeNode[] = []
  const visit = (data: RecipeTreeNode, parent: RecipeNode | null) => {
    const node: RecipeNode = { data, parent }
    nodes.push(node)
    // Mirrors d3.hierarchy: a node only gets `.children` if the raw array is non-empty.
    if (data.children && data.children.length > 0) {
      node.children = data.children.map((child) => visit(child, node))
    }
    return node
  }
  visit(tree, null)
  return nodes
}

/** Resolve name-addressed links to node references (legacy `MapLinkToNode`). */
export function resolveRecipeLinks(nodes: RecipeNode[], links: RawRecipeLink[]): RecipeLink[] {
  const byName = new Map<string, RecipeNode>()
  for (const node of nodes) byName.set(node.data.name, node)
  const resolved: RecipeLink[] = []
  for (const link of links) {
    const source = byName.get(link.source)
    const target = byName.get(link.target)
    if (!source || !target) continue
    resolved.push({ ...link, source, target })
  }
  return resolved
}

/** Build the working graph from a parsed tree (legacy `update_graph`'s structural part). */
export function buildRecipeGraph(parsed: ParsedRecipeTree): RecipeGraph {
  const nodes = flattenRecipeTree(parsed.tree)
  const links = resolveRecipeLinks(nodes, parsed.links)
  return { nodes, links }
}

/** Self first, then each ancestor up to and including the root (legacy d3 `node.ancestors()`). */
export function ancestorsSelfFirst(node: RecipeNode): RecipeNode[] {
  const chain: RecipeNode[] = []
  let current: RecipeNode | null = node
  while (current) {
    chain.push(current)
    current = current.parent
  }
  return chain
}

/**
 * Dotted path through ancestor *compartment* names only (root down to, but not
 * including, a leaf's own name) — the "cname" used by both the CSV `compartment`
 * column (js/query_helper.js:saveCurrentCSV) and as the prefix for
 * `buildIngredientNamePath` below.
 */
export function buildAncestorCompartmentPath(node: RecipeNode): string {
  const chain = ancestorsSelfFirst(node).reverse()
  return chain.map((n) => (n.children ? n.data.name : '')).join('.').slice(0, -1)
}

/**
 * Dotted ancestor-compartment path for a leaf ingredient, matching the
 * legacy `name_path` builder duplicated across cp_SerializedColorSchem,
 * cp_SerializedColorMap-adjacent molarity export, etc. (js/cp_serialized.js).
 */
export function buildIngredientNamePath(node: RecipeNode): string {
  let path = buildAncestorCompartmentPath(node)
  const parentName = node.parent?.data.name
  const data = node.data as IngredientData
  if (parentName !== 'root') {
    path += (data.surface ? '.surface.proteins.' : '.interior.proteins.') + data.name
  } else {
    path += '.proteins.' + data.name
  }
  return path
}

/** Dotted ancestor path for a compartment node (used for membrane color palette keys). */
export function buildCompartmentNamePath(node: RecipeNode): string {
  const chain = ancestorsSelfFirst(node).reverse()
  return chain.map((n) => (n.children ? n.data.name : '')).join('.')
}

/**
 * Stable numeric identity for a `RecipeNode` across renders (nodes themselves
 * are plain objects with no id field of their own). Shared by RecipeTable and
 * RecipeCanvas so both can use it for React/d3 join keys.
 */
const nodeIds = new WeakMap<RecipeNode, number>()
let nextNodeId = 0
export function nodeKey(node: RecipeNode): number {
  let id = nodeIds.get(node)
  if (id === undefined) {
    id = nextNodeId++
    nodeIds.set(node, id)
  }
  return id
}
