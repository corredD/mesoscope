/**
 * Legacy picking (recipe-view.md §4.3, main.js:4918-4992): the deepest disk containing the point wins, so a
 * compartment's whole interior is hittable (row 48); a link wins when the point is within 2.5 of it and closer than
 * the picked node's centre. And the Edit-Mode drop target (`anotherSubject`, main.js:4863-4916, rows 66-68).
 * From lane `recipe-view-port` (b747e1e, c6ca193), over the simulation's nodes.
 */
import type { SimLink, SimNode } from './simulation'

/** The deepest node whose disk (radius r, not the drawn r+5) contains (x, y); the root when none. Ties: BFS order. */
export function hitNode(nodes: readonly SimNode[], x: number, y: number): SimNode {
  let best = nodes[0]
  for (const n of nodes) {
    if (!n.parent || n.depth <= best.depth) continue
    const dx = x - n.x
    const dy = y - n.y
    if (dx * dx + dy * dy < n.r * n.r) best = n
  }
  return best
}

/** Distance from (px, py) to the segment a-b (distance.js:69). */
export function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax
  const vy = by - ay
  const len2 = vx * vx + vy * vy
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2)) : 0
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy))
}

/** The link under (x, y), edge to edge, or null: within 2.5 and closer than the picked node's centre (§4.3). */
export function hitLink(links: readonly SimLink[], x: number, y: number, picked: SimNode): SimLink | null {
  const nodeDist = picked.parent ? Math.hypot(x - picked.x, y - picked.y) : Infinity
  let best: SimLink | null = null
  let bestDist = 2.5
  for (const l of links) {
    const a = l.source
    const b = l.target
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const dist = distanceToSegment(x, y, a.x + (a.r * dx) / d, a.y + (a.r * dy) / d, b.x - (b.r * dx) / d, b.y - (b.r * dy) / d)
    if (dist < bestDist && dist < nodeDist) {
      best = l
      bestDist = dist
    }
  }
  return best
}

export interface DropTarget {
  /** The deepest node overlapping the subject; the root when none. */
  node: SimNode
  distance: number
}

/**
 * `anotherSubject` (main.js:4863-4916): the deepest node whose disk overlaps the subject's (distance < r_t + r_s), not
 * the subject or its direct children, and stopping at the subject's own parent (main.js:4908-4910). We also skip the
 * whole subtree, which legacy did not (a grandchild target would make a cycle, §10.7).
 */
export function dropTarget(nodes: readonly SimNode[], subject: SimNode, out: DropTarget = { node: nodes[0], distance: 0 }): DropTarget {
  const root = nodes[0]
  out.node = root
  out.distance = Math.hypot(subject.x - root.x, subject.y - root.y)
  for (const n of nodes) {
    if (n === subject || !n.parent || n.depth <= out.node.depth || inSubtree(n, subject)) continue
    const distance = Math.hypot(subject.x - n.x, subject.y - n.y)
    if (distance < n.r + subject.r) {
      out.node = n
      out.distance = distance
      if (n === subject.parent) break
    }
  }
  return out
}

function inSubtree(n: SimNode, top: SimNode): boolean {
  for (let p = n.parent; p; p = p.parent) if (p === top) return true
  return false
}

export interface DropOutcome {
  /** The new parent, or null when the subject stays where it is. */
  parent: SimNode | null
  /** An ingredient's recomputed `surface` (rows 66-68), null for a compartment or a drop on an ingredient. */
  surface: boolean | null
}

/**
 * The Edit-Mode drop (`dragended`, main.js:5280-5350): onto a compartment or the root, the subject moves there unless
 * it is already its parent, and the target grows by r/2 (row 67); an ingredient's `surface` is then recomputed from
 * the target's radius after the growth (row 68), even on the same parent. A drop on an ingredient does nothing.
 * Mutates the target's radius, as legacy.
 */
export function dropOutcome(subject: SimNode, drop: DropTarget): DropOutcome {
  const target = drop.node
  if (target.leaf && target.parent) return { parent: null, surface: null }
  let parent: SimNode | null = null
  if (subject.parent !== target && !subject.kids.includes(target)) {
    parent = target
    target.r += subject.r / 2
  }
  return { parent, surface: subject.leaf ? Math.abs(target.r - drop.distance) < subject.r : null }
}
