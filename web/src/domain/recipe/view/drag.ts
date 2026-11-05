/**
 * The drag rules as pure functions of the view state (recipe-view.md §4, §10.2, §10.4): containment, the membrane,
 * pushing siblings aside, and Edit-Mode reparenting. The draggable (`recipeDraggable.tsx`) declares them to Dragology.
 */
import { absolutePositions, breadthFirst, subtreeIds, type Point, type ViewNode, type ViewState } from './viewState'

const MEMBRANE = 5 // half the drawn band, r±5 (§2.4)

/**
 * How far from its parent's centre a node's centre may go (§10.4): an interior ingredient stays inside the
 * membrane's inner edge, a compartment's drawn disk (r+5) too. Unbounded under the root, which has no membrane
 * (legacy: children of the root get no containment, §3.3). Never negative: a child larger than its parent (§8.1)
 * stays concentric.
 */
export function containmentLimit(node: ViewNode, parent: ViewNode): number {
  if (!parent.parent) return Infinity
  return Math.max(parent.r - MEMBRANE - node.r - (node.leaf ? 0 : MEMBRANE), 0)
}

/** (x, y) pulled back into the disk of radius `limit`. */
export function clampToDisk(x: number, y: number, limit: number): Point {
  const d = Math.hypot(x, y)
  if (d <= limit) return { x, y }
  if (d === 0) return { x: 0, y: 0 }
  return { x: (x / d) * limit, y: (y / d) * limit }
}

/** A surface ingredient's centre on its parent's membrane centreline (§3.6, §10.4). */
export function onMembrane(angle: number, parentR: number): Point {
  return { x: parentR * Math.cos(angle), y: parentR * Math.sin(angle) }
}

/** Where a sibling may be after being pushed: its own constraint (membrane or containment). */
function constrain(node: ViewNode, parent: ViewNode, x: number, y: number): Point {
  if (node.surface && parent.parent) {
    const d = Math.hypot(x, y) || 1
    return { x: (x / d) * parent.r, y: (y / d) * parent.r }
  }
  return clampToDisk(x, y, containmentLimit(node, parent))
}

/**
 * Siblings pushed out of the dragged node's way, and out of each other's in a cascade from it (§10.2, rows 11-12:
 * legacy's collisions moved neighbours aside). The dragged node does not move. Siblings collide at r (leaves at the
 * legacy gap 1.15 r, §3.2). A uniform grid finds neighbours: O(siblings + pushes), no pairwise scan. Each sibling is
 * pushed at most `maxVisits` times, so a jammed compartment ends instead of oscillating.
 */
export function pushNeighbours(state: ViewState, id: string, maxVisits = 4): ViewState {
  const dragged = state.nodes[id]
  if (!dragged?.parent) return state
  const parent = state.nodes[dragged.parent]
  const siblings = parent.children
  const reach = (n: ViewNode) => (n.leaf ? n.r * 1.15 : n.r + MEMBRANE)
  let cell = 1
  for (const k of siblings) cell = Math.max(cell, 2 * reach(state.nodes[k]))
  const xs = new Map<string, Point>()
  const grid = new Map<number, string[]>()
  const key = (gx: number, gy: number) => gx * 1_000_003 + gy
  for (const k of siblings) {
    const n = state.nodes[k]
    xs.set(k, { x: n.x, y: n.y })
    const g = key(Math.floor(n.x / cell), Math.floor(n.y / cell))
    const list = grid.get(g)
    if (list) list.push(k)
    else grid.set(g, [k])
  }
  const queue = [id]
  const visits = new Map<string, number>()
  for (let qi = 0; qi < queue.length; qi++) {
    const a = queue[qi]
    const pa = xs.get(a)!
    const ra = reach(state.nodes[a])
    const gx = Math.floor(pa.x / cell)
    const gy = Math.floor(pa.y / cell)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const b of grid.get(key(gx + dx, gy + dy)) ?? []) {
          if (b === a || b === id) continue
          const nb = state.nodes[b]
          const pb = xs.get(b)!
          const vx = pb.x - pa.x
          const vy = pb.y - pa.y
          const dist = Math.hypot(vx, vy)
          const overlap = ra + reach(nb) - dist
          if (overlap <= 1e-6) continue
          const ux = dist > 1e-9 ? vx / dist : 1
          const uy = dist > 1e-9 ? vy / dist : 0
          const next = constrain(nb, parent, pb.x + ux * overlap, pb.y + uy * overlap)
          pb.x = next.x
          pb.y = next.y
          const v = (visits.get(b) ?? 0) + 1
          visits.set(b, v)
          if (v < maxVisits) queue.push(b)
        }
      }
    }
  }
  if (!visits.size) return state
  const nodes = { ...state.nodes }
  for (const b of visits.keys()) nodes[b] = { ...nodes[b], ...xs.get(b)! }
  return { ...state, nodes }
}

export interface ReparentTarget {
  /** The compartment (or the root) the drop lands in; null when the deepest overlap is an ingredient (§4.7). */
  target: string | null
  /** The drop is on the target's membrane: |target.r − dist| < subject.r (row 68). */
  surface: boolean
}

/**
 * Legacy `anotherSubject` (main.js:4863-4916, rows 66-68): the deepest node whose circle overlaps the dragged one
 * (dist < r_t + r_s), the root when none. The dragged subtree is excluded (legacy excludes only direct children,
 * which lets a grandchild become the parent: a cycle; §10.6).
 */
export function reparentTarget(state: ViewState, id: string, at: Point, abs: Map<string, Point>): ReparentTarget {
  const subject = state.nodes[id]
  const excluded = subtreeIds(state, id)
  let best = state.order[0]
  for (const k of state.order) {
    const n = state.nodes[k]
    if (!n.parent || excluded.has(k) || n.depth <= state.nodes[best].depth) continue
    const c = abs.get(k)!
    if (Math.hypot(c.x - at.x, c.y - at.y) < n.r + subject.r) best = k
  }
  const target = state.nodes[best]
  if (target.leaf) return { target: null, surface: false }
  const c = abs.get(best)!
  const surface = !!target.parent && Math.abs(target.r - Math.hypot(c.x - at.x, c.y - at.y)) < subject.r
  return { target: best, surface }
}

export interface ReparentDrop {
  state: ViewState
  /** The new parent when it changed. */
  newParent: string | null
  /** The dropped ingredient's recomputed `surface` (row 68), or null for a compartment. */
  surface: boolean | null
}

/**
 * The drop of an Edit-Mode drag (main.js:5280-5350): into the target, which grows by r/2 (row 67), with `surface`
 * recomputed from the drop distance (row 68) and the node put on the membrane or inside it (§10.4). No target (an
 * ingredient under the drop): the node stays in its parent where it was dropped.
 */
export function dropReparent(state: ViewState, id: string): ReparentDrop {
  if (!state.drag) return { state, newParent: null, surface: null }
  const abs = absolutePositions(state)
  const at = { x: state.drag.x, y: state.drag.y }
  const { target, surface } = reparentTarget(state, id, at, abs)
  const node = state.nodes[id]
  const parentId = target ?? node.parent!
  const nodes = { ...state.nodes }
  const changed = parentId !== node.parent
  if (changed) {
    const old = nodes[node.parent!]
    nodes[old.id] = { ...old, children: old.children.filter((k) => k !== id) }
    nodes[parentId] = { ...nodes[parentId], children: [...nodes[parentId].children, id], r: nodes[parentId].r + node.r / 2 }
  }
  const isSurface = node.leaf && target !== null ? surface : node.surface
  const c = abs.get(parentId)!
  const moved = { ...node, parent: parentId, surface: isSurface, x: at.x - c.x, y: at.y - c.y }
  // On the grown parent's centreline, or inside it (§10.4).
  nodes[id] = { ...moved, ...constrain(moved, nodes[parentId], moved.x, moved.y) }
  const order = breadthFirst(nodes, state.order[0])
  for (const k of order) {
    const n = nodes[k]
    if (n.parent && n.depth !== nodes[n.parent].depth + 1) nodes[k] = { ...n, depth: nodes[n.parent].depth + 1 }
  }
  return { state: { nodes, order, drag: null, pushFor: null }, newParent: changed ? parentId : null, surface: node.leaf ? isSurface : null }
}
