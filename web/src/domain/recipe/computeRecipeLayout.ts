/**
 * Recipe-canvas layout: one-shot `d3.hierarchy`+`d3.pack` circle-packing. This is now purely
 * geometric — every dynamic-physics concern (the membrane/surface constraint, "group by
 * property" cluster attraction, parent-boundary containment, and the interaction-link spring)
 * lives in `recipeForces.ts` (the force math) and `useRecipeSimulation.ts` (the live simulation
 * that wires those forces up and owns their lifecycle), not here.
 *
 * This split replaces an earlier architecture where this same function also ran a *synchronous,
 * bounded* `d3-force` solve (tick a fixed 200 times in a plain loop, then discard) before
 * returning. That bounded model was itself a deliberate departure from legacy's actual behavior —
 * legacy runs a live, continuously-ticking simulation that reheats on drag/mouse-enter/structural
 * edits and never fully stops (`main.js:2928-2942`, `AllForces`-driven velocity nudges every
 * frame in `drawNode`, main.js:5417-5484) — and it showed: because every `recipeStore` mutation
 * (including a pure recolor) produces a new `graph` object, ANY store change re-triggered the
 * entire bounded solve from a fresh pack seed, so the canvas "snapped" to a new static image
 * instead of visibly flowing, unlike legacy's springy feel. `useRecipeSimulation.ts` now owns a
 * real live simulation instead, and this function's only remaining job is producing that
 * simulation's *initial* seed positions/radii — see that file for the full live-vs-bounded
 * rationale and lifecycle.
 *
 * `sizeBy` (the "Node size" dropdown, legacy `mapRadiusToProperty`/`mapRadiusToProperty_cb`,
 * main.js:3597-3646) is folded into the pack weight fed to `d3.pack()`'s own `.sum()`, rather
 * than replicating legacy's approach of setting `d.r` directly then manually re-packing each
 * compartment via `d3.packSiblings`/`d3.packEnclose` and restarting the force simulation. Both
 * produce the same visible outcome (ingredients sized proportionally to whichever property is
 * selected, compartments enlarging to fit) — this just reuses the one `d3.pack()` call already
 * in this pipeline instead of adding a second, manual packing pass. Legacy's special-cased
 * formulas (`radius_molecularweight`, `molecularweight`, `default`, `size`, generic
 * linear-in-[1,50]) are preserved exactly as radius formulas, then squared into an
 * area-equivalent weight since `d3.pack()`'s `.sum()` expects weight proportional to area, not a
 * literal radius. `radiusScale` (legacy `radius_scale`, main.js:67, "Scale Radius by" input —
 * confirmed live via `js/ngl.js:864-865`/`main.js:3611-3617`, correcting an earlier pass that had
 * wrongly called it a dead control) is applied as a multiplier on the pack's own container
 * dimensions (NOT on individual weights — `d3.pack().size(...)` auto-fits to a fixed container
 * box, so uniformly scaling every leaf's weight by the same constant would be a mathematical
 * no-op; confirmed by a failing test before this comment was written), so the whole diagram
 * (compartments and ingredients together) grows/shrinks as one, which is the actually observable
 * effect a "Scale Radius by" control should have.
 */
import * as d3 from 'd3'
import { isIngredientNode, type IngredientData, type RecipeNode } from './types'
import { computePropertyMapping, type PropertyStats } from './propertyMapping'

export type PackedNode = d3.HierarchyCircularNode<RecipeNode>

export interface RecipeLayout {
  /** All nodes (compartments + ingredients), initial packed positions. */
  descendants: PackedNode[]
  /** `RecipeNode` (the tree data, e.g. a `RecipeLink`'s `source`/`target`) → its packed circle. */
  posMap: Map<RecipeNode, PackedNode>
}

/**
 * Radius formula per `sizeBy` mode, ported directly from `mapRadiusToProperty_cb`
 * (main.js:3609-3619) and `Util_getRadiusFromMW` (js/util.js:30-33, `radius_molecularweight`'s
 * volume-from-mass approximation, `V = mw*1.21`, sphere radius from volume).
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
  // Give an empty compartment a small but real editing target. A completely empty recipe used to
  // feed total weight 0 into d3.pack(), producing NaN radii; an empty compartment added beside
  // ingredients similarly collapsed to an invisible 0px ring that could not be grabbed. Weight
  // 100 corresponds to the default ingredient radius (10²), large enough to see/drag without
  // materially dominating a populated recipe. Non-empty compartments still derive their area
  // entirely from their descendants.
  if (!isIngredientNode(node)) return node.children?.length ? 0 : 100
  const radius = radiusForSizeBy(node, sizeBy, propertyMapping)
  return Math.max(radius * radius, 0.01)
}

export function computeRecipeLayout(root: RecipeNode, sizeBy: string, radiusScale: number, width: number, height: number): RecipeLayout {
  const hierarchy = d3.hierarchy(root, (d) => d.children)
  // `.sum()` needs `propertyMapping` (for a generic `sizeBy` property's min/max), which needs
  // every ingredient's data — gather that from the same hierarchy's own walk before assigning
  // weights, rather than requiring the caller to precompute it separately.
  const propertyMapping = computePropertyMapping(hierarchy.descendants().map((d) => d.data))
  hierarchy.sum((d) => packWeight(d, sizeBy, propertyMapping))
  // `radiusScale` scales the pack's own container dimensions (see this file's docstring) rather
  // than individual weights, so the whole diagram grows/shrinks as one.
  const pack = d3.pack<RecipeNode>().size([(width - 8) * radiusScale, (height - 8) * radiusScale]).padding(3)
  const descendants = pack(hierarchy).descendants()
  const posMap = new Map<RecipeNode, PackedNode>(descendants.map((d) => [d.data, d]))
  return { descendants, posMap }
}
