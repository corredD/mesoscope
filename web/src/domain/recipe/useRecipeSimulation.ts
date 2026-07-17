/**
 * Owns the recipe canvas's LIVE, continuously-ticking `d3.forceSimulation` — the replacement for
 * the earlier synchronous, bounded-tick solve `computeRecipeLayout.ts` used to run internally.
 * That bounded model computed a fixed 200 ticks once per change and froze the result; because
 * every `recipeStore` mutation (including a pure recolor) produces a new `graph` object, ANY
 * store change re-triggered the entire solve from a fresh pack seed, so the canvas "snapped" to
 * a new static image on every edit instead of visibly flowing — unlike legacy's actual behavior,
 * a simulation that never fully stops (`js/main.js:2928-2942`) and reheats on drag/mouse-enter/
 * structural edits (`simulation.alphaTarget(0.3).restart()` on drag-start, main.js:5106-5169;
 * `simulation.alpha(1).alphaTarget(0).restart()` on add-link/add-ingredient, main.js:4627,4748).
 *
 * This hook reproduces that liveness while keeping SVG rendering (confirmed with the user over a
 * canvas-2D rewrite — reuses the existing sprite/label/legend/context-menu JSX almost entirely
 * unchanged). Core principle: **React owns appearance, the tick handler owns geometry,
 * imperatively.** Position (`transform="translate(x,y)"` on each leaf's `<g>`, `x1/y1/x2/y2` on
 * each link's `<line>`/`<linearGradient>`) is written directly to DOM refs on every tick,
 * bypassing React `setState` entirely — a per-tick `setState` would re-render the whole SVG tree
 * up to 60 times a second, defeating the entire point. `descendants`/`posMap` are only pushed
 * into React state at CREATE/REHEAT time (mounting/unmounting the actual set of DOM nodes);
 * reading `.x`/`.y` off any `PackedNode` obtained from that state (or from `posMap.get(...)`)
 * still reflects the live, currently-simulated position at any later point, because `d3`
 * mutates node objects in place every tick rather than replacing them — this is what lets
 * `RecipeCanvas.tsx`'s drop-target hit-testing during a drag see live positions "for free."
 *
 * Three lifecycle tiers, matching legacy's own three tiers of "how much does a change cost":
 *
 * - **CREATE** (full repack + brand-new simulation, old one `.stop()`ed): triggered by a
 *   `structuralSignature` (node identity + parent edges — NOT `graph`'s object reference, which
 *   changes on every mutation including pure recoloring; see `useStructuralSignature` below) or
 *   by `sizeBy`/`radiusScale`/`width`/`height`, all of which feed `d3.pack`'s weights/container
 *   size directly and therefore invalidate the whole pack, not just force tuning.
 * - **REHEAT** (same pack/leaves, force config recomputed, `simulation.alpha(1).restart()`):
 *   triggered by `groupBy` changing (new cluster anchors) or a `linksSignature` changing
 *   (add/delete/edit a link — rebinds `.force('link').links(...)` without a repack, since link
 *   topology doesn't affect the pack/hierarchy shape at all).
 * - **UPDATE** (live strength mutation, gentle alpha nudge, no restart-from-scratch): triggered
 *   by the 5 "Forces Options" sliders. The 3 custom forces (`recipeForces.ts`) read their
 *   strength through a live ref/getter every call, so they need no explicit push at all; only the
 *   2 d3-built-in forces (`collide`/`link`) cache `.strength(x)` at call time and need an
 *   explicit re-set here. `strokeWidth`/`colorMode`/`minColor`/`maxColor` never reach this hook —
 *   pure appearance, handled entirely by `RecipeCanvas.tsx`'s existing `colorCtx` memo.
 *
 * Compartments do not join the continuously-ticking force solve, but they are directly movable:
 * dragging one translates its complete packed subtree rigidly, temporarily pins descendant
 * leaves, and rebuilds absolute cluster anchors on release. This gives compartments predictable
 * direct manipulation without inventing a second nested parent/child force system. `d3.pack()`
 * still provides the initial non-overlapping sibling/cousin layout.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { nodeKey, isIngredientNode, type RecipeGraph, type RecipeLink, type RecipeNode } from './types'
import { computeRecipeLayout, type PackedNode, type RecipeLayout } from './computeRecipeLayout'
import {
  buildClusterAnchors,
  constrainLeafAgainstCompartments,
  constrainLeafToParent,
  createClusterForce,
  createParentContainmentForce,
  createSurfaceForce,
  membraneHalfThickness,
  type SimNode,
  type StrengthRef,
} from './recipeForces'

export interface ForceTuning {
  /** "Scale Radius by" — see `computeRecipeLayout.ts`'s docstring. Legacy default `1.0`. */
  radiusScale: number
  /** Boundary-containment nudge for a leaf that drifts outside its parent's circle after
   *  collision — legacy `AllForces.ParentForce` (main.js:5468-5471). */
  parentForce: number
  /** Pulls `data.surface===true` leaves toward their parent's boundary — legacy
   *  `AllForces.SurfaceForce` (main.js:5440-5452). */
  surfaceForce: number
  /** `d3.forceLink` strength over `graph.links` — legacy `AllForces.LinkForce` (main.js:2867),
   *  pulling interaction-linked ingredients together. */
  linkForce: number
  /** Pulls leaves sharing a `groupBy` value toward a shared cluster anchor — legacy
   *  `AllForces.clusterByForce` (main.js:5424-5437). */
  clusterByForce: number
  /** Multiplies `forceCollide`'s strength — legacy `AllForces.collisionForce` (main.js:2874). */
  collisionForce: number
}

/**
 * Defaults, re-derived for a live simulation rather than carried over from the bounded-tick
 * model's tuning. The bounded model needed `surfaceForce`/`clusterByForce` far stronger than
 * legacy's own raw numbers (0.3/0.25 vs legacy's 0.5/0.01) purely because a fixed 200-tick
 * ceiling doesn't give a weak force enough time to visibly separate anything. A live simulation
 * that runs to `alphaMin` via real exponential decay (effectively thousands of ticks) doesn't
 * have that ceiling, so legacy's own raw values are the correct starting point again — freezing
 * the bounded-tick-tuned numbers into a live model would over-apply them indefinitely.
 */
export const DEFAULT_FORCES: ForceTuning = {
  radiusScale: 1.0,
  parentForce: 0.01,
  surfaceForce: 0.5,
  linkForce: 0.1,
  clusterByForce: 0.01,
  collisionForce: 1.0,
}

export interface SimLinkEntry {
  source: SimNode
  target: SimNode
}

/** Ref-callback signature React expects for a given element type. */
type RefCallback<El> = (el: El | null) => void

export interface RecipeSimulationHandle {
  descendants: PackedNode[]
  posMap: Map<RecipeNode, PackedNode>
  /** Moves `node` to `(x, y)` and reheats the simulation. Ingredients are projected/temporarily
   *  fixed with `fx`/`fy`; compartments translate and pin their complete packed subtree. The root
   *  is intentionally immovable because viewport pan already moves the whole recipe. */
  pin: (node: RecipeNode, x: number, y: number) => void
  /** Clears `fx`/`fy` and lets the simulation cool — legacy's drag-end (`alphaTarget(0)`,
   *  main.js:5229). */
  release: (node: RecipeNode) => void
  /** Returns a STABLE ref-callback for a leaf's `<g>`, cached per node — deliberately not a plain
   *  inline `(el) => ...` closure built fresh in JSX: React re-invokes a ref (detach-old,
   *  attach-new) whenever the callback's *identity* changes between renders, so an inline closure
   *  would fire on every unrelated re-render (e.g. a hover-state change elsewhere on the canvas),
   *  re-stamping the stale position each time from this function's own initial-apply step and
   *  undoing whatever the tick handler had already moved it to. Caching one callback per node
   *  (reused across renders) is what makes the callback fire only on genuine mount/unmount.
   *  Compartments use this too; their transform is updated imperatively during a rigid-subtree
   *  drag even though they are not continuously simulated. */
  getNodeRef: (node: RecipeNode) => RefCallback<SVGGElement>
  /** Same stable-callback-per-key pattern as `getNodeRef`, for a link's `<line>`. */
  getLinkLineRef: (link: RecipeLink) => RefCallback<SVGLineElement>
  /** Same stable-callback-per-key pattern as `getNodeRef`, for a link's `<linearGradient>`
   *  (positions the `userSpaceOnUse` gradient axis along the line — stop colors stay ordinary
   *  React props, only the axis coordinates are imperative). */
  getLinkGradientRef: (link: RecipeLink) => RefCallback<SVGLinearGradientElement>
}

/** Node identity + parent edges, joined into a string — changes exactly when the tree SHAPE
 *  changes (add/delete/reparent), not when unrelated node data mutates in place (recolor, rename,
 *  updateIngredient), unlike using `graph`'s object reference (which `recipeStore` replaces on
 *  every single mutation). Comparing this VALUE (not the `graph` object) as an effect dependency
 *  is what stops a pure recolor from tearing down and rebuilding the whole live simulation. */
function structuralSignature(graph: RecipeGraph | null): string {
  if (!graph) return ''
  return graph.nodes.map((n) => `${nodeKey(n)}:${n.parent ? nodeKey(n.parent) : '-'}`).join(',')
}

/** Link identity + endpoints, joined into a string — changes exactly when links are added,
 *  removed, or re-pointed at a different endpoint (`setLinkEndpoint`), which is what the spring
 *  force's topology actually depends on; editing a link's other fields (name/pdb/selection)
 *  doesn't change this and correctly doesn't reheat the simulation. */
function linksSignature(graph: RecipeGraph | null): string {
  if (!graph) return ''
  return graph.links.map((l) => `${l.id}:${nodeKey(l.source)}:${nodeKey(l.target)}`).join(',')
}

/** Links whose BOTH endpoints are currently-simulated leaves — the only ones `d3.forceLink` can
 *  meaningfully pull together. A link to a compartment (or to a leaf before the first CREATE)
 *  is excluded from the spring force, but is still rendered and still gets its line/gradient
 *  position kept current every tick — see `applyLinkPosition` below, which resolves ALL rendered
 *  links fresh through `posMap` rather than this narrower, force-only subset. Exported for direct
 *  unit testing (`recipe-forces.test.ts`) — this is the "wiring" the 2 d3-built-in forces
 *  (`collide`/`link`) depend on, worth testing in isolation from a live simulation instance. */
export function buildSimLinks(links: RecipeLink[], posMap: Map<RecipeNode, PackedNode>, leaves: SimNode[]): SimLinkEntry[] {
  const leafSet = new Set(leaves)
  const entries: SimLinkEntry[] = []
  for (const link of links) {
    const source = posMap.get(link.source) as SimNode | undefined
    const target = posMap.get(link.target) as SimNode | undefined
    if (source && target && leafSet.has(source) && leafSet.has(target)) {
      entries.push({ source, target })
    }
  }
  return entries
}

/** Clamp a movable non-root packed node so its full outer membrane remains inside its parent's
 * inner membrane edge. The root has zero logical membrane thickness (it is only a layout frame). */
export function clampPackedNodeToParent(node: PackedNode, x: number, y: number): [number, number] {
  const parent = node.parent as PackedNode | null
  if (!parent) return [node.x, node.y]
  const dx = x - parent.x
  const dy = y - parent.y
  const distance = Math.hypot(dx, dy)
  const maxDistance = Math.max(parent.r - membraneHalfThickness(parent) - node.r - membraneHalfThickness(node), 0)
  if (distance <= maxDistance || distance === 0) return [x, y]
  const scale = maxDistance / distance
  return [parent.x + dx * scale, parent.y + dy * scale]
}

function packedNodesAreRelated(a: PackedNode, b: PackedNode): boolean {
  let current: PackedNode | null = a
  while (current) {
    if (current === b) return true
    current = current.parent as PackedNode | null
  }
  current = b
  while (current) {
    if (current === a) return true
    current = current.parent as PackedNode | null
  }
  return false
}

/** Resolve a dragged compartment against unrelated compartment membranes. Ancestors and
 * descendants intentionally overlap by definition; siblings and cousins remain disjoint. */
export function constrainPackedNodeAgainstCompartments(
  node: PackedNode,
  requestedX: number,
  requestedY: number,
  compartments: PackedNode[],
): [number, number] {
  let [x, y] = clampPackedNodeToParent(node, requestedX, requestedY)
  for (let pass = 0; pass < 4; pass += 1) {
    let moved = false
    for (const obstacle of compartments) {
      if (!obstacle.parent || packedNodesAreRelated(node, obstacle)) continue
      const dx = x - obstacle.x
      const dy = y - obstacle.y
      const distance = Math.hypot(dx, dy)
      const minimumDistance = node.r + membraneHalfThickness(node) + obstacle.r + membraneHalfThickness(obstacle)
      if (distance >= minimumDistance) continue
      const ux = distance > 1e-6 ? dx / distance : node.x !== obstacle.x || node.y !== obstacle.y ? (node.x - obstacle.x) / Math.hypot(node.x - obstacle.x, node.y - obstacle.y) : 1
      const uy = distance > 1e-6 ? dy / distance : node.x !== obstacle.x || node.y !== obstacle.y ? (node.y - obstacle.y) / Math.hypot(node.x - obstacle.x, node.y - obstacle.y) : 0
      ;[x, y] = clampPackedNodeToParent(node, obstacle.x + ux * minimumDistance, obstacle.y + uy * minimumDistance)
      moved = true
    }
    if (!moved) break
  }
  return [x, y]
}

/**
 * Move a compartment and every packed descendant as one rigid subtree. Returns the moved nodes so
 * the caller can update their DOM transforms and pin simulated leaves for the drag duration.
 */
export function translatePackedSubtree(node: PackedNode, requestedX: number, requestedY: number, compartments: PackedNode[] = []): PackedNode[] {
  const [targetX, targetY] = constrainPackedNodeAgainstCompartments(node, requestedX, requestedY, compartments)
  const dx = targetX - node.x
  const dy = targetY - node.y
  const descendants = node.descendants()
  for (const descendant of descendants) {
    descendant.x += dx
    descendant.y += dy
  }
  return descendants
}

export function useRecipeSimulation(
  root: RecipeNode | null,
  graph: RecipeGraph | null,
  groupBy: string | null,
  sizeBy: string,
  width: number,
  height: number,
  tuning: ForceTuning,
): RecipeSimulationHandle {
  const [layout, setLayout] = useState<RecipeLayout>({ descendants: [], posMap: new Map() })

  const simulationRef = useRef<d3.Simulation<SimNode, SimLinkEntry> | null>(null)
  const leavesRef = useRef<SimNode[]>([])
  const posMapRef = useRef(layout.posMap)
  const tuningRef = useRef(tuning)
  tuningRef.current = tuning
  const groupByRef = useRef(groupBy)
  groupByRef.current = groupBy

  const nodeElsRef = useRef(new Map<RecipeNode, SVGGElement>())
  const linkLineElsRef = useRef(new Map<RecipeLink, SVGLineElement>())
  const linkGradientElsRef = useRef(new Map<RecipeLink, SVGLinearGradientElement>())
  // Cached, stable ref-callbacks — one per node/link, reused across renders. See
  // `RecipeSimulationHandle.getNodeRef`'s docstring for why this cache (rather than an inline
  // per-render closure) is load-bearing, not just an optimization.
  const nodeRefCallbacksRef = useRef(new Map<RecipeNode, RefCallback<SVGGElement>>())
  const linkLineRefCallbacksRef = useRef(new Map<RecipeLink, RefCallback<SVGLineElement>>())
  const linkGradientRefCallbacksRef = useRef(new Map<RecipeLink, RefCallback<SVGLinearGradientElement>>())
  // ALL currently-rendered links (unfiltered by spring-force eligibility) — see
  // `applyLinkPosition`'s docstring for why the tick handler needs this broader list rather than
  // just `simLinksRef`'s spring-participant subset.
  const renderLinksRef = useRef<RecipeLink[]>([])

  // Live-value getters for the 3 custom forces — created once per hook instance (stable
  // identity across CREATE/REHEAT cycles) since they close over `tuningRef`, not the values
  // themselves. This is what lets a "Forces Options" slider change take effect on an
  // already-running simulation with no explicit push — see this file's docstring, UPDATE tier.
  const parentForceRef = useMemo<StrengthRef>(() => ({ get current() { return tuningRef.current.parentForce } }), [])
  const surfaceForceRef = useMemo<StrengthRef>(() => ({ get current() { return tuningRef.current.surfaceForce } }), [])
  const clusterByForceRef = useMemo<StrengthRef>(() => ({ get current() { return tuningRef.current.clusterByForce } }), [])

  const structSig = useMemo(() => structuralSignature(graph), [graph])
  const linksSig = useMemo(() => linksSignature(graph), [graph])

  function applyNodeTransform(node: RecipeNode, x: number, y: number) {
    const el = nodeElsRef.current.get(node)
    if (el) el.setAttribute('transform', `translate(${x},${y})`)
  }

  /** Resolves `link`'s endpoints fresh through `posMapRef` every call (not through a pre-resolved
   *  `SimLinkEntry`) — this is what keeps a link's line/gradient current even when one or both
   *  endpoints aren't part of the spring force (e.g. a link to a compartment; or a
   *  link between two leaves that just hasn't been included in `d3.forceLink` for some reason).
   *  Both endpoint kinds live in the same `posMap` and both get mutated in place by whatever DOES
   *  move them (the simulation for leaves, direct manipulation for compartments), so a uniform lookup here is
   *  always correct regardless of which case applies. */
  function applyLinkPosition(link: RecipeLink) {
    const source = posMapRef.current.get(link.source)
    const target = posMapRef.current.get(link.target)
    if (!source || !target) return
    const line = linkLineElsRef.current.get(link)
    if (line) {
      line.setAttribute('x1', String(source.x))
      line.setAttribute('y1', String(source.y))
      line.setAttribute('x2', String(target.x))
      line.setAttribute('y2', String(target.y))
    }
    const gradient = linkGradientElsRef.current.get(link)
    if (gradient) {
      gradient.setAttribute('x1', String(source.x))
      gradient.setAttribute('y1', String(source.y))
      gradient.setAttribute('x2', String(target.x))
      gradient.setAttribute('y2', String(target.y))
    }
  }

  const simLinksRef = useRef<SimLinkEntry[]>([])
  // A drag can pin one ingredient or every simulated ingredient inside a compartment subtree.
  // Keep the exact set so release() clears only the nodes fixed by that gesture.
  const dragPinsRef = useRef(new Map<RecipeNode, SimNode[]>())

  // CREATE — full repack + brand-new simulation. See this file's docstring for exactly what
  // does/doesn't trigger this tier.
  useEffect(() => {
    if (!root || !graph) {
      simulationRef.current?.stop()
      simulationRef.current = null
      leavesRef.current = []
      simLinksRef.current = []
      renderLinksRef.current = []
      posMapRef.current = new Map()
      setLayout({ descendants: [], posMap: new Map() })
      return
    }

    const { descendants, posMap } = computeRecipeLayout(root, sizeBy, tuning.radiusScale, width, height)
    posMapRef.current = posMap
    renderLinksRef.current = graph.links

    const leaves = descendants.filter((d) => isIngredientNode(d.data) && d.parent) as SimNode[]
    const compartments = descendants.filter((d) => d.data.data.nodetype === 'compartment')
    leavesRef.current = leaves

    // Apply each already-registered leaf's/link's initial position immediately — covers the case
    // where React re-renders and re-registers the SAME DOM elements across a CREATE (identity
    // preserved by `key={nodeKey(node)}`/`key={link.id}` in RecipeCanvas.tsx) before the first
    // tick fires.
    for (const leaf of leaves) applyNodeTransform(leaf.data, leaf.x, leaf.y)
    for (const link of graph.links) applyLinkPosition(link)

    if (leaves.length === 0) {
      simulationRef.current?.stop()
      simulationRef.current = null
      simLinksRef.current = []
      setLayout({ descendants, posMap })
      return
    }

    const anchorsByParent = buildClusterAnchors(leaves, groupBy)
    const simLinks = buildSimLinks(graph.links, posMap, leaves)
    simLinksRef.current = simLinks

    const sim = d3
      .forceSimulation(leaves)
      .force('collide', d3.forceCollide<SimNode>((d) => d.r).strength(tuningRef.current.collisionForce))
      .force('surface', createSurfaceForce(leaves, surfaceForceRef))
      .force('cluster', createClusterForce(leaves, groupBy, anchorsByParent, clusterByForceRef))
      .force('parent', createParentContainmentForce(leaves, parentForceRef))
      .force('link', d3.forceLink<SimNode, SimLinkEntry>(simLinks).strength(tuningRef.current.linkForce))
      .on('tick', () => {
        // Forces provide the motion; this post-tick projection provides the invariant. Surface
        // ingredients therefore remain exactly on the membrane even after alpha cools to zero,
        // and interior ingredients cannot escape their compartment during a drag/link pull.
        for (const leaf of leavesRef.current) {
          constrainLeafToParent(leaf)
          constrainLeafAgainstCompartments(leaf, compartments)
          constrainLeafToParent(leaf)
        }
        for (const leaf of leavesRef.current) applyNodeTransform(leaf.data, leaf.x, leaf.y)
        for (const link of renderLinksRef.current) applyLinkPosition(link)
      })

    simulationRef.current?.stop()
    simulationRef.current = sim
    setLayout({ descendants, posMap })

    return () => {
      sim.stop()
      if (simulationRef.current === sim) simulationRef.current = null
    }
    // groupBy/graph.links are intentionally read fresh above rather than listed here — a groupBy-
    // or links-only change is handled by the REHEAT effect below, not a full CREATE.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structSig, sizeBy, tuning.radiusScale, width, height])

  // REHEAT — same pack/leaves, force config recomputed from the CURRENT groupBy/links, simulation
  // kicked back to full alpha. Deliberately does not repack or rebuild the leaves array.
  useEffect(() => {
    const sim = simulationRef.current
    if (!sim || !graph) return
    renderLinksRef.current = graph.links
    const leaves = leavesRef.current
    const anchorsByParent = buildClusterAnchors(leaves, groupBy)
    sim.force('cluster', createClusterForce(leaves, groupBy, anchorsByParent, clusterByForceRef))

    const simLinks = buildSimLinks(graph.links, posMapRef.current, leaves)
    simLinksRef.current = simLinks
    sim.force('link', d3.forceLink<SimNode, SimLinkEntry>(simLinks).strength(tuningRef.current.linkForce))

    sim.alpha(1).restart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, linksSig])

  // UPDATE — live strength mutation only. The 3 custom forces already read `tuningRef` live via
  // the getters above and need no push; only the 2 d3-built-in forces cache `.strength()` at call
  // time and must be re-set explicitly. A gentle alpha nudge (not a full reheat) makes the change
  // visible without a jarring re-snap.
  useEffect(() => {
    const sim = simulationRef.current
    if (!sim) return
    ;(sim.force('collide') as d3.ForceCollide<SimNode> | undefined)?.strength(tuning.collisionForce)
    ;(sim.force('link') as d3.ForceLink<SimNode, SimLinkEntry> | undefined)?.strength(tuning.linkForce)
    sim.alpha(Math.max(sim.alpha(), 0.3)).restart()
  }, [tuning.parentForce, tuning.surfaceForce, tuning.linkForce, tuning.clusterByForce, tuning.collisionForce])

  // Tear down the live simulation on unmount, unconditionally — separate from the CREATE effect's
  // own cleanup so a StrictMode mount→unmount→remount cycle can't leave two simulations mutating
  // the same node objects (the CREATE effect's cleanup already handles its own generation; this
  // is the final, real unmount).
  useEffect(() => {
    return () => {
      simulationRef.current?.stop()
      simulationRef.current = null
    }
  }, [])

  const pin = useCallback((node: RecipeNode, x: number, y: number) => {
    const packed = posMapRef.current.get(node)
    if (!packed || !packed.parent) return // the root is the canvas frame; pan the viewport instead

    if (isIngredientNode(node)) {
      const leaf = packed as SimNode
      leaf.x = x
      leaf.y = y
      const compartments = [...posMapRef.current.values()].filter((candidate) => candidate.data.data.nodetype === 'compartment')
      constrainLeafToParent(leaf)
      constrainLeafAgainstCompartments(leaf, compartments)
      constrainLeafToParent(leaf)
      leaf.fx = leaf.x
      leaf.fy = leaf.y
      dragPinsRef.current.set(node, [leaf])
      applyNodeTransform(node, leaf.x, leaf.y)
      for (const link of renderLinksRef.current) applyLinkPosition(link)
      simulationRef.current?.alphaTarget(0.3).restart()
      return
    }

    // Compartments are movable rigid subtrees rather than independent force nodes. Moving only
    // the ring would leave its contents behind; translate every packed descendant by the same
    // delta and temporarily pin the simulated leaves until pointer-up.
    const compartments = [...posMapRef.current.values()].filter((candidate) => candidate.data.data.nodetype === 'compartment')
    const movedDescendants = translatePackedSubtree(packed, x, y, compartments)
    const subtreeNodes = new Set(movedDescendants.map((d) => d.data))
    const pinnedLeaves = leavesRef.current.filter((leaf) => subtreeNodes.has(leaf.data))
    for (const descendant of movedDescendants) {
      applyNodeTransform(descendant.data, descendant.x, descendant.y)
    }
    for (const leaf of pinnedLeaves) {
      constrainLeafToParent(leaf)
      leaf.fx = leaf.x
      leaf.fy = leaf.y
    }
    // The moved compartment is itself a collider: ingredients that do not belong to its subtree
    // are displaced to its outer membrane instead of being swallowed by the dragged ring.
    for (const leaf of leavesRef.current) {
      if (subtreeNodes.has(leaf.data)) continue
      constrainLeafAgainstCompartments(leaf, compartments)
      constrainLeafToParent(leaf)
      applyNodeTransform(leaf.data, leaf.x, leaf.y)
    }
    dragPinsRef.current.set(node, pinnedLeaves)
    for (const link of renderLinksRef.current) applyLinkPosition(link)
    simulationRef.current?.alphaTarget(0.3).restart()
  }, [])

  const release = useCallback((node: RecipeNode) => {
    const pinnedLeaves = dragPinsRef.current.get(node) ?? []
    for (const leaf of pinnedLeaves) {
      leaf.fx = null
      leaf.fy = null
    }
    dragPinsRef.current.delete(node)

    // Cluster anchors are absolute coordinates. A compartment drag moves their parent, so rebuild
    // the cluster force before releasing its children or they would drift toward the old location.
    const leaves = leavesRef.current
    const currentGroupBy = groupByRef.current
    simulationRef.current?.force(
      'cluster',
      createClusterForce(leaves, currentGroupBy, buildClusterAnchors(leaves, currentGroupBy), clusterByForceRef),
    )
    simulationRef.current?.alphaTarget(0).alpha(Math.max(simulationRef.current.alpha(), 0.3)).restart()
  }, [clusterByForceRef])

  // Stable per-key ref-callback getters — see `RecipeSimulationHandle.getNodeRef`'s docstring for
  // why caching one callback per key (rather than an inline closure built fresh in JSX) is
  // required for correctness, not just an optimization. `el === null` (unmount) also drops the
  // cached callback itself, since a deleted `RecipeNode`/`RecipeLink` is gone for good — matches
  // `recipeStore`'s own "delete means gone" convention (`deleteIngredient`/`deleteCompartment`/
  // `deleteLink` never reuse an old object) — avoiding an unbounded cache across an editing
  // session with heavy add/delete churn.
  const getNodeRef = useCallback((node: RecipeNode): RefCallback<SVGGElement> => {
    let cb = nodeRefCallbacksRef.current.get(node)
    if (!cb) {
      cb = (el) => {
        if (el) {
          nodeElsRef.current.set(node, el)
          const leaf = posMapRef.current.get(node)
          if (leaf) el.setAttribute('transform', `translate(${leaf.x},${leaf.y})`)
        } else {
          nodeElsRef.current.delete(node)
          nodeRefCallbacksRef.current.delete(node)
        }
      }
      nodeRefCallbacksRef.current.set(node, cb)
    }
    return cb
  }, [])

  const getLinkLineRef = useCallback((link: RecipeLink): RefCallback<SVGLineElement> => {
    let cb = linkLineRefCallbacksRef.current.get(link)
    if (!cb) {
      cb = (el) => {
        if (el) {
          linkLineElsRef.current.set(link, el)
          applyLinkPosition(link)
        } else {
          linkLineElsRef.current.delete(link)
          linkLineRefCallbacksRef.current.delete(link)
        }
      }
      linkLineRefCallbacksRef.current.set(link, cb)
    }
    return cb
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getLinkGradientRef = useCallback((link: RecipeLink): RefCallback<SVGLinearGradientElement> => {
    let cb = linkGradientRefCallbacksRef.current.get(link)
    if (!cb) {
      cb = (el) => {
        if (el) {
          linkGradientElsRef.current.set(link, el)
          applyLinkPosition(link)
        } else {
          linkGradientElsRef.current.delete(link)
          linkGradientRefCallbacksRef.current.delete(link)
        }
      }
      linkGradientRefCallbacksRef.current.set(link, cb)
    }
    return cb
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { descendants: layout.descendants, posMap: layout.posMap, pin, release, getNodeRef, getLinkLineRef, getLinkGradientRef }
}
