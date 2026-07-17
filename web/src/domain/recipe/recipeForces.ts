/**
 * Recipe-canvas custom D3 forces — the 3 hand-rolled velocity nudges (membrane/surface
 * constraint, "group by property" cluster attraction, parent-boundary containment) that
 * `d3.pack()` alone doesn't produce. Extracted out of `computeRecipeLayout.ts` (which now only
 * does one-shot pack geometry) so `useRecipeSimulation.ts` can wire them into a live,
 * continuously-ticking simulation instead of the bounded one-shot solve this file's logic used
 * to live inside — see `useRecipeSimulation.ts`'s docstring for the live-simulation architecture.
 *
 * Each factory takes a `StrengthRef` (a `{ current: number }` box) for its strength, not a plain
 * number captured at creation time — the returned force function dereferences `.current` on
 * every call, matching legacy's own model (`js/main.js`'s `drawNode` reads the mutable global
 * `AllForces` fresh every single tick, main.js:5417-5484). This is what lets a live "Forces
 * Options" slider change take effect immediately on an already-running simulation without
 * tearing it down and recreating it — see `useRecipeSimulation.ts`'s UPDATE lifecycle tier.
 *
 * `createClusterForce` is the one exception: its `anchorsByParent` map is captured at creation
 * time, not read through a ref, because a `groupBy` change is itself a REHEAT that rebuilds this
 * force from scratch (the anchors themselves are meaningless once the grouping key changes) —
 * see `useRecipeSimulation.ts`.
 */
import type { CompartmentData, IngredientData } from './types'
import type { PackedNode } from './computeRecipeLayout'

/** A packed node once it's joined the live simulation — `d3.forceSimulation` mutates each node
 *  with `vx`/`vy`/`index` once constructed, and `fx`/`fy` are set/cleared by drag (`pin`/
 *  `release` in `useRecipeSimulation.ts`) to temporarily fix a node's position. */
export type SimNode = PackedNode & { vx: number; vy: number; fx?: number | null; fy?: number | null; index?: number }

/** A mutable live-value box — see this file's docstring for why forces read through one instead
 *  of capturing a plain number at creation time. */
export interface StrengthRef {
  current: number
}

/** Half of a compartment's membrane band in canvas units. The synthetic root is a layout frame,
 * not a biological membrane, so it intentionally contributes no thickness. */
export function membraneHalfThickness(node: PackedNode): number {
  if (!node.parent || node.data.data.nodetype !== 'compartment') return 0
  return Math.max(Number((node.data.data as CompartmentData).thickness) || 0, 0) / 2
}

function isPackedAncestor(candidate: PackedNode, node: PackedNode): boolean {
  let current = node.parent as PackedNode | null
  while (current) {
    if (current === candidate) return true
    current = current.parent as PackedNode | null
  }
  return false
}

/**
 * Hard geometric containment applied after every simulation tick and while dragging. The
 * velocity forces below create the organic motion, but a cooling simulation cannot guarantee an
 * invariant: once alpha approaches zero, a weak surface force can leave a membrane ingredient
 * visibly inside its compartment. This projection makes the biological rule exact:
 *
 * - surface ingredients sit with their centre on the middle of the parent membrane band;
 * - interior ingredients stay fully inside the membrane's inner edge.
 *
 * The radial velocity component is removed when a projection occurs so the following tick does
 * not immediately push the node back across the boundary. Tangential velocity is preserved,
 * allowing surface ingredients to slide naturally around the membrane.
 */
export function constrainLeafToParent(leaf: SimNode): void {
  const parent = leaf.parent as PackedNode | null
  if (!parent) return

  const data = leaf.data.data as IngredientData
  const dx = leaf.x - parent.x
  const dy = leaf.y - parent.y
  const distance = Math.hypot(dx, dy)
  const maxDistance = Math.max(parent.r - membraneHalfThickness(parent) - leaf.r, 0)

  if (!data.surface && distance <= maxDistance) return

  // A perfectly centred node has no radial direction. Use +X deterministically instead of
  // introducing random jitter, which would make screenshots/tests and first render unstable.
  const ux = distance > 1e-6 ? dx / distance : 1
  const uy = distance > 1e-6 ? dy / distance : 0
  const targetDistance = data.surface ? parent.r : Math.min(distance, maxDistance)
  leaf.x = parent.x + ux * targetDistance
  leaf.y = parent.y + uy * targetDistance

  const radialVelocity = leaf.vx * ux + leaf.vy * uy
  if ((data.surface && radialVelocity !== 0) || (!data.surface && radialVelocity > 0)) {
    leaf.vx -= radialVelocity * ux
    leaf.vy -= radialVelocity * uy
  }
}

/**
 * Treat every unrelated, visible compartment as a solid circular obstacle. A leaf is allowed
 * inside its own parent and all of that parent's ancestors, but it may not cross the outer edge
 * of any sibling/cousin compartment. This is a hard post-tick projection because a cooled D3
 * force cannot by itself guarantee collision invariants.
 *
 * Multiple passes resolve the common case where one projection pushes a leaf into a neighbouring
 * compartment. The data sets are recipe-sized, so the O(leaves × compartments) pass remains
 * tiny compared with SVG rendering.
 */
export function constrainLeafAgainstCompartments(leaf: SimNode, compartments: PackedNode[]): void {
  for (let pass = 0; pass < 3; pass += 1) {
    let moved = false
    for (const compartment of compartments) {
      if (!compartment.parent || compartment === leaf.parent || isPackedAncestor(compartment, leaf)) continue

      const dx = leaf.x - compartment.x
      const dy = leaf.y - compartment.y
      const distance = Math.hypot(dx, dy)
      const minimumDistance = compartment.r + membraneHalfThickness(compartment) + leaf.r
      if (distance >= minimumDistance) continue

      // If centres coincide, prefer the leaf's velocity as a deterministic escape direction;
      // fall back to +X when it is stationary too.
      const velocityLength = Math.hypot(leaf.vx, leaf.vy)
      const ux = distance > 1e-6 ? dx / distance : velocityLength > 1e-6 ? leaf.vx / velocityLength : 1
      const uy = distance > 1e-6 ? dy / distance : velocityLength > 1e-6 ? leaf.vy / velocityLength : 0
      leaf.x = compartment.x + ux * minimumDistance
      leaf.y = compartment.y + uy * minimumDistance

      // Remove only velocity travelling back into the obstacle. Tangential and outward motion
      // remain, which keeps dragging and the live simulation feeling natural.
      const radialVelocity = leaf.vx * ux + leaf.vy * uy
      if (radialVelocity < 0) {
        leaf.vx -= radialVelocity * ux
        leaf.vy -= radialVelocity * uy
      }
      moved = true
    }
    if (!moved) break
  }
}

/**
 * Pulls `data.surface===true` leaves toward their parent compartment's boundary — legacy
 * `AllForces.SurfaceForce` (main.js:5440-5452).
 */
export function createSurfaceForce(leaves: SimNode[], strength: StrengthRef): (alpha: number) => void {
  return (alpha) => {
    for (const leaf of leaves) {
      const data = leaf.data.data as IngredientData
      const parent = leaf.parent as PackedNode
      if (!data.surface) continue
      const dx = leaf.x - parent.x
      const dy = leaf.y - parent.y
      const dist = Math.hypot(dx, dy) || 1
      const targetR = parent.r
      const tx = parent.x + (dx / dist) * targetR
      const ty = parent.y + (dy / dist) * targetR
      leaf.vx += (tx - leaf.x) * strength.current * alpha
      leaf.vy += (ty - leaf.y) * strength.current * alpha
    }
  }
}

/**
 * One fixed anchor point per unique value of `groupBy` among a compartment's ingredient
 * children, evenly spaced on a ring inside the parent's circle — guarantees visual separation
 * between groups regardless of the packed layout's (arbitrary) initial ordering, unlike pulling
 * toward a self-referential running centroid (which can leave same-parent groups overlapping if
 * their initial positions happen to start close together).
 */
export function clusterAnchors(parent: PackedNode, values: string[]): Map<string, [number, number]> {
  const unique = [...new Set(values)]
  const anchors = new Map<string, [number, number]>()
  const ringRadius = parent.r * 0.5
  unique.forEach((value, i) => {
    const angle = (2 * Math.PI * i) / unique.length
    anchors.set(value, [parent.x + Math.cos(angle) * ringRadius, parent.y + Math.sin(angle) * ringRadius])
  })
  return anchors
}

/** Groups `leaves` by parent, building one `clusterAnchors` ring per compartment — a "function"
 *  cluster in one compartment is unrelated to the same value in another. Returns an empty map
 *  when `groupBy` is `null` (no grouping requested). */
export function buildClusterAnchors(leaves: SimNode[], groupBy: string | null): Map<PackedNode, Map<string, [number, number]>> {
  const anchorsByParent = new Map<PackedNode, Map<string, [number, number]>>()
  if (!groupBy) return anchorsByParent
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
  return anchorsByParent
}

/**
 * Pulls leaves sharing a `groupBy` value toward a shared cluster anchor — legacy
 * `AllForces.clusterByForce` (main.js:5424-5437).
 */
export function createClusterForce(
  leaves: SimNode[],
  groupBy: string | null,
  anchorsByParent: Map<PackedNode, Map<string, [number, number]>>,
  strength: StrengthRef,
): (alpha: number) => void {
  return (alpha) => {
    if (!groupBy) return
    for (const leaf of leaves) {
      const parent = leaf.parent as PackedNode
      const anchors = anchorsByParent.get(parent)
      if (!anchors) continue
      const value = String((leaf.data.data as IngredientData)[groupBy] ?? '')
      const anchor = anchors.get(value)
      if (!anchor) continue
      leaf.vx += (anchor[0] - leaf.x) * strength.current * alpha
      leaf.vy += (anchor[1] - leaf.y) * strength.current * alpha
    }
  }
}

/**
 * Boundary-containment nudge for non-surface leaves that drift outside their parent's circle
 * after collision — legacy `AllForces.ParentForce` (main.js:5468-5471). Surface leaves are
 * excluded since `createSurfaceForce` already owns their boundary-seeking behavior. Simplified
 * from legacy's exact condition: this drops the `d.parent.parent` special-case (only correcting
 * leaves whose parent itself isn't a top-level compartment) since it doesn't have a clean analog
 * once packing nests compartments differently than legacy's own hierarchy walk.
 */
export function createParentContainmentForce(leaves: SimNode[], strength: StrengthRef): (alpha: number) => void {
  return (alpha) => {
    for (const leaf of leaves) {
      const data = leaf.data.data as IngredientData
      if (data.surface) continue
      const parent = leaf.parent as PackedNode
      const dx = leaf.x - parent.x
      const dy = leaf.y - parent.y
      const dist = Math.hypot(dx, dy)
      if (dist + leaf.r * 1.2 <= parent.r - membraneHalfThickness(parent)) continue
      leaf.vx += (parent.x - leaf.x) * strength.current * alpha
      leaf.vy += (parent.y - leaf.y) * strength.current * alpha
    }
  }
}
