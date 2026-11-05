// The Recipe view's simulation (recipe-view.md §3) and its kept departures (§10.4-§10.5), on the app's own parse of
// the examples; and the perf guard for the per-frame path (How we work: tick + draw at n and 4n, quadratic control).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLegacyRecipe } from '../src/domain/recipe/parseLegacyRecipe'
import type { RecipeGraph, RecipeNode } from '../src/domain/recipe/types'
import { DrawCache, drawFrame, type Ctx, type Scene } from '../src/domain/recipe/view/draw'
import { assignClusters, computeRadii, seedPositions } from '../src/domain/recipe/view/layout'
import { DRAG_HEAT, FLOAT_DEPTH, MEMBRANE, RecipeSimulation, buildSimNodes, type SimNode } from '../src/domain/recipe/view/simulation'

const load = (file: string): RecipeGraph => parseLegacyRecipe(JSON.parse(readFileSync(resolve(__dirname, '../../data', file), 'utf-8')))

function simulate(graph: RecipeGraph, width = 1200, height = 800) {
  const seeds = seedPositions(graph, width, height)
  const radii = computeRadii(graph, 'size', 1, (n) => seeds.get(n)!.r)
  const nodes = buildSimNodes(graph.nodes[0], new Map(), (n) => ({ x: seeds.get(n)!.x, y: seeds.get(n)!.y, r: radii.get(n)! }))
  const sim = new RecipeSimulation()
  sim.load(nodes, [])
  return { sim, nodes, byName: (name: string) => nodes.find((n) => n.node.data.name === name)! }
}

function settle(sim: RecipeSimulation, max = 2000): number {
  let steps = 0
  while (sim.hot && steps < max) {
    sim.step()
    steps++
  }
  return steps
}

const dist = (a: SimNode, b: SimNode) => Math.hypot(a.x - b.x, a.y - b.y)

describe('heat and rest (§3.4, §10.4)', () => {
  it('a load starts at alpha 1 and cools to rest in about 300 ticks', () => {
    const { sim } = simulate(load('InfluenzaA.json'))
    expect(sim.sim.alpha()).toBe(1)
    const steps = settle(sim)
    expect(steps).toBeGreaterThan(250)
    expect(steps).toBeLessThan(400)
    expect(sim.hot).toBe(false)
  })

  it('a drag holds it warm at alphaTarget .3; the release lets it cool to rest', () => {
    const { sim, nodes } = simulate(load('InfluenzaA.json'))
    settle(sim)
    const protein = nodes.find((n) => n.leaf)!
    sim.dragStart(protein, false, false)
    expect(sim.sim.alphaTarget()).toBe(DRAG_HEAT)
    for (let i = 0; i < 500; i++) sim.step()
    expect(sim.hot).toBe(true)
    sim.dragEnd()
    expect(sim.sim.alphaTarget()).toBe(0)
    expect(settle(sim)).toBeLessThan(400)
    expect(protein.fx).toBeNull()
  })

  it('a force change or an edit warms a resting simulation, never cools a hot one', () => {
    const { sim } = simulate(load('InfluenzaA.json'))
    settle(sim)
    sim.setForces({ ...sim.forces, SurfaceForce: 0.2 })
    expect(sim.hot).toBe(true)
    expect(sim.sim.alpha()).toBe(DRAG_HEAT)
    sim.sim.alpha(0.9)
    sim.heat()
    expect(sim.sim.alpha()).toBe(0.9)
  })
})

describe('membrane constraints (§10.5, rows 15, 17, 58, 59)', () => {
  it('holds surface proteins on the centreline (legacy lets them drift 25 px on HIV)', () => {
    for (const file of ['HIV_serialized.json', 'InfluenzaA.json']) {
      const { sim, nodes } = simulate(load(file))
      settle(sim)
      for (const n of nodes) if (n.surface && n.parent?.parent) expect(Math.abs(dist(n, n.parent) - n.parent.r), `${file} ${n.node.data.name}`).toBeLessThan(1e-6)
    }
  })

  it('keeps interior ingredients inside the inner edge, even dragged far out (view mode)', () => {
    const { sim, nodes } = simulate(load('HIV_serialized.json'))
    settle(sim)
    const inner = nodes.find((n) => n.leaf && !n.surface && n.parent?.parent && n.parent.kids.length > 3)!
    const p = inner.parent!
    sim.dragStart(inner, false, false)
    sim.dragTo(p.x + 5 * p.r, p.y)
    for (let i = 0; i < 20; i++) sim.step()
    expect(dist(inner, p) + inner.r).toBeLessThanOrEqual(p.r - MEMBRANE + 1e-6)
    expect(inner.x).toBeGreaterThan(p.x) // pressed against the edge on the pointer's side
    for (const n of nodes) if (n.leaf && !n.surface && n.parent?.parent) expect(dist(n, n.parent) + n.r).toBeLessThanOrEqual(n.parent.r - MEMBRANE + 1e-6)
  })

  it('a nested compartment as big as its parent is not snapped to the parent centre: it follows the pointer (HIV PackInner r 145 in PackOuter r 65)', () => {
    const { sim, byName } = simulate(load('HIV_serialized.json'))
    settle(sim)
    const inner = byName('HIV1_capsid_3j3q_PackInner_0_1_0')
    const p = inner.parent!
    expect(inner.r).toBeGreaterThan(p.r - 2 * MEMBRANE) // no room inside the parent: the clamp's limit is 0
    const start = { x: inner.x, y: inner.y }
    sim.dragStart(inner, false, false)
    sim.dragTo(start.x + 30, start.y)
    sim.step()
    expect(Math.hypot(inner.x - start.x, inner.y - start.y)).toBeLessThan(40) // no jump at press
    for (let i = 0; i < 10; i++) sim.step()
    sim.dragTo(start.x + 60, start.y + 20)
    for (let i = 0; i < 10; i++) sim.step()
    expect(inner.x).toBeCloseTo(start.x + 60, 0)
    expect(inner.y).toBeCloseTo(start.y + 20, 0)
  })

  it('a dragged interior ingredient with no room inside its parent is not snapped to the parent centre: it follows the pointer', () => {
    const { sim, nodes } = simulate(load('HIV_serialized.json'))
    settle(sim)
    const leaf = nodes.find((n) => n.leaf && !n.surface && n.parent?.parent)!
    const p = leaf.parent!
    leaf.r = p.r // no room inside the parent's inner edge: the projection's limit is 0
    const start = { x: leaf.x, y: leaf.y }
    sim.dragStart(leaf, false, false)
    sim.dragTo(start.x + 30, start.y)
    for (let i = 0; i < 10; i++) sim.step()
    sim.dragTo(start.x + 60, start.y + 20)
    for (let i = 0; i < 10; i++) sim.step()
    expect(leaf.x).toBeCloseTo(start.x + 60, 0)
    expect(leaf.y).toBeCloseTo(start.y + 20, 0)
  })

  it('a dragged surface protein slides on the membrane towards the pointer', () => {
    const { sim, nodes } = simulate(load('InfluenzaA.json'))
    settle(sim)
    const protein = nodes.find((n) => n.surface)!
    const p = protein.parent!
    sim.dragStart(protein, false, false)
    sim.dragTo(p.x, p.y - 3 * p.r)
    for (let i = 0; i < 10; i++) sim.step()
    expect(Math.abs(dist(protein, p) - p.r)).toBeLessThan(1e-6)
    expect(protein.y).toBeLessThan(p.y - p.r * 0.9)
  })

  it('a dragged compartment carries its subtree rigidly and stays inside its parent', () => {
    const { sim, nodes, byName } = simulate(load('HIV_serialized.json'))
    settle(sim)
    const envelope = byName('HIV1_envelope_Pack_145_0_2_0')
    const sub = nodes.filter((n) => n !== envelope && isUnder(n, envelope))
    const before = sub.map((n) => [n.x - envelope.x, n.y - envelope.y])
    sim.dragStart(envelope, false, false)
    sim.dragTo(envelope.x + 40, envelope.y + 30)
    sim.step()
    // One tick: the subtree moved with it; only the subtree's own forces (a tick's worth) change its shape.
    sub.forEach((n, i) => expect(Math.hypot(n.x - envelope.x - before[i][0], n.y - envelope.y - before[i][1]), n.node.data.name).toBeLessThan(2))
    // A nested compartment (the capsid) dragged far: its drawn disk stays inside the envelope's inner edge.
    const capsid = byName('HIV1_capsid_3j3q_PackOuter_0_1_1')
    sim.dragEnd()
    sim.dragStart(capsid, false, false)
    sim.dragTo(envelope.x + 10 * envelope.r, envelope.y)
    sim.step()
    expect(dist(capsid, envelope)).toBeLessThanOrEqual(Math.max(0, envelope.r - 2 * MEMBRANE - capsid.r) + 1e-6)
  })

  it('never produces NaN when a child is larger than its parent (HIV capsid pair, §8.1)', () => {
    const { sim, nodes } = simulate(load('HIV_serialized.json'))
    for (let i = 0; i < 400; i++) sim.step()
    for (const n of nodes) {
      expect(Number.isFinite(n.x) && Number.isFinite(n.y), n.node.data.name).toBe(true)
    }
  })
})

describe('Edit Mode (§3.7, §4.7)', () => {
  it('floats the subject: depth 6, out of the d0-d4 groups, free of its membrane; restored on release', () => {
    const { sim, nodes } = simulate(load('HIV_serialized.json'))
    settle(sim)
    const inner = nodes.find((n) => n.leaf && !n.surface && n.parent?.parent)!
    const depth = inner.depth
    const p = inner.parent!
    sim.dragStart(inner, true, false)
    expect(inner.depth).toBe(FLOAT_DEPTH)
    sim.dragTo(p.x + 3 * p.r, p.y)
    for (let i = 0; i < 5; i++) sim.step()
    expect(dist(inner, p)).toBeGreaterThan(p.r) // outside, ready to drop elsewhere
    sim.dragEnd()
    expect(inner.depth).toBe(depth)
  })

  it('a Ctrl drag in Edit Mode does not float (it multi-selects, main.js:5159)', () => {
    const { sim, nodes } = simulate(load('HIV_serialized.json'))
    const inner = nodes.find((n) => n.leaf && n.parent?.parent)!
    sim.dragStart(inner, true, true)
    expect(sim.drag?.floating).toBe(false)
    expect(inner.depth).not.toBe(FLOAT_DEPTH)
  })
})

describe('legacy nudges (§3.3)', () => {
  it('pulls the root towards world (0,0) (§8.8)', () => {
    const { sim, nodes } = simulate(load('InfluenzaA.json'))
    const root = nodes[0]
    const d0 = Math.hypot(root.x, root.y)
    for (let i = 0; i < 30; i++) sim.step()
    expect(Math.hypot(root.x, root.y)).toBeLessThan(d0 / 10)
  })
})

function isUnder(n: SimNode, top: SimNode): boolean {
  for (let p = n.parent; p; p = p.parent) if (p === top) return true
  return false
}

describe('perf guard: one simulation step plus one frame (How we work)', () => {
  /** One compartment holding n ingredients of radius 10, packed on a grid with room to spare. */
  function crowd(n: number) {
    const side = Math.ceil(Math.sqrt(n))
    const root: RecipeNode = { data: { name: 'root', nodetype: 'compartment' } as RecipeNode['data'], parent: null, children: [] }
    const c: RecipeNode = { data: { name: 'C', nodetype: 'compartment' } as RecipeNode['data'], parent: root, children: [] }
    root.children!.push(c)
    for (let i = 0; i < n; i++) c.children!.push({ data: { name: `n${i}`, nodetype: 'ingredient', surface: i % 10 === 0 } as unknown as RecipeNode['data'], parent: c })
    const R = side * 15 + 50
    const nodes = buildSimNodes(root, new Map(), (node) => {
      if (node === root) return { x: 0, y: 0, r: R }
      if (node === c) return { x: 0, y: 0, r: R }
      const i = c.children!.indexOf(node)
      return { x: ((i % side) - side / 2) * 25, y: (Math.floor(i / side) - side / 2) * 25, r: 10 }
    })
    const sim = new RecipeSimulation()
    sim.load(nodes, [])
    sim.dragStart(nodes[2], false, false) // a drag in progress: warm, one pinned node, as while the user drags
    sim.dragTo(nodes[2].x + 30, nodes[2].y)
    const noop = () => {}
    const ctx = new Proxy({}, { get: (_, key) => (key === 'measureText' ? () => ({ width: 5 }) : key === 'createLinearGradient' ? () => ({ addColorStop: noop }) : noop), set: () => true }) as Ctx
    const scene: Scene = {
      nodes, sorted: [...nodes].sort((a, b) => a.depth - b.depth), links: [], fill: new Map(), background: 'white', transform: { x: 0, y: 0, k: 2 }, width: 800, height: 600, dpr: 2,
      strokeWidth: 1, labelOption: 'name', rootLabel: 'root', hovered: nodes[3], hoveredLink: null, selected: nodes[2], selectedLink: null, selection: [nodes[2]],
      dropTarget: null, dropSurface: null, tempLink: null, editMode: false, sprite: () => null, popup: null, legend: null,
    }
    const cache = new DrawCache()
    return () => {
      sim.step()
      drawFrame(ctx, scene, cache)
    }
  }
  // The fastest of several runs: robust to a busy machine (the suite runs files in parallel).
  const time = (f: () => void) => {
    let best = Infinity
    for (let run = 0; run < 7; run++) {
      const t0 = performance.now()
      for (let i = 0; i < 5; i++) f()
      best = Math.min(best, performance.now() - t0)
    }
    return best
  }
  const quadratic = (n: number) => () => {
    let hits = 0
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (((a * 31 + b) & 1023) === 0) hits++
    return hits
  }

  it('scales n log n: 4n costs well under the quadratic control', () => {
    const n = 400
    const small = crowd(n)
    const big = crowd(4 * n)
    time(big) // warm up
    const ratio = time(big) / time(small)
    const control = time(quadratic(4 * n)) / time(quadratic(n))
    expect(control).toBeGreaterThan(8)
    expect(ratio).toBeLessThan(control / 2)
  }, 60_000)
})

describe('group by (§6.5, rows 89-90)', () => {
  function grouped() {
    const root: RecipeNode = { data: { name: 'root', nodetype: 'compartment' } as RecipeNode['data'], parent: null, children: [] }
    const c: RecipeNode = { data: { name: 'C', nodetype: 'compartment' } as RecipeNode['data'], parent: root, children: [] }
    root.children!.push(c)
    for (let i = 0; i < 12; i++) c.children!.push({ data: { name: `n${i}`, nodetype: 'ingredient', family: i % 3 === 0 ? 'a' : i % 3 === 1 ? 'b' : undefined } as unknown as RecipeNode['data'], parent: c })
    const nodes = buildSimNodes(root, new Map(), (n) => ({ x: n === root || n === c ? 0 : (c.children!.indexOf(n) - 6) * 30, y: 0, r: n === root || n === c ? 400 : 10 }))
    return nodes
  }

  it('a custom column groups every leaf by value, a missing value in the "" cluster; clusters do not overlap', () => {
    const nodes = grouped()
    expect(assignClusters(nodes, 'family')).toBe(true)
    const leaves = nodes.filter((n) => n.leaf)
    const byValue = (v: string | undefined) => new Set(leaves.filter((n) => (n.node.data as unknown as { family?: string }).family === v).map((n) => n.cluster))
    for (const v of ['a', 'b', undefined]) expect(byValue(v).size).toBe(1)
    const clusters = [...new Set(leaves.map((n) => n.cluster!))]
    expect(clusters).toHaveLength(3)
    for (const a of clusters) for (const b of clusters) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r - 1e-6)
  })

  it('a built-in key does not group (legacy `default_options`)', () => {
    expect(assignClusters(grouped(), 'size')).toBe(false)
    expect(assignClusters(grouped(), null)).toBe(false)
  })

  it('the cluster nudge pulls a leaf outside its cluster towards it, unscaled by alpha, only when clusterBy is on', () => {
    const nodes = grouped()
    const sim = new RecipeSimulation()
    sim.load(nodes, [])
    sim.clusterBy = assignClusters(nodes, 'family')
    const leaf = nodes.find((n) => n.leaf)!
    const c = leaf.cluster!
    const far = () => Math.hypot(leaf.x - (c.x + leaf.parent!.x), leaf.y - (c.y + leaf.parent!.y))
    leaf.x = c.x + 300
    leaf.y = c.y
    const before = far()
    sim.sim.alpha(0.002)
    for (let i = 0; i < 30; i++) sim.step()
    expect(far()).toBeLessThan(before)
  })
})
