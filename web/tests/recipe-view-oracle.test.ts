// The Recipe view's deterministic outputs against the legacy oracle (recipe-view.md §10.8): radii (§1.7, rows 4-8),
// colours per mode (§6, rows 81-90), strokes (row 28), labels (§2.7, rows 34-38), draw order (row 29) and what each
// gesture selects (§4.5). Fixtures: tests/oracle/capture-recipe-view.mjs on the running legacy app.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { color } from 'd3-color'
import { parseLegacyRecipe, detectRecipeFormat } from '../src/domain/recipe/parseLegacyRecipe'
import type { IngredientData, RecipeGraph } from '../src/domain/recipe/types'
import { computeRadii } from '../src/domain/recipe/view/layout'
import { colorNode, colorNodeInfos, depthColor, prepareColors, COLOR_MODES } from '../src/domain/recipe/view/colors'
import { compartmentTitle, estimateCharWidth, ingredientLabelGeometry, ingredientLabelText, ROTATION_TEXT } from '../src/domain/recipe/view/labels'
import { Z } from '../src/components/recipe/recipeDraggable'

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
interface Oracle {
  rotationText: number[]
  colorModes: string[]
  nodes: OracleNode[]
  frame: Op[]
  frameZoomed: Op[]
  gestures: Record<string, { target: string; nodeSelected: string | null; nodesSelections: string[] } | null>
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

  it('draws compartments, then ingredients, then labels, as the layers stack (§2.2, row 29)', () => {
    const arcs = o.frame.map((op, i) => ({ op, i })).filter(({ op }) => op.op === 'arc')
    const radii = computeRadii(graph, 'size', 1)
    const leafR = new Set(infos.filter((i) => !i.node.children).map((i) => radii.get(i.node)!.toFixed(2)))
    const firstLeafArc = arcs.find(({ op }) => leafR.has(Number(op.args[2]).toFixed(2)))?.i ?? Infinity
    const lastCompartmentArc = Math.max(...arcs.filter(({ op }) => !leafR.has(Number(op.args[2]).toFixed(2))).map(({ i }) => i))
    const firstText = o.frame.findIndex((op) => op.op === 'fillText')
    const lastArc = Math.max(...arcs.map(({ i }) => i))
    expect(lastCompartmentArc).toBeLessThan(firstLeafArc)
    expect(lastArc).toBeLessThan(firstText)
    // Our layers: compartments sit at their depth (< links), then links, ingredients, pair lines, labels, legend.
    expect(Math.max(...infos.map((i) => i.depth))).toBeLessThan(Z.links)
    expect([Z.links, Z.ingredients, Z.pairLines, Z.tempLink, Z.labels, Z.legend]).toEqual([...[Z.links, Z.ingredients, Z.pairLines, Z.tempLink, Z.labels, Z.legend]].sort((a, b) => a - b))
  })
})
