/**
 * Recipe-canvas layout: `d3.hierarchy`+`d3.pack` circle-packing (unchanged from the original
 * `RecipeCanvas.tsx` implementation), followed by a *synchronous, bounded* `d3-force` solve for
 * two legacy behaviors that packing alone doesn't produce: the membrane/surface constraint
 * (`data.surface===true` ingredients pulled toward their parent compartment's boundary,
 * js/main.js:5440-5452) and the "group by property" cluster-attraction force (`ClusterNodeBy`,
 * js/main.js:3517-3590/5424-5437).
 *
 * Legacy runs both as hand-rolled velocity nudges inside a live, continuously-ticking D3 force
 * simulation (`main.js:2928-2935`) — every animation frame, forever. This deliberately does not
 * port that: the simulation here is created, ticked a fixed bounded number of times in a plain
 * loop (no `requestAnimationFrame`, no `.on('tick', ...)`), and discarded — one synchronous
 * computation per layout change, one React render of the settled result. This gets the same
 * real collision-resolution (surface-seeking and cluster-pulling ingredients still push each
 * other apart via `forceCollide` instead of silently overlapping, which a one-shot geometric
 * projection can't do on its own) without an animation loop to maintain, tear down on unmount,
 * or reconcile with `d3.zoom`. Confirmed with the user as the preferred tradeoff over both a
 * pure-geometric nudge (simpler, but no collision pass) and a live tick-per-frame loop (closer
 * to legacy, but a real architectural addition to a currently-static component).
 *
 * Only ingredient leaves participate in the force solve — compartments stay exactly where
 * `d3.pack()` put them. Leaves belonging to different compartments can't meaningfully collide
 * with each other since `d3.pack()` already guarantees sibling/cousin subtrees don't overlap,
 * so (unlike legacy, which ran collision across every node together and needed per-depth
 * partitioning to avoid cross-compartment interference) a single `forceCollide` across all
 * leaves is sufficient here.
 *
 * `sizeBy` (the "Node size" dropdown, legacy `mapRadiusToProperty`/`mapRadiusToProperty_cb`,
 * main.js:3597-3646) is folded into the pack weight fed to `d3.pack()`'s own `.sum()`, rather
 * than replicating legacy's approach of setting `d.r` directly then manually re-packing each
 * compartment via `d3.packSiblings`/`d3.packEnclose` and restarting the force simulation. Both
 * produce the same visible outcome (ingredients sized proportionally to whichever property is
 * selected, compartments enlarging to fit) — this just reuses the one `d3.pack()` call already
 * in this pipeline instead of adding a second, manual packing pass, matching this file's
 * existing pack-once-then-force-solve architecture. Legacy's special-cased formulas
 * (`radius_molecularweight`, `molecularweight`, `default`, `size`, generic linear-in-[1,50])
 * are preserved exactly as radius formulas, then squared into an area-equivalent weight since
 * `d3.pack()`'s `.sum()` expects weight proportional to area, not a literal radius. `radiusScale`
 * (legacy `radius_scale`, main.js:67, "Scale Radius by" input — confirmed live via
 * `js/ngl.js:864-865`/`main.js:3611-3617`, correcting an earlier pass that had wrongly called it
 * a dead control) is applied as a final multiplier on top of every formula, matching legacy.
 *
 * The five "Forces Options" tuning values (legacy `AllForces`, main.js:177-183) are exposed as
 * `ForceTuning` rather than hardcoded constants, so `RecipeCanvasToolbar.tsx` can offer the same
 * live sliders legacy does. Defaults for `surfaceForce`/`clusterByForce` deliberately do NOT copy
 * legacy's raw numbers (`0.5`/`0.01`) verbatim: those were tuned for a simulation that ticks
 * forever in a live animation loop, while this port ticks a fixed, bounded `TICKS` times — at
 * legacy's literal `0.01` cluster strength, 200 ticks produces no visible separation at all.
 * Defaults here (`DEFAULT_FORCES`) are re-tuned to be visually effective within that bounded
 * model while keeping the same knobs legacy exposes.
 */
import * as d3 from 'd3'
import { isIngredientNode, type IngredientData, type RecipeLink, type RecipeNode } from './types'
import { computePropertyMapping, type PropertyStats } from './propertyMapping'

export type PackedNode = d3.HierarchyCircularNode<RecipeNode>

export interface RecipeLayout {
  /** All nodes (compartments + ingredients), settled positions. */
  descendants: PackedNode[]
  /** `RecipeNode` (the tree data, e.g. a `RecipeLink`'s `source`/`target`) → its packed circle. */
  posMap: Map<RecipeNode, PackedNode>
}

export interface ForceTuning {
  /** "Scale Radius by" — legacy `radius_scale` (main.js:67) multiplies every `sizeBy` radius
   *  formula directly, before legacy's own `d3.packSiblings`/`d3.packEnclose` re-pack (which,
   *  unlike `d3.pack().size(...)`, packs circles at their literal given radii without
   *  renormalizing the whole diagram to fit a fixed container). This port's `d3.pack()` DOES
   *  auto-fit to a fixed `.size()` box, so multiplying every leaf's pack *weight* by the same
   *  constant would be a mathematical no-op (uniform scaling cancels out under box-fitting
   *  normalization) — confirmed by a failing test before this comment was written. Applied
   *  instead as a multiplier on the pack's own container dimensions, so the whole diagram
   *  (compartments and ingredients together) grows/shrinks as one, which is the actually
   *  observable effect a "Scale Radius by" control should have. Legacy default `1.0`. */
  radiusScale?: number
  /** Boundary-containment nudge for a leaf that drifts outside its parent's circle after
   *  collision — legacy `AllForces.ParentForce` (main.js:5468-5471). */
  parentForce?: number
  /** Pulls `data.surface===true` leaves toward their parent's boundary — legacy
   *  `AllForces.SurfaceForce` (main.js:5440-5452). */
  surfaceForce?: number
  /** `d3.forceLink` strength over `graph.links` — legacy `AllForces.LinkForce`
   *  (main.js:2867), pulling interaction-linked ingredients together. Previously not ported at
   *  all (only the link *line rendering* existed, no force). */
  linkForce?: number
  /** Pulls leaves sharing a `groupBy` value toward a shared cluster anchor — legacy
   *  `AllForces.clusterByForce` (main.js:5424-5437). */
  clusterByForce?: number
  /** Multiplies `forceCollide`'s strength — legacy `AllForces.collisionForce` (main.js:2874). */
  collisionForce?: number
}

export const DEFAULT_FORCES: Required<ForceTuning> = {
  radiusScale: 1.0,
  parentForce: 0.3,
  surfaceForce: 0.3,
  linkForce: 0.1,
  clusterByForce: 0.25,
  collisionForce: 1.0,
}

const TICKS = 200

/**
 * Radius formula per `sizeBy` mode, ported directly from `mapRadiusToProperty_cb`
 * (main.js:3609-3619) and `Util_getRadiusFromMW` (js/util.js:30-33, `radius_molecularweight`'s
 * volume-from-mass approximation, `V = mw*1.21`, sphere radius from volume). `radiusScale` is
 * NOT applied here — see `ForceTuning.radiusScale`'s docstring for why.
 */
function radiusForSizeBy(node: RecipeNode, sizeBy: string, propertyMapping: Record<string, PropertyStats>): number {
  const data = node.data as IngredientData
  if (sizeBy === 'radius_molecularweight') {
    const volume = data.molecularweight * 1.21
    return Math.cbrt((3 * volume) / (4 * Math.PI)) * 0.1
  }
  if (sizeBy === 'molecularweight') return Math.cbrt(data.molecularweight) * 0.1
  if (sizeBy === 'default') return 10
  if (sizeBy === 'size') return Math.max(data.size || 1, 0.1)
  const stats = propertyMapping[sizeBy]
  const value = data[sizeBy]
  if (typeof value === 'number' && stats && stats.max > stats.min) {
    // legacy: `d3.scaleLinear().domain([min(0,min),max]).range([1,50])`
    const t = (value - Math.min(0, stats.min)) / (stats.max - Math.min(0, stats.min))
    return 1 + t * 49
  }
  return Math.max(data.size || 1, 0.1) // legacy's `d.r<=0`/`isNaN(d.r)` fallback
}

/** Legacy `d.size` (main.js:5576's `.sum(d => d.size)`) — only leaves carry weight. Squares the
 *  `sizeBy` radius formula into an area-equivalent weight (see this file's docstring). */
function packWeight(node: RecipeNode, sizeBy: string, propertyMapping: Record<string, PropertyStats>): number {
  if (!isIngredientNode(node)) return 0
  const radius = radiusForSizeBy(node, sizeBy, propertyMapping)
  return Math.max(radius * radius, 0.01)
}

/**
 * One fixed anchor point per unique value of `groupBy` among a compartment's ingredient
 * children, evenly spaced on a ring inside the parent's circle — guarantees visual separation
 * between groups regardless of the packed layout's (arbitrary) initial ordering, unlike pulling
 * toward a self-referential running centroid (which can leave same-parent groups overlapping if
 * their initial positions happen to start close together).
 */
function clusterAnchors(parent: PackedNode, values: string[]): Map<string, [number, number]> {
  const unique = [...new Set(values)]
  const anchors = new Map<string, [number, number]>()
  const ringRadius = parent.r * 0.5
  unique.forEach((value, i) => {
    const angle = (2 * Math.PI * i) / unique.length
    anchors.set(value, [parent.x + Math.cos(angle) * ringRadius, parent.y + Math.sin(angle) * ringRadius])
  })
  return anchors
}

export function computeRecipeLayout(
  root: RecipeNode,
  groupBy: string | null,
  sizeBy: string,
  width: number,
  height: number,
  links: RecipeLink[] = [],
  tuning: ForceTuning = {},
): RecipeLayout {
  const { radiusScale, parentForce: parentForceStrength, surfaceForce: surfaceForceStrength, linkForce: linkForceStrength, clusterByForce: clusterForceStrength, collisionForce } = {
    ...DEFAULT_FORCES,
    ...tuning,
  }
  const hierarchy = d3.hierarchy(root, (d) => d.children)
  // Two-pass: `.sum()` needs `propertyMapping` (for a generic `sizeBy` property's min/max),
  // which needs every ingredient's data — gather that from the same hierarchy's own walk
  // before assigning weights, rather than requiring the caller to precompute it separately.
  const propertyMapping = computePropertyMapping(hierarchy.descendants().map((d) => d.data))
  hierarchy.sum((d) => packWeight(d, sizeBy, propertyMapping))
  // `radiusScale` scales the pack's own container dimensions (see `ForceTuning.radiusScale`'s
  // docstring) rather than individual weights, so the whole diagram grows/shrinks as one.
  const pack = d3.pack<RecipeNode>().size([(width - 8) * radiusScale, (height - 8) * radiusScale]).padding(3)
  const descendants = pack(hierarchy).descendants()
  const posMap = new Map<RecipeNode, PackedNode>(descendants.map((d) => [d.data, d]))

  // `d3.forceSimulation` mutates each node with `vx`/`vy` once constructed — cast once here
  // rather than at every access site below.
  type SimNode = PackedNode & { vx: number; vy: number }
  const leaves = descendants.filter((d) => isIngredientNode(d.data) && d.parent) as SimNode[]
  if (leaves.length === 0) return { descendants, posMap }

  // Group leaves by (parent, groupBy value) so each compartment gets its own set of anchors —
  // a "function" cluster in one compartment is unrelated to the same value in another.
  const anchorsByParent = new Map<PackedNode, Map<string, [number, number]>>()
  if (groupBy) {
    const byParent = new Map<PackedNode, string[]>()
    for (const leaf of leaves) {
      const parent = leaf.parent as PackedNode
      const value = String((leaf.data.data as IngredientData)[groupBy] ?? '')
      const values = byParent.get(parent) ?? []
      values.push(value)
      byParent.set(parent, values)
    }
    for (const [parent, values] of byParent) {
      anchorsByParent.set(parent, clusterAnchors(parent, values))
    }
  }

  const surfaceForce = (alpha: number) => {
    for (const leaf of leaves) {
      const data = leaf.data.data as IngredientData
      const parent = leaf.parent as PackedNode
      if (!data.surface) continue
      const dx = leaf.x - parent.x
      const dy = leaf.y - parent.y
      const dist = Math.hypot(dx, dy) || 1
      const targetR = Math.max(parent.r - leaf.r, 0)
      const tx = parent.x + (dx / dist) * targetR
      const ty = parent.y + (dy / dist) * targetR
      leaf.vx += (tx - leaf.x) * surfaceForceStrength * alpha
      leaf.vy += (ty - leaf.y) * surfaceForceStrength * alpha
    }
  }

  const clusterForce = (alpha: number) => {
    if (!groupBy) return
    for (const leaf of leaves) {
      const parent = leaf.parent as PackedNode
      const anchors = anchorsByParent.get(parent)
      if (!anchors) continue
      const value = String((leaf.data.data as IngredientData)[groupBy] ?? '')
      const anchor = anchors.get(value)
      if (!anchor) continue
      leaf.vx += (anchor[0] - leaf.x) * clusterForceStrength * alpha
      leaf.vy += (anchor[1] - leaf.y) * clusterForceStrength * alpha
    }
  }

  // Boundary-containment nudge for non-surface leaves that drift outside their parent's circle
  // after collision — legacy `AllForces.ParentForce` (main.js:5468-5471). Surface leaves are
  // excluded since `surfaceForce` already owns their boundary-seeking behavior. Simplified from
  // legacy's exact condition: this drops the `d.parent.parent` special-case (only correcting
  // leaves whose parent itself isn't a top-level compartment) since it doesn't have a clean
  // analog once packing nests compartments differently than legacy's own hierarchy walk.
  const parentContainmentForce = (alpha: number) => {
    for (const leaf of leaves) {
      const data = leaf.data.data as IngredientData
      if (data.surface) continue
      const parent = leaf.parent as PackedNode
      const dx = leaf.x - parent.x
      const dy = leaf.y - parent.y
      const dist = Math.hypot(dx, dy)
      if (dist + leaf.r * 1.2 <= parent.r - 5) continue
      leaf.vx += (parent.x - leaf.x) * parentForceStrength * alpha
      leaf.vy += (parent.y - leaf.y) * parentForceStrength * alpha
    }
  }

  // `d3.forceLink` over interaction links — legacy `AllForces.LinkForce` (main.js:2867), a real
  // force previously not ported at all (only the link *line rendering* existed). Only links whose
  // both endpoints resolve to a simulated leaf participate (e.g. a link to a compartment, which
  // isn't part of the force solve, is skipped) — object identity via `posMap` lets `d3.forceLink`
  // resolve endpoints directly without a string `.id()` accessor.
  const simLinks = links
    .map((link) => ({ source: posMap.get(link.source), target: posMap.get(link.target) }))
    .filter((l): l is { source: SimNode; target: SimNode } => leaves.includes(l.source as SimNode) && leaves.includes(l.target as SimNode))

  const simulation = d3
    .forceSimulation(leaves)
    .force('collide', d3.forceCollide<PackedNode>((d) => d.r).strength(collisionForce))
    .force('surface', surfaceForce)
    .force('cluster', clusterForce)
    .force('parent', parentContainmentForce)
    .force('link', d3.forceLink(simLinks).strength(linkForceStrength))
    .stop()

  for (let i = 0; i < TICKS; i++) simulation.tick()

  return { descendants, posMap }
}
