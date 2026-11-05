/**
 * Legacy picking (recipe-view.md §4.3, main.js:4918-4992): the deepest disk containing the point wins, so a
 * compartment's whole interior is hittable (row 48); a link wins when the point is within 2.5 of it and closer than
 * the picked node's centre.
 */
import type { Point, ViewState } from './viewState'

/** The deepest node whose disk (radius r, not the drawn r+5) contains `p`; the root when none. Ties: BFS order. */
export function hitNode(state: ViewState, abs: Map<string, Point>, p: Point): string {
  let best = state.order[0]
  for (const id of state.order) {
    const n = state.nodes[id]
    if (!n.parent || n.depth <= state.nodes[best].depth) continue
    const c = abs.get(id)!
    if ((p.x - c.x) ** 2 + (p.y - c.y) ** 2 < n.r * n.r) best = id
  }
  return best
}

/** A link segment from circle edge to circle edge (`getOffsetLink`, main.js:5353-5366, row 44). */
export function linkEnds(a: Point, ra: number, b: Point, rb: number): { a: Point; b: Point } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.hypot(dx, dy) || 1
  const ux = dx / d
  const uy = dy / d
  return { a: { x: a.x + ra * ux, y: a.y + ra * uy }, b: { x: b.x - rb * ux, y: b.y - rb * uy } }
}

/** Distance from `p` to the segment a-b (distance.js:69). */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const vx = b.x - a.x
  const vy = b.y - a.y
  const len2 = vx * vx + vy * vy
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2)) : 0
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy))
}

export interface LinkEnds {
  source: string
  target: string
}

/** The index of the link under `p`, or -1: within 2.5 and closer than the picked node's centre (§4.3). */
export function hitLink(state: ViewState, abs: Map<string, Point>, links: readonly LinkEnds[], p: Point, pickedNode: string): number {
  const picked = abs.get(pickedNode)!
  const nodeDist = state.nodes[pickedNode].parent ? Math.hypot(p.x - picked.x, p.y - picked.y) : Infinity
  let best = -1
  let bestDist = 2.5
  links.forEach((link, i) => {
    const s = state.nodes[link.source]
    const t = state.nodes[link.target]
    if (!s || !t) return
    const ends = linkEnds(abs.get(link.source)!, s.r, abs.get(link.target)!, t.r)
    const d = distanceToSegment(p, ends.a, ends.b)
    if (d < bestDist && d < nodeDist) {
      best = i
      bestDist = d
    }
  })
  return best
}
