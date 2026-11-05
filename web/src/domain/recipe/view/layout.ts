/**
 * Where the Recipe view's nodes start and how big they are (recipe-view.md §1): legacy's pack seeds the positions
 * (§1.1, §1.3), then the radii are replaced by the "Node size" mode (§1.7). The force simulation does the rest (§3).
 * Radius functions come from lane `recipe-view-port` (b747e1e), checked against the legacy oracle.
 */
import { hierarchy, pack, packEnclose, packSiblings } from 'd3-hierarchy'
import { type IngredientData, type RecipeGraph, type RecipeNode } from '../types'
import type { PropertyStats } from '../propertyMapping'
import { computePropertyMapping } from '../propertyMapping'

/** The keys `ClusterNodeBy` refuses to group by (main.js:24-26, 3522-3561). */
export const DEFAULT_OPTIONS = new Set(['none', 'pdb', 'pcpalAxis', 'offset', 'count_molarity', 'Beads', 'geom', 'interaction', 'confidence', 'color', 'viewed', 'size', 'count', 'molarity', 'molecularweight', 'default'])

/** Legacy's new-compartment radius (§7.2), also the radius of a compartment the pack never saw. */
export const NEW_COMPARTMENT_R = 150
/** Legacy's new-ingredient radius (§7.1, §8.18: the table says 40, the node gets 30). */
export const NEW_INGREDIENT_R = 30

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

/**
 * Every node's radius for a size mode (`mapRadiusToProperty_cb`): leaves by §1.7, compartments from their direct
 * leaves only (§8.1). A compartment without leaf children keeps `fallback(node)`, its pack radius in legacy.
 */
export function computeRadii(graph: RecipeGraph, sizeBy: string, radiusScale: number, fallback: (node: RecipeNode) => number = () => NEW_COMPARTMENT_R): Map<RecipeNode, number> {
  const stats = computePropertyMapping(graph.nodes)[sizeBy]
  const radii = new Map<RecipeNode, number>()
  for (const node of graph.nodes) {
    if (!node.children) {
      radii.set(node, leafRadius(node.data as IngredientData, sizeBy, radiusScale, stats))
      continue
    }
    const leaves: number[] = []
    for (const c of node.children) if (!c.children) leaves.push(leafRadius(c.data as IngredientData, sizeBy, radiusScale, stats))
    radii.set(node, compartmentRadius(leaves) ?? fallback(node))
  }
  return radii
}

export interface Seed {
  x: number
  y: number
  r: number
}

/**
 * Legacy's seed (§1.1, §1.3, §1.6): `pack().size([width, height]).padding(30)` over `hierarchy(tree).sum(size)`, no
 * sort; positions stay in pack space. The pack radius is returned too: legacy keeps it for compartments without leaf
 * children (§1.7).
 */
export function seedPositions(graph: RecipeGraph, width: number, height: number): Map<RecipeNode, Seed> {
  const root = hierarchy<RecipeNode>(graph.nodes[0], (n) => n.children).sum((n) => Number((n.data as { size?: number }).size) || 0)
  const packed = pack<RecipeNode>().size([Math.max(1, width), Math.max(1, height)]).padding(30)(root)
  const out = new Map<RecipeNode, Seed>()
  for (const d of packed.descendants()) out.set(d.data, { x: d.x, y: d.y, r: d.r })
  return out
}

type ClusterNode = { leaf: boolean; x: number; y: number; r: number; node: RecipeNode; cluster: { x: number; y: number; r: number } | null }

/**
 * `ClusterNodeBy` (main.js:3517-3595, §6.5): one cluster per value of the field ("" for a missing one), each the
 * enclosure of its leaves' packed disks, all clusters packed together around the origin; each leaf gets its cluster
 * (the force adds the parent's position, §3.3). Any field groups, built-in ones too (Ludovic, 2026-11-05: legacy
 * refused every `default_options` key, so on a recipe without custom columns it did nothing); `none` turns it off.
 * Returns legacy `clusterBy`.
 */
export function assignClusters(nodes: readonly ClusterNode[], key: string | null): boolean {
  if (!key || key === 'none') return false
  const value = (n: ClusterNode) => {
    const v = (n.node.data as Record<string, unknown>)[key]
    return v === undefined || v === null ? '' : v
  }
  const unique: unknown[] = []
  for (const n of nodes) {
    const v = (n.node.data as Record<string, unknown>)[key]
    if (v != null && v !== -1 && !unique.includes(v)) unique.push(v)
  }
  unique.push('')
  const points = new Map<number, { x: number; y: number; r: number }[]>()
  for (const n of nodes) {
    if (!n.leaf) continue
    const c = unique.indexOf(value(n))
    if (!points.has(c)) points.set(c, [])
    points.get(c)!.push({ x: n.x, y: n.y, r: n.r })
  }
  const clusters = new Map<number, { x: number; y: number; r: number }>()
  for (const [c, list] of [...points].sort((a, b) => a[0] - b[0])) {
    list.sort((a, b) => b.r - a.r)
    packSiblings(list)
    const e = packEnclose(list)
    clusters.set(c, { x: e.x, y: e.y, r: e.r })
  }
  packSiblings([...clusters.values()])
  for (const n of nodes) if (n.leaf) n.cluster = clusters.get(unique.indexOf(value(n))) ?? null
  return true
}
