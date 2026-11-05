// The Recipe view's deterministic outputs against the legacy oracle (recipe-view.md §10.8): radii (§1.7, rows 4-8),
// colours per mode (§6, rows 81-90), strokes (row 28), labels (§2.7, rows 34-38), draw order (row 29) and what each
// gesture selects (§4.5), and the force simulation's parameters (§3.1-§3.2, rows 10-14). Fixtures: tests/oracle/capture-recipe-view.mjs on the running legacy app.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { color } from 'd3-color'
import { parseLegacyRecipe, detectRecipeFormat } from '../src/domain/recipe/parseLegacyRecipe'
import type { IngredientData, RecipeGraph } from '../src/domain/recipe/types'
import { computeRadii } from '../src/domain/recipe/view/layout'
import { colorNode, colorNodeInfos, depthColor, prepareColors, COLOR_MODES } from '../src/domain/recipe/view/colors'
import { compartmentTitle, estimateCharWidth, ingredientLabelGeometry, ingredientLabelText, ROTATION_TEXT } from '../src/domain/recipe/view/labels'
import { DrawCache, drawFrame, type Ctx, type Scene } from '../src/domain/recipe/view/draw'
import { DEFAULT_FORCES, RecipeSimulation, buildSimNodes, type SimNode } from '../src/domain/recipe/view/simulation'

interface OracleNode {
  index: number
  name: string
  depth: number
  parent: string | null
  nodetype: string
  surface: boolean | null
  childCount: number
  r: Record<string, number>
  fill: Record<string, string | null>
  stroke: string
}
interface Op {
  op: string
  args: (number | string)[]
  font: string
}
interface Forces {
  simulation: { alpha: number; alphaMin: number; alphaDecay: number; alphaTarget: number; velocityDecay: number }
  forceNames: string[]
  AllForces: Record<string, number>
  collide: Record<string, { strength: number; iterations: number; member: number[]; radius: (number | null)[] } | null>
}
interface Oracle {
  forces: Forces
  rotationText: number[]
  colorModes: string[]
  nodes: OracleNode[]
  frame: Op[]
  frameZoomed: Op[]
  gestures: Record<string, { target: string; nodeSelected: string | null; nodesSelections: string[] } | null>
}

interface Recorded {
  op: string
  args: (number | string)[]
  fillStyle: string
  strokeStyle: string
  font: string
}

/** A `CanvasRenderingContext2D` stand-in that records each call with the style it was made in (as the capture did). */
function record(draw: (ctx: Ctx) => void): Recorded[] {
  const ops: Recorded[] = []
  const state = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic' }
  const stack: (typeof state)[] = []
  const ctx = new Proxy(state, {
    get(target, key: string) {
      if (key in target) return target[key as keyof typeof state]
      if (key === 'measureText') return (t: string) => ({ width: estimateCharWidth(t, parseFloat(target.font)) })
      if (key === 'createLinearGradient') return () => ({ addColorStop() {} })
      return (...args: (number | string)[]) => {
        if (key === 'save') stack.push({ ...target })
        if (key === 'restore') Object.assign(target, stack.pop())
        ops.push({ op: key, args, fillStyle: String(target.fillStyle), strokeStyle: String(target.strokeStyle), font: target.font })
      }
    },
    set(target, key: string, value) {
      ;(target as Record<string, unknown>)[key] = value
      return true
    },
  }) as unknown as Ctx
  draw(ctx)
  return ops
}

const recipes = [
  { name: 'hiv', file: 'HIV_serialized.json' },
  { name: 'influenza', file: 'InfluenzaA.json' },
]

function load(file: string): RecipeGraph {
  const json = JSON.parse(readFileSync(resolve(__dirname, '../../data', file), 'utf-8'))
  return parseLegacyRecipe(json, detectRecipeFormat(json))
}
const oracle = (name: string): Oracle => JSON.parse(readFileSync(resolve(__dirname, 'fixtures/recipe-view-oracle', `${name}.json`), 'utf-8'))

function sameColor(a: string, b: string, tolerance = 2): boolean {
  const x = color(a)!.rgb()
  const y = color(b)!.rgb()
  return Math.abs(x.r - y.r) <= tolerance && Math.abs(x.g - y.g) <= tolerance && Math.abs(x.b - y.b) <= tolerance && Math.abs(x.opacity - y.opacity) < 0.01
}

describe.each(recipes)('$name against the legacy oracle', ({ name, file }) => {
  const graph = load(file)
  const o = oracle(name)
  const infos = colorNodeInfos(graph.nodes[0])

  it('walks the nodes in legacy order (breadth-first, §1.3)', () => {
    expect(infos.map((i) => i.node.data.name)).toEqual(o.nodes.map((n) => n.name))
    expect(infos.map((i) => i.depth)).toEqual(o.nodes.map((n) => n.depth))
  })

  it.each([
    ['size', 1, 'size'],
    ['default', 1, 'default'],
    ['molecularweight', 1, 'molecularweight'],
    ['radius_molecularweight', 1, 'radius_molecularweight'],
    ['size', 2, 'size@radius_scale=2'],
  ])('radii in %s mode at scale %d (§1.7)', (mode, scale, key) => {
    const radii = computeRadii(graph, mode, scale)
    infos.forEach((info, i) => {
      const legacy = o.nodes[i]
      // The root and compartments without leaf children keep legacy's pack radius, which depends on the canvas.
      if (!info.node.parent || (info.node.children && !info.node.children.some((c) => !c.children))) return
      expect(radii.get(info.node), `${legacy.name} r`).toBeCloseTo(legacy.r[key], 2)
    })
  })

  // Not compared: `automatic` (legacy's palette is random, §8.20), and three validation modes whose result depends on
  // the parser's defaults, not on the view (legacy fills `geom` "X", `pos` and the counts in its own parse): open.
  const skipped = new Set(['automatic', 'geom', 'Beads', 'count_molarity'])
  it.each(COLOR_MODES.filter((m) => !skipped.has(m)))('fills in %s mode (§6.2)', (mode) => {
    const prep = prepareColors(infos, mode, 'hsl(0, 100%, 50%)', 'hsl(165, 100%, 50%)', true, new Set())
    infos.forEach((info, i) => {
      if (!info.node.parent) return
      expect(sameColor(colorNode(info, prep), o.nodes[i].fill[mode]!), `${o.nodes[i].name}: ${colorNode(info, prep)} vs ${o.nodes[i].fill[mode]}`).toBe(true)
    })
  })

  it('strokes every node with the depth colour of depth+1 (§2.6, row 28)', () => {
    infos.forEach((info, i) => expect(sameColor(depthColor(info.depth + 1), o.nodes[i].stroke), o.nodes[i].name).toBe(true))
  })

  it('titles each compartment as legacy does: font, radius r+5, letters (§2.7, row 34)', () => {
    const radii = computeRadii(graph, 'size', 1)
    const titles = o.frame.filter((op) => op.op === 'fillText' && op.font.endsWith('Oswald'))
    const compartments = infos.filter((info) => info.node.parent && info.node.children)
    const expected = compartments.flatMap((info, counter) => {
      const title = compartmentTitle(info.node.data.name, radii.get(info.node)!, counter, estimateCharWidth)
      if (!title) return []
      // Legacy draws the letters reversed (main.js:5509).
      return [...title.letters].reverse().map((l) => ({ char: l.char, font: `${title.fontSize}px Oswald`, y: -title.radius }))
    })
    expect(titles.map((t) => ({ char: t.args[0], font: t.font, y: t.args[2] }))).toEqual(expected.map((e) => ({ char: e.char, font: e.font, y: expect.closeTo(e.y, 2) })))
    expect(ROTATION_TEXT).toEqual(o.rotationText)
  })

  it('labels ingredients when zoomed past 1.5: text, font round(r/2), at (x−r, y+r+fs) (rows 36-37)', () => {
    // Every Georgia text but the root label (the root's name, at x=5).
    const labels = o.frameZoomed.filter((op) => op.op === 'fillText' && op.font.endsWith('Georgia') && op.args[0] !== infos[0].node.data.name)
    const leaves = infos.filter((info) => !info.node.children)
    expect(labels.map((l) => l.args[0])).toEqual(leaves.map((l) => ingredientLabelText(l.node.data as IngredientData, 'name')))
    for (const l of labels) expect(l.font).toBe(`${ingredientLabelGeometry(40).fontSize}px Georgia`)
  })

  it('draws one frame call for call as legacy (§2.2, row 29): same ops, arguments and colours', () => {
    // Legacy's node positions, read back from its recorded frame: each node's path starts with moveTo(x, y), in
    // depth order (compartments, then ingredients), and its arc gives the radius.
    const nodes = buildSimNodes(graph.nodes[0], new Map(), () => ({ x: 0, y: 0, r: 0 }))
    const sorted = [...nodes].sort((a, b) => a.depth - b.depth)
    const drawOrder = [...sorted.filter((n) => !n.leaf), ...sorted.filter((n) => n.leaf)]
    const moves = o.frame.map((op, i) => ({ op, i })).filter(({ op }) => op.op === 'moveTo')
    expect(moves).toHaveLength(drawOrder.length)
    drawOrder.forEach((n, k) => {
      n.x = Number(moves[k].op.args[0])
      n.y = Number(moves[k].op.args[1])
      const arc = o.frame.slice(moves[k].i).find((op) => op.op === 'arc')
      n.r = n.parent ? Number(arc!.args[2]) - (n.leaf ? 0 : 5) : 0
    })
    const prep = prepareColors(infos, 'pdb', 'hsl(0, 100%, 50%)', 'hsl(165, 100%, 50%)', true, new Set())
    const byNode = new Map(nodes.map((n) => [n.node, n]))
    const fill = new Map(infos.map((info) => [byNode.get(info.node)!, colorNode(info, prep)]))
    const [, , width, height] = o.frame[0].args as number[]
    const scene: Scene = {
      nodes, sorted, links: [], fill, background: 'rgb(224,224,224)', transform: { x: 0, y: 0, k: 1 }, width, height, dpr: 1, strokeWidth: 1,
      labelOption: 'name', rootLabel: graph.nodes[0].data.name, hovered: null, hoveredLink: null, selected: null, selectedLink: null, selection: [],
      dropTarget: null, dropSurface: null, tempLink: null, editMode: false, sprite: () => null, popup: null, legend: null,
    }
    const ours = record((ctx) => drawFrame(ctx, scene, new DrawCache()))
    // Ours sets the HiDPI transform first (§10.1) and fills the canvas, not the window (§2.2.1); legacy's rotate angles
    // come from Oswald's widths in its browser, ours from node-canvas: compared by sign only.
    const legacy = o.frame.filter((op) => !(op.op === 'clearRect'))
    // And ours adds the §10.6 marker lines in each surface ingredient (beginPath, moveTo, lineTo, stroke, three times).
    const markers = new Set<number>()
    ours.forEach((op, i) => {
      if (op.op === 'lineTo') for (let k = i - 2; k <= i + 1; k++) markers.add(k)
    })
    const markerLines = ours.filter((op) => op.op === 'lineTo').length
    expect(markerLines).toBe(3 * nodes.filter((n) => n.surface && n.parent?.parent).length)
    const mine = ours.filter((op, i) => !markers.has(i) && op.op !== 'setTransform' && op.op !== 'clearRect')
    expect(mine.map((op) => op.op)).toEqual(legacy.map((op) => op.op))
    mine.forEach((op, i) => {
      const l = legacy[i] as Op & { fillStyle: string; strokeStyle: string }
      const where = `${i} ${op.op}`
      if (op.op === 'fill') expect(sameColor(op.fillStyle, l.fillStyle), `${where} fill ${op.fillStyle} vs ${l.fillStyle}`).toBe(true)
      if (op.op === 'stroke') expect(sameColor(op.strokeStyle, l.strokeStyle), `${where} stroke ${op.strokeStyle} vs ${l.strokeStyle}`).toBe(true)
      if (op.op === 'rotate') expect(Math.sign(Number(op.args[0])), where).toBe(Math.sign(Number(l.args[0])))
      else if (op.op === 'fillText') {
        expect(op.args[0], where).toBe(l.args[0])
        expect(op.font, where).toBe(l.font)
        expect(Number(op.args[1]), where).toBeCloseTo(Number(l.args[1]), 1)
        expect(Number(op.args[2]), where).toBeCloseTo(Number(l.args[2]), 1)
      } else if (op.op !== 'fillRect') op.args.forEach((a, j) => expect(Number(a), `${where} arg ${j}`).toBeCloseTo(Number(l.args[j]), 1))
    })
  })

  it('configures the forces as legacy (§3.1-§3.2, rows 10-14)', () => {
    const f = o.forces
    expect(DEFAULT_FORCES).toEqual(f.AllForces)
    const nodes = buildSimNodes(graph.nodes[0], new Map(), () => ({ x: 0, y: 0, r: 0 }))
    const radii = computeRadii(graph, 'size', 1, () => 117)
    for (const n of nodes) n.r = radii.get(n.node)!
    const sim = new RecipeSimulation()
    sim.load(nodes, [])
    const s = sim.sim
    expect(s.alphaMin()).toBeCloseTo(f.simulation.alphaMin, 6)
    expect(s.alphaDecay()).toBeCloseTo(f.simulation.alphaDecay, 3)
    expect(s.velocityDecay()).toBeCloseTo(f.simulation.velocityDecay, 6)
    for (const name of f.forceNames) expect(s.force(name), name).toBeTruthy()
    // Membership and radius per node, as legacy's isolate() filters and radius functions give them.
    for (const [name, c] of Object.entries(f.collide)) {
      if (!c) continue
      const force = s.force(name) as unknown as { radius(): (d: SimNode) => number; strength(): number }
      expect(force.strength(), name).toBe(c.strength)
      nodes.forEach((n, i) => {
        const member = name === 'leaf' ? n.leaf : n.depth === Number(name.slice(1))
        expect(member ? 1 : 0, `${name} ${o.nodes[i].name}`).toBe(c.member[i])
        if (member && n.parent && (!n.children?.length || n.leaf)) expect(force.radius()(n), `${name} ${o.nodes[i].name}`).toBeCloseTo(c.radius[i]!, 2)
      })
    }
  })
})
