/**
 * The state the Recipe view renders and Dragology drags (recipe-view.md §10.1-§10.2): the recipe tree as flat,
 * id-keyed nodes, each positioned relative to its parent so a compartment drag moves its subtree rigidly (§10.4).
 * Recipe data stays in the store; this holds only geometry. Ids come from `nodeKey`, so they survive reparenting.
 */
import { nodeKey, type RecipeGraph, type RecipeNode } from '../types'

export interface ViewNode {
  id: string
  parent: string | null
  children: string[]
  depth: number
  leaf: boolean
  surface: boolean
  /** Centre relative to the parent's centre; the root's is in world coordinates. */
  x: number
  y: number
  r: number
}

export interface ViewState {
  nodes: Record<string, ViewNode>
  /** Breadth-first, root first: legacy `graph.nodes` order (§1.3). */
  order: string[]
  /** An Edit-Mode drag in progress: the node floats at this world point (§4.7). */
  drag: { id: string; x: number; y: number } | null
  /** A drag pushing its siblings aside: derived when rendered, applied on drop (§10.2). */
  pushFor: string | null
}

export interface Point {
  x: number
  y: number
}

export const viewId = (node: RecipeNode): string => `n${nodeKey(node)}`

/** id → recipe node, built once per graph. */
export function indexGraph(graph: RecipeGraph): Map<string, RecipeNode> {
  return new Map(graph.nodes.map((node) => [viewId(node), node]))
}

/** Breadth-first ids from `rootId`. */
export function breadthFirst(nodes: Record<string, ViewNode>, rootId: string): string[] {
  const out = [rootId]
  for (let i = 0; i < out.length; i++) out.push(...nodes[out[i]].children)
  return out
}

/** Breadth-first recipe nodes, root first (legacy `d3.hierarchy(...).descendants()`, §1.3). */
export function recipeBreadthFirst(root: RecipeNode): RecipeNode[] {
  const out = [root]
  for (let i = 0; i < out.length; i++) out.push(...(out[i].children ?? []))
  return out
}

/** World centre of every node, root first. O(n). */
export function absolutePositions(state: ViewState): Map<string, Point> {
  const abs = new Map<string, Point>()
  for (const id of state.order) {
    const node = state.nodes[id]
    if (state.drag?.id === id) abs.set(id, { x: state.drag.x, y: state.drag.y })
    else if (!node.parent) abs.set(id, { x: node.x, y: node.y })
    else {
      const p = abs.get(node.parent)!
      abs.set(id, { x: p.x + node.x, y: p.y + node.y })
    }
  }
  return abs
}

/** World centre of one node through its parent chain: O(depth), for a drag's per-evaluation path. */
export function absoluteOf(state: ViewState, id: string): Point {
  let x = 0
  let y = 0
  for (let k: string | null = id; k; k = state.nodes[k].parent) {
    if (state.drag?.id === k) return { x: x + state.drag.x, y: y + state.drag.y }
    x += state.nodes[k].x
    y += state.nodes[k].y
  }
  return { x, y }
}

export function subtreeIds(state: ViewState, id: string): Set<string> {
  return new Set(breadthFirst(state.nodes, id))
}

export function withPosition(state: ViewState, id: string, x: number, y: number): ViewState {
  return { ...state, nodes: { ...state.nodes, [id]: { ...state.nodes[id], x, y } } }
}
