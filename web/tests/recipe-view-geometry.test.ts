// The Recipe view's layout and drag rules as pure functions of the state (recipe-view.md §1.9, §4, §10.2, §10.4).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLegacyRecipe, detectRecipeFormat } from '../src/domain/recipe/parseLegacyRecipe'
import type { IngredientData, RecipeGraph, RecipeNode } from '../src/domain/recipe/types'
import { layoutRecipe, reconcileView } from '../src/domain/recipe/view/layout'
import { clampToDisk, containmentLimit, dropReparent, onMembrane, pushNeighbours, reparentTarget } from '../src/domain/recipe/view/drag'
import { hitLink, hitNode } from '../src/domain/recipe/view/hitTest'
import { absolutePositions, viewId, type ViewNode, type ViewState } from '../src/domain/recipe/view/viewState'

function load(file: string): RecipeGraph {
  const json = JSON.parse(readFileSync(resolve(__dirname, '../../data', file), 'utf-8'))
  return parseLegacyRecipe(json, detectRecipeFormat(json))
}
const options = { sizeBy: 'size', radiusScale: 1, groupBy: null, center: { x: 300, y: 300 } }

/** A hand-made state: root → compartment C (r 100) → leaves; root → leaf L. */
function small(): ViewState {
  const n = (id: string, parent: string | null, children: string[], depth: number, leaf: boolean, x: number, y: number, r: number, surface = false): ViewNode => ({ id, parent, children, depth, leaf, surface, x, y, r })
  const nodes = {
    root: n('root', null, ['C', 'L'], 0, false, 0, 0, 300),
    C: n('C', 'root', ['a', 'b', 's', 'D'], 1, false, 0, 0, 100),
    a: n('a', 'C', [], 2, true, -30, 0, 10),
    b: n('b', 'C', [], 2, true, 30, 0, 10),
    s: n('s', 'C', [], 2, true, 100, 0, 8, true),
    D: n('D', 'C', ['d'], 2, false, 0, 50, 30),
    d: n('d', 'D', [], 3, true, 0, 0, 5),
    L: n('L', 'root', [], 1, true, 250, 0, 20),
  }
  return { nodes, order: ['root', 'C', 'L', 'a', 'b', 's', 'D', 'd'], drag: null, push: null }
}

describe('layout (§10.2)', () => {
  it.each(['HIV_serialized.json', 'InfluenzaA.json', 'Mpn_1.0_2.json'])('%s: every node once, surface ingredients on the membrane, the root at the centre', (file) => {
    const graph = load(file)
    const state = layoutRecipe(graph, options)
    expect(state.order).toHaveLength(graph.nodes.length)
    expect(new Set(state.order).size).toBe(graph.nodes.length)
    expect(state.nodes[state.order[0]]).toMatchObject({ x: 300, y: 300, depth: 0 })
    for (const id of state.order) {
      const node = state.nodes[id]
      if (!node.surface || !state.nodes[node.parent!].parent) continue
      expect(Math.hypot(node.x, node.y)).toBeCloseTo(state.nodes[node.parent!].r, 6)
    }
  })

  it('packs interior siblings without overlap (Mpn, 145 interior ingredients)', () => {
    const state = layoutRecipe(load('Mpn_1.0_2.json'), options)
    const comp = Object.values(state.nodes).find((n) => !n.leaf && n.parent)!
    const interior = comp.children.map((id) => state.nodes[id]).filter((n) => !n.surface)
    for (let i = 0; i < interior.length; i++)
      for (let j = i + 1; j < interior.length; j++) {
        const a = interior[i]
        const b = interior[j]
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r - 1e-6)
      }
  })

  it('group-by adds a level and only moves nodes: same ids, parents and radii (§6.5)', () => {
    const graph = load('Mpn_1.0_2.json')
    // A custom column, as a CSV would bring: legacy groups only keys outside `default_options`.
    graph.nodes.forEach((node, i) => {
      if (!node.children) (node.data as IngredientData).family = i % 3 ? 'A' : 'B'
    })
    const plain = layoutRecipe(graph, options)
    const grouped = layoutRecipe(graph, { ...options, groupBy: 'family' })
    expect(grouped.order).toEqual(plain.order)
    let moved = 0
    for (const id of plain.order) {
      expect(grouped.nodes[id].parent).toBe(plain.nodes[id].parent)
      expect(grouped.nodes[id].r).toBe(plain.nodes[id].r)
      if (grouped.nodes[id].x !== plain.nodes[id].x) moved++
    }
    expect(moved).toBeGreaterThan(0)
    // Grouped: each family's members sit nearer their own family's centre than the other's.
    const leaves = plain.order.map((id) => grouped.nodes[id]).filter((n) => n.leaf && !n.surface)
    const centre = (f: string) => {
      const m = leaves.filter((n) => ((graph.nodes.find((g) => viewId(g) === n.id)!.data as IngredientData).family) === f)
      return { x: m.reduce((s, n) => s + n.x, 0) / m.length, y: m.reduce((s, n) => s + n.y, 0) / m.length }
    }
    expect(Math.hypot(centre('A').x - centre('B').x, centre('A').y - centre('B').y)).toBeGreaterThan(50)
  })

  it('a built-in key does not group (legacy `default_options`, §6.5)', () => {
    const graph = load('HIV_serialized.json')
    expect(layoutRecipe(graph, { ...options, groupBy: 'size' })).toEqual(layoutRecipe(graph, options))
  })
})

describe('edits keep positions (§1.9)', () => {
  it('known nodes keep their world position; a new one appears at the centre with the given radius', () => {
    const graph = load('InfluenzaA.json')
    const before = layoutRecipe(graph, options)
    const root = graph.nodes[0]
    const added: RecipeNode = { data: { ...(graph.nodes[2].data as IngredientData), name: 'new' }, parent: root }
    root.children = [...(root.children ?? []), added]
    const after = reconcileView(before, { nodes: [...graph.nodes, added], links: [] }, { x: 10, y: 20 }, () => 30)
    const a = absolutePositions(before)
    const b = absolutePositions(after)
    for (const id of before.order) expect(b.get(id)).toEqual(a.get(id))
    expect(b.get(viewId(added))).toEqual({ x: 10, y: 20 })
    expect(after.nodes[viewId(added)].r).toBe(30)
  })
})

describe('drag rules (§10.4)', () => {
  it('containment: inside the inner membrane edge, a compartment by its drawn disk, none under the root', () => {
    const s = small()
    expect(containmentLimit(s.nodes.a, s.nodes.C)).toBe(100 - 5 - 10)
    expect(containmentLimit(s.nodes.D, s.nodes.C)).toBe(100 - 10 - 30)
    expect(containmentLimit(s.nodes.L, s.nodes.root)).toBe(Infinity)
    expect(containmentLimit({ ...s.nodes.D, r: 200 }, s.nodes.C)).toBe(0) // larger than its parent: concentric (§8.1)
    expect(clampToDisk(300, 400, 50)).toEqual({ x: 30, y: 40 })
    const p = onMembrane(Math.PI / 2, 100)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(100)
  })

  it('pushes siblings out of the dragged node, keeps them constrained, and leaves the dragged node where it is', () => {
    const s = small()
    s.nodes.a = { ...s.nodes.a, x: 25 } // over b
    const pushed = pushNeighbours(s, 'a')
    expect(pushed.nodes.a).toEqual(s.nodes.a)
    const { a, b } = pushed.nodes
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(1.15 * 10 + 1.15 * 10 - 1e-6)
    expect(Math.hypot(b.x, b.y)).toBeLessThanOrEqual(containmentLimit(b, pushed.nodes.C) + 1e-9)
    expect(pushed.nodes.L).toBe(s.nodes.L) // another parent's node is untouched
  })

  it('a pushed surface sibling slides on the membrane', () => {
    const s = small()
    s.nodes.b = { ...s.nodes.b, x: 92, y: 5 }
    const pushed = pushNeighbours(s, 'b')
    expect(Math.hypot(pushed.nodes.s.x, pushed.nodes.s.y)).toBeCloseTo(100, 6)
  })
})

describe('Edit-Mode reparent (rows 66-68)', () => {
  it('the deepest overlapping node is the target; the root when none; no target over an ingredient', () => {
    const s = small()
    const abs = absolutePositions(s)
    expect(reparentTarget(s, 'a', { x: 0, y: 75 }, abs)).toEqual({ target: 'D', surface: true }) // |30 − 25| < 10
    expect(reparentTarget(s, 'L', { x: 0, y: 60 }, abs).target).toBeNull() // overlap, not containment: d is deepest (§8.13)
    expect(reparentTarget(s, 'L', { x: 0, y: -60 }, abs)).toEqual({ target: 'C', surface: false })
    expect(reparentTarget(s, 'a', { x: 600, y: 600 }, abs)).toEqual({ target: 'root', surface: false })
    expect(reparentTarget(s, 'L', { x: 30, y: 0 }, abs).target).toBeNull() // b is deepest: an ingredient
    expect(reparentTarget(s, 'L', { x: 0, y: -95 }, abs)).toEqual({ target: 'C', surface: true })
  })

  it('never targets the dragged subtree (a cycle, §10.6)', () => {
    const s = small()
    expect(reparentTarget(s, 'C', { x: 0, y: 50 }, absolutePositions(s)).target).toBe('root')
  })

  it('the drop moves the node into the target, which grows by r/2; surface is recomputed and the node put on the membrane', () => {
    const s = small()
    const drop = dropReparent({ ...s, drag: { id: 'L', x: 0, y: -97 } }, 'L')
    expect(drop.newParent).toBe('C')
    expect(drop.surface).toBe(true)
    expect(drop.state.nodes.C.r).toBe(100 + 20 / 2)
    expect(drop.state.nodes.C.children).toContain('L')
    expect(drop.state.nodes.root.children).not.toContain('L')
    expect(drop.state.nodes.L.depth).toBe(2)
    expect(Math.hypot(drop.state.nodes.L.x, drop.state.nodes.L.y)).toBeCloseTo(110, 6)
    expect(drop.state.drag).toBeNull()
  })

  it('dropping a compartment carries its subtree and updates every depth', () => {
    const s = small()
    const drop = dropReparent({ ...s, drag: { id: 'D', x: 600, y: 600 } }, 'D')
    expect(drop.newParent).toBe('root')
    expect(drop.surface).toBeNull()
    expect(drop.state.nodes.D.depth).toBe(1)
    expect(drop.state.nodes.d.depth).toBe(2)
    expect(absolutePositions(drop.state).get('d')).toEqual({ x: 600, y: 600 })
  })
})

describe('hit-test (§4.3, row 48)', () => {
  it('the deepest containing disk wins; a compartment interior is hittable; the root otherwise', () => {
    const s = small()
    const abs = absolutePositions(s)
    expect(hitNode(s, abs, { x: 0, y: 50 })).toBe('d')
    expect(hitNode(s, abs, { x: 0, y: 70 })).toBe('D')
    expect(hitNode(s, abs, { x: 0, y: -60 })).toBe('C')
    expect(hitNode(s, abs, { x: 500, y: 500 })).toBe('root')
  })

  it('a link wins within 2.5 of its edge-to-edge segment', () => {
    const s = small()
    const abs = absolutePositions(s)
    const links = [{ source: 'a', target: 'b' }]
    expect(hitLink(s, abs, links, { x: 10, y: 2 }, hitNode(s, abs, { x: 10, y: 2 }))).toBe(0)
    expect(hitLink(s, abs, links, { x: 10, y: 4 }, hitNode(s, abs, { x: 10, y: 4 }))).toBe(-1)
    // Not when the picked node's centre is nearer than the link (§4.3).
    expect(hitLink(s, abs, links, { x: 0, y: 2 }, hitNode(s, abs, { x: 0, y: 2 }))).toBe(-1)
  })
})

describe('perf guard: one drag frame (How we work)', () => {
  // `pushNeighbours` runs on every pointer move. n and 4n siblings, against a pairwise (quadratic) control.
  function crowd(n: number): ViewState {
    const side = Math.ceil(Math.sqrt(n))
    const nodes: Record<string, ViewNode> = { root: { id: 'root', parent: null, children: ['C'], depth: 0, leaf: false, surface: false, x: 0, y: 0, r: 1e6 } }
    const children: string[] = []
    for (let i = 0; i < n; i++) {
      const id = `n${i}`
      children.push(id)
      nodes[id] = { id, parent: 'C', children: [], depth: 2, leaf: true, surface: false, x: (i % side) * 25, y: Math.floor(i / side) * 25, r: 10 }
    }
    nodes.C = { id: 'C', parent: 'root', children, depth: 1, leaf: false, surface: false, x: 0, y: 0, r: 1e6 }
    nodes.n0 = { ...nodes.n0, x: 8 } // overlaps n1: a push cascade starts
    return { nodes, order: ['root', 'C', ...children], drag: null, push: null }
  }
  // The fastest of several runs: robust to a busy machine (the suite runs files in parallel).
  const time = (f: () => void) => {
    let best = Infinity
    for (let run = 0; run < 7; run++) {
      const t0 = performance.now()
      for (let i = 0; i < 10; i++) f()
      best = Math.min(best, performance.now() - t0)
    }
    return best
  }
  const quadratic = (s: ViewState) => {
    const ids = s.nodes.C.children
    let hits = 0
    for (const a of ids) for (const b of ids) if (Math.hypot(s.nodes[a].x - s.nodes[b].x, s.nodes[a].y - s.nodes[b].y) < 1) hits++
    return hits
  }

  it('scales linearly: 4n costs well under the quadratic control', () => {
    const n = 300
    const small = crowd(n)
    const big = crowd(4 * n)
    time(() => pushNeighbours(big, 'n0')) // warm up
    const ratio = time(() => pushNeighbours(big, 'n0')) / time(() => pushNeighbours(small, 'n0'))
    const control = time(() => quadratic(big)) / time(() => quadratic(small))
    expect(control).toBeGreaterThan(8)
    expect(ratio).toBeLessThan(control / 2)
  }, 30_000)
})
