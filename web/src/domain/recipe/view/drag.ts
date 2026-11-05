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
  const ids = parent.children
  const n = ids.length
  // Flat arrays by sibling index: this runs on every pointer move.
  const px = new Float64Array(n)
  const py = new Float64Array(n)
  const reach = new Float64Array(n)
  const visits = new Uint32Array(n)
  let self = -1
  let maxReach = 0
  let sumReach = 0
  for (let i = 0; i < n; i++) {
    const node = state.nodes[ids[i]]
    px[i] = node.x
    py[i] = node.y
    reach[i] = node.leaf ? node.r * 1.15 : node.r + MEMBRANE
    maxReach = Math.max(maxReach, reach[i])
    sumReach += reach[i]
    if (ids[i] === id) self = i
  }
  // Cells about a typical diameter; a node searches as many cells as its reach plus the largest needs.
  const cell = Math.max((2 * sumReach) / n, 1)
  const grid = new Map<number, number[]>()
  const key = (gx: number, gy: number) => gx * 1_000_003 + gy
  for (let i = 0; i < n; i++) {
    const g = key(Math.floor(px[i] / cell), Math.floor(py[i] / cell))
    const list = grid.get(g)
    if (list) list.push(i)
    else grid.set(g, [i])
  }
  const queue = [self]
  for (let qi = 0; qi < queue.length; qi++) {
    const a = queue[qi]
    // +1 cell: pushed nodes are found by the cell they started in.
    const span = Math.ceil((reach[a] + maxReach) / cell) + 1
    const gx = Math.floor(px[a] / cell)
    const gy = Math.floor(py[a] / cell)
    for (let dx = -span; dx <= span; dx++) {
      for (let dy = -span; dy <= span; dy++) {
        const list = grid.get(key(gx + dx, gy + dy))
        if (!list) continue
        for (const b of list) {
          if (b === a || b === self) continue
          const vx = px[b] - px[a]
          const vy = py[b] - py[a]
          const min = reach[a] + reach[b]
          const d2 = vx * vx + vy * vy
          if (d2 >= min * min - 1e-9) continue
          const dist = Math.sqrt(d2)
          const overlap = min - dist
          const ux = dist > 1e-9 ? vx / dist : 1
          const uy = dist > 1e-9 ? vy / dist : 0
          const next = constrain(state.nodes[ids[b]], parent, px[b] + ux * overlap, py[b] + uy * overlap)
          px[b] = next.x
          py[b] = next.y
          if (++visits[b] < maxVisits) queue.push(b)
        }
      }
    }
  }
  let nodes: Record<string, ViewNode> | null = null
  for (let i = 0; i < n; i++) {
    if (!visits[i]) continue
    nodes ??= { ...state.nodes }
    nodes[ids[i]] = { ...nodes[ids[i]], x: px[i], y: py[i] }
  }
  return nodes ? { ...state, nodes } : state
}

export interface ReparentTarget {
  /** The compartment (or the root) the drop lands in; null when the deepest overlap is an ingredient (§4.7). */
  target: string | null
  /** The drop is on the target's membrane: |target.r − dist| < subject.r (row 68). */
  surface: boolean
}

/**
 * Legacy `anotherSubject` (main.js:4863-4916, rows 66-68): the deepest node whose circle overlaps the dragged one
 * (dist < r_t + r_s), the root when none, stopping at the subject's own parent. The dragged subtree is excluded (legacy excludes only direct children,
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
    if (Math.hypot(c.x - at.x, c.y - at.y) < n.r + subject.r) {
      best = k
      // Legacy stops at the subject's own parent (main.js:4908-4910): in breadth-first order nothing inside it is
      // reached, so a drop over the parent lands in the parent, and never in a sibling sub-compartment.
      if (k === subject.parent) break
    }
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
  return { state: { nodes, order, drag: null, push: null }, newParent: changed ? parentId : null, surface: node.leaf ? isSurface : null }
}
