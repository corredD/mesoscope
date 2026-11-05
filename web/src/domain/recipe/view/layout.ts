/**
 * Layout as a pure function of the tree (recipe-view.md §10.2): legacy's radii (§1.7), then each compartment's
 * interior packed with `packSiblings` (the 1.15 gap of legacy's leaf collision, §3.2), its surface ingredients spread
 * on the membrane centreline (§3.6, §10.4), and group-by as one more level inside each compartment (§6.5, §10.2).
 * What legacy's force simulation settled towards, computed once. Edits after load keep every position (§1.9):
 * `reconcileView` places only new nodes.
 */
import { packEnclose, packSiblings } from 'd3-hierarchy'
import { isIngredientNode, type IngredientData, type RecipeGraph, type RecipeNode } from '../types'
import type { PropertyStats } from '../propertyMapping'
import { computePropertyMapping } from '../propertyMapping'
import { absolutePositions, breadthFirst, recipeBreadthFirst, viewId, type Point, type ViewNode, type ViewState } from './viewState'

/** The keys `ClusterNodeBy` refuses to group by (main.js:24-26, 3522-3561). */
export const DEFAULT_OPTIONS = new Set(['none', 'pdb', 'pcpalAxis', 'offset', 'count_molarity', 'Beads', 'geom', 'interaction', 'confidence', 'color', 'viewed', 'size', 'count', 'molarity', 'molecularweight', 'default'])

export interface LayoutOptions {
  sizeBy: string
  radiusScale: number
  groupBy: string | null
  /** Where the root sits: legacy's pack centre, the canvas centre at mount (§1.1, §1.6). */
  center: Point
}

const LEAF_GAP = 1.15 // legacy leaf collision radius r·1.15 (§3.2)
const MEMBRANE = 5 // half the drawn membrane band, r±5 (§2.4)

/** Leaf radius by "Node size" mode (§1.7, main.js:3602-3619, util.js:30-33). */
export function leafRadius(data: IngredientData, sizeBy: string, radiusScale: number, stats: PropertyStats | undefined): number {
  const mw = data.molecularweight
  let r: number
  if (sizeBy === 'radius_molecularweight') r = Math.cbrt((3 * 1.21 * mw) / (4 * Math.PI)) * radiusScale * 0.1
  else if (sizeBy === 'molecularweight') r = Math.cbrt(mw) * 0.1 * radiusScale
  else if (sizeBy === 'default') r = 10 * radiusScale
  else if (sizeBy === 'size') r = data.size * radiusScale
  else {
    const lo = Math.min(0, stats?.min ?? 0)
    const hi = stats?.max ?? 0
    r = (1 + ((Number(data[sizeBy]) - lo) * 49) / (hi - lo)) * radiusScale
  }
  if (r <= 0) r = data.size * radiusScale
  if (Number.isNaN(r)) r = 10 * radiusScale
  return r
}

/** enclose(packSiblings(direct leaves, by r desc)).r + 25 (§1.7, main.js:3621-3640); null without leaves. */
export function compartmentRadius(leafRadii: number[]): number | null {
  if (!leafRadii.length) return null
  const circles = [...leafRadii].sort((a, b) => b - a).map((r) => ({ x: 0, y: 0, r }))
  packSiblings(circles)
  return packEnclose(circles).r + 25 // +25 not scaled by radius_scale (§8.1)
}

/** Every node's radius for a size mode: leaves by §1.7, compartments from their direct leaves only (§8.1). */
export function computeRadii(graph: RecipeGraph, sizeBy: string, radiusScale: number): Map<RecipeNode, number> {
  const stats = computePropertyMapping(graph.nodes)[sizeBy]
  const radii = new Map<RecipeNode, number>()
  for (const node of graph.nodes) if (isIngredientNode(node)) radii.set(node, leafRadius(node.data, sizeBy, radiusScale, stats))
  for (const node of recipeBreadthFirst(graph.nodes[0]).reverse()) {
    if (isIngredientNode(node)) continue
    const children = node.children ?? []
    const own = compartmentRadius(children.filter((c) => radii.has(c) && !c.children).map((c) => radii.get(c)!))
    // No leaf children: legacy keeps the pack radius (§1.7), which depends on the canvas; we enclose the
    // sub-compartments instead, and an empty one gets legacy's new-compartment radius (§7.2).
    if (own !== null) radii.set(node, own)
    else if (children.length) radii.set(node, enclosingRadius(children.map((c) => radii.get(c)! + MEMBRANE)) + 25)
    else radii.set(node, 150)
  }
  return radii
}

function enclosingRadius(radii: number[]): number {
  const circles = radii.map((r) => ({ x: 0, y: 0, r }))
  packSiblings(circles)
  return packEnclose(circles).r
}

type Circle = { x: number; y: number; r: number }

/** The value a leaf is grouped by, or null when the key does not group (built-ins, §6.5). */
function groupKey(node: RecipeNode, groupBy: string | null): string | null {
  if (!groupBy || DEFAULT_OPTIONS.has(groupBy)) return null
  const value = (node.data as IngredientData)[groupBy]
  return value === undefined || value === null ? '' : String(value)
}

/** The recipe laid out from scratch. */
export function layoutRecipe(graph: RecipeGraph, options: LayoutOptions): ViewState {
  const root = graph.nodes[0]
  const radii = computeRadii(graph, options.sizeBy, options.radiusScale)
  const bfs = recipeBreadthFirst(root)
  const nodes: Record<string, ViewNode> = {}
  for (const node of bfs) {
    const leaf = !node.children
    nodes[viewId(node)] = {
      id: viewId(node),
      parent: node.parent ? viewId(node.parent) : null,
      children: (node.children ?? []).map(viewId),
      depth: node.parent ? nodes[viewId(node.parent)].depth + 1 : 0,
      leaf,
      surface: leaf && !!(node.data as IngredientData).surface,
      x: 0,
      y: 0,
      r: radii.get(node)!,
    }
  }
  // Bottom-up: each compartment packs its interior; `extent` is how far its drawing reaches from its centre.
  const extent = new Map<RecipeNode, number>()
  for (const node of [...bfs].reverse()) {
    const view = nodes[viewId(node)]
    if (view.leaf) {
      extent.set(node, view.r * LEAF_GAP)
      continue
    }
    const children = node.children ?? []
    const onMembrane = children.filter((c) => nodes[viewId(c)].surface && node.parent)
    const interior = children.filter((c) => !onMembrane.includes(c))
    const groups = new Map<string, RecipeNode[]>()
    for (const child of interior) {
      const key = child.children ? null : groupKey(child, options.groupBy)
      const slot = key === null ? `node:${viewId(child)}` : `group:${key}`
      groups.set(slot, [...(groups.get(slot) ?? []), child])
    }
    // A group is packed like a compartment of its own, then the groups pack in their compartment.
    const items = [...groups.values()].map((members) => {
      const circles: (Circle & { node: RecipeNode })[] = members.map((m) => ({ node: m, x: 0, y: 0, r: extent.get(m)! }))
      packSiblings(circles)
      const e = members.length > 1 ? packEnclose(circles) : circles[0]
      return { circles, x: 0, y: 0, r: e.r + (members.length > 1 ? 2 * MEMBRANE : 0), cx: e.x, cy: e.y }
    })
    packSiblings(items)
    const all = items.length ? packEnclose(items) : { x: 0, y: 0, r: 0 }
    for (const item of items) {
      for (const c of item.circles) {
        const child = nodes[viewId(c.node)]
        child.x = item.x - all.x + c.x - item.cx
        child.y = item.y - all.y + c.y - item.cy
      }
    }
    onMembrane.forEach((c, i) => {
      const a = (2 * Math.PI * i) / onMembrane.length - Math.PI / 2
      nodes[viewId(c)].x = view.r * Math.cos(a)
      nodes[viewId(c)].y = view.r * Math.sin(a)
    })
    const surfaceReach = Math.max(0, ...onMembrane.map((c) => nodes[viewId(c)].r))
    extent.set(node, Math.max(view.r + MEMBRANE, all.r, view.r + surfaceReach))
  }
  nodes[viewId(root)].x = options.center.x
  nodes[viewId(root)].y = options.center.y
  return { nodes, order: bfs.map(viewId), drag: null, push: null }
}

/**
 * The view after a store edit, without repacking (§1.9): known nodes keep their world position (a node whose parent
 * changed is re-expressed in its new parent), new nodes appear at `newAt` with `newRadius` (§7.1-§7.2), removed
 * nodes go.
 */
export function reconcileView(prev: ViewState, graph: RecipeGraph, newAt: Point, newRadius: (node: RecipeNode) => number): ViewState {
  const before = absolutePositions(prev)
  const nodes: Record<string, ViewNode> = {}
  const abs = new Map<string, Point>()
  for (const node of recipeBreadthFirst(graph.nodes[0])) {
    const id = viewId(node)
    const old = prev.nodes[id]
    const parent = node.parent ? viewId(node.parent) : null
    const world = before.get(id) ?? newAt
    const p = parent ? abs.get(parent)! : { x: 0, y: 0 }
    abs.set(id, world)
    const leaf = !node.children
    nodes[id] = {
      id,
      parent,
      children: (node.children ?? []).map(viewId),
      depth: parent ? nodes[parent].depth + 1 : 0,
      leaf,
      surface: leaf && !!(node.data as IngredientData).surface,
      x: world.x - p.x,
      y: world.y - p.y,
      r: old?.r ?? newRadius(node),
    }
  }
  const rootId = viewId(graph.nodes[0])
  return { nodes, order: breadthFirst(nodes, rootId), drag: null, push: null }
}
