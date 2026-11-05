// Picking and the Edit-Mode drop as pure functions of the simulation's nodes (recipe-view.md §4.3, §4.7, rows 48, 66-68).
import { describe, expect, it } from 'vitest'
import type { RecipeNode } from '../src/domain/recipe/types'
import { dropOutcome, dropTarget, hitLink, hitNode } from '../src/domain/recipe/view/hitTest'
import { buildSimNodes, type SimLink, type SimNode } from '../src/domain/recipe/view/simulation'

interface Spec {
  name: string
  x: number
  y: number
  r: number
  surface?: boolean
  kids?: Spec[]
}

/** A hand-made tree: `kids` makes a compartment, else an ingredient. Returns the sim nodes by name, root first. */
function tree(root: Spec): { nodes: SimNode[]; by: Record<string, SimNode> } {
  const at = new Map<RecipeNode, Spec>()
  const make = (spec: Spec, parent: RecipeNode | null): RecipeNode => {
    const node = { data: { name: spec.name, surface: !!spec.surface }, parent, children: spec.kids ? [] : undefined } as unknown as RecipeNode
    at.set(node, spec)
    for (const k of spec.kids ?? []) node.children!.push(make(k, node))
    return node
  }
  const nodes = buildSimNodes(make(root, null), new Map(), (node) => {
    const s = at.get(node)!
    return { x: s.x, y: s.y, r: s.r }
  })
  return { nodes, by: Object.fromEntries(nodes.map((n) => [n.node.data.name, n])) }
}

/** root (r 300) > C (r 100) > a, b, s (surface), D (r 30) > d; root > L. */
function small() {
  return tree({
    name: 'root',
    x: 0,
    y: 0,
    r: 300,
    kids: [
      {
        name: 'C',
        x: 0,
        y: 0,
        r: 100,
        kids: [
          { name: 'a', x: -30, y: 0, r: 10 },
          { name: 'b', x: 30, y: 0, r: 10 },
          { name: 's', x: 100, y: 0, r: 8, surface: true },
          { name: 'D', x: 0, y: 50, r: 30, kids: [{ name: 'd', x: 0, y: 50, r: 5 }] },
        ],
      },
      { name: 'L', x: 250, y: 0, r: 20 },
    ],
  })
}

const place = (n: SimNode, x: number, y: number) => {
  n.x = x
  n.y = y
}

describe('hit-test (§4.3, row 48)', () => {
  it('the deepest containing disk wins; a compartment interior is hittable; the root otherwise', () => {
    const { nodes, by } = small()
    expect(hitNode(nodes, 0, 50)).toBe(by.d)
    expect(hitNode(nodes, 0, 70)).toBe(by.D)
    expect(hitNode(nodes, 0, -60)).toBe(by.C)
    expect(hitNode(nodes, 500, 500)).toBe(nodes[0])
    // The drawn disk is r+5 but the hit disk is r: just outside C is the root.
    expect(hitNode(nodes, 0, -101)).toBe(nodes[0])
  })

  it('a link wins within 2.5 of its edge-to-edge segment', () => {
    const { nodes, by } = small()
    const links = [{ source: by.a, target: by.b, link: {} }] as unknown as SimLink[]
    // The segment runs from a's edge (-20, 0) to b's edge (20, 0).
    expect(hitLink(links, 10, 2, hitNode(nodes, 10, 2))).toBe(links[0])
    expect(hitLink(links, 10, 4, hitNode(nodes, 10, 4))).toBeNull()
    expect(hitLink(links, 24, 0, hitNode(nodes, 24, 0))).toBeNull() // past b's edge (20) by more than 2.5
    expect(hitLink(links, 22, 0, hitNode(nodes, 22, 0))).toBe(links[0]) // inside b's disk, within 2.5 of its edge point
  })

  it("a link loses to a nearer node's centre", () => {
    const { nodes, by } = small()
    const links = [{ source: by.a, target: by.b, link: {} }] as unknown as SimLink[]
    // (0, 2) is 2 from the link and 2 from C's centre (the picked node): not strictly nearer, so the node wins.
    expect(hitNode(nodes, 0, 2)).toBe(by.C)
    expect(hitLink(links, 0, 2, by.C)).toBeNull()
    // The same point with the root as the picked node (no centre to compare): the link.
    expect(hitLink(links, 0, 2, nodes[0])).toBe(links[0])
  })
})

describe('Edit-Mode drop target (rows 66-68, main.js:4863-4916)', () => {
  it('the deepest overlapping node is the target: overlap, not containment', () => {
    const { nodes, by } = small()
    place(by.L, 0, 80) // overlaps C and D (30 + 20 > 30), not d (5 + 20 < 30)
    expect(dropTarget(nodes, by.L).node).toBe(by.D)
    expect(dropTarget(nodes, by.L).distance).toBeCloseTo(30)
    place(by.L, 0, 60) // 10 from d's centre: d is the deepest overlap although D contains the point as well
    expect(dropTarget(nodes, by.L).node).toBe(by.d)
    place(by.L, 0, -60)
    expect(dropTarget(nodes, by.L).node).toBe(by.C)
  })

  it('ingredients are candidates (the drop on one then does nothing)', () => {
    const { nodes, by } = small()
    place(by.L, 30, 0) // on b
    const t = dropTarget(nodes, by.L)
    expect(t.node).toBe(by.b)
    expect(dropOutcome(by.L, t)).toEqual({ parent: null, surface: null })
  })

  it('falls back to the root when nothing overlaps', () => {
    const { nodes, by } = small()
    place(by.a, 600, 600)
    const t = dropTarget(nodes, by.a)
    expect(t.node).toBe(nodes[0])
    expect(t.distance).toBeCloseTo(Math.hypot(600, 600))
  })

  it("stops at the subject's own parent (main.js:4908-4910): a drop on its membrane beside a sibling is a surface drop", () => {
    const { nodes, by } = small()
    // a (r 10) at (96, 10) overlaps its parent C and the surface sibling s at (100, 0).
    place(by.a, 96, 10)
    const t = dropTarget(nodes, by.a)
    expect(t.node).toBe(by.C)
    expect(dropOutcome(by.a, t)).toEqual({ parent: null, surface: true }) // |100 - 96.5| < 10
    // The stop also means no drop into the sub-compartment D from beside C's centre.
    place(by.a, 0, 75)
    expect(dropTarget(nodes, by.a).node).toBe(by.C)
  })

  it('never targets the dragged subtree (a cycle)', () => {
    const { nodes, by } = small()
    place(by.C, 0, 50) // D and d sit right under it, but they are C's own descendants
    expect(dropTarget(nodes, by.C).node).toBe(nodes[0])
  })

  it('reuses the given out object', () => {
    const { nodes, by } = small()
    place(by.L, 0, -60)
    const out = { node: nodes[0], distance: 0 }
    expect(dropTarget(nodes, by.L, out)).toBe(out)
    expect(out.node).toBe(by.C)
  })
})

describe('Edit-Mode drop outcome (rows 66-68, main.js:5280-5350)', () => {
  it('onto another parent: the target grows by r/2; surface is recomputed from the grown radius', () => {
    const { nodes, by } = small()
    place(by.L, 0, -97)
    const t = dropTarget(nodes, by.L)
    expect(t.node).toBe(by.C)
    const out = dropOutcome(by.L, t)
    expect(out.parent).toBe(by.C)
    expect(by.C.r).toBe(100 + 20 / 2)
    expect(out.surface).toBe(true) // |110 - 97| < 20
  })

  it('the grown radius, not the old one, decides the surface flag', () => {
    const { nodes, by } = tree({
      name: 'root',
      x: 0,
      y: 0,
      r: 300,
      kids: [
        { name: 'K', x: 0, y: 0, r: 100, kids: [] },
        { name: 'S', x: 85, y: 0, r: 20 },
      ],
    })
    const t = dropTarget(nodes, by.S)
    expect(t.node).toBe(by.K)
    expect(Math.abs(100 - t.distance)).toBeLessThan(20) // surface by the old radius...
    const out = dropOutcome(by.S, t)
    expect(by.K.r).toBe(110)
    expect(out.surface).toBe(false) // ...but 110 - 85 = 25 is not
  })

  it('on the same parent: no reparent, no growth, surface still recomputed', () => {
    const { nodes, by } = small()
    place(by.a, 100, 0)
    let out = dropOutcome(by.a, dropTarget(nodes, by.a))
    expect(out).toEqual({ parent: null, surface: true })
    place(by.a, 50, 0)
    out = dropOutcome(by.a, dropTarget(nodes, by.a))
    expect(out).toEqual({ parent: null, surface: false })
    expect(by.C.r).toBe(100)
  })

  it('a compartment dropped on the root moves there (grows it); no surface flag', () => {
    const { nodes, by } = small()
    place(by.D, 600, 600)
    const t = dropTarget(nodes, by.D)
    expect(t.node).toBe(nodes[0])
    const out = dropOutcome(by.D, t)
    expect(out).toEqual({ parent: nodes[0], surface: null })
    expect(nodes[0].r).toBe(300 + 15)
  })

  it('a drop on an ingredient does nothing, and a target that is already a direct child is not a new parent', () => {
    const { nodes, by } = small()
    place(by.L, 30, 0)
    const before = by.b.r
    expect(dropOutcome(by.L, dropTarget(nodes, by.L))).toEqual({ parent: null, surface: null })
    expect(by.b.r).toBe(before)
    expect(dropOutcome(by.C, { node: by.D, distance: 10 })).toEqual({ parent: null, surface: null })
    expect(by.D.r).toBe(30)
  })
})
