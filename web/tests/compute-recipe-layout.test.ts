import { describe, expect, it } from 'vitest'
import { computeRecipeLayout } from '../src/domain/recipe/computeRecipeLayout'
import type { CompartmentData, IngredientData, RecipeNode } from '../src/domain/recipe/types'

function ingredient(name: string, overrides: Partial<IngredientData> = {}): IngredientData {
  return {
    nodetype: 'ingredient',
    name,
    label: name,
    size: 10,
    molecularweight: 0,
    confidence: 0,
    source: { pdb: '', bu: '', model: '', selection: '' },
    count: 0,
    molarity: 0,
    surface: false,
    geom: '',
    geom_type: '',
    comments: '',
    uniprot: '',
    pcpalAxis: [0, 0, 1],
    offset: [0, 0, 0],
    fiberAxis: [0, 0, 1],
    fiberOffset: [0, 0, 0],
    pos: null,
    radii: null,
    ingtype: 'protein',
    buildtype: 'random',
    color: null,
    sprite: { image: null, offsety: 0, scale2d: 1, lengthy: 0 },
    ...overrides,
  }
}

function compartment(name: string): CompartmentData {
  return { nodetype: 'compartment', name, geom: '', geom_type: 'None', thickness: 0, color: null }
}

/** Builds a one-compartment root with the given ingredient data objects as its children. */
function buildRoot(ingredients: IngredientData[]): RecipeNode {
  const root: RecipeNode = { data: compartment('root'), parent: null, children: [] }
  root.children = ingredients.map((data) => ({ data, parent: root, children: undefined }))
  ;(root.data as CompartmentData & { children?: unknown }).children = []
  return root
}

// `computeRecipeLayout` is now a pure, one-shot `d3.hierarchy`+`d3.pack` computation only — no
// force solve. The custom-force behavior these tests used to assert on (surface pull, cluster
// separation, linkForce attraction) moved to `recipe-forces.test.ts`, which tests each force
// factory directly via velocity-delta assertions — see that file and `useRecipeSimulation.ts`'s
// docstring for why (this function no longer ticks a simulation at all, so there's no settled
// position to assert on here).
describe('computeRecipeLayout', () => {
  it('packs a root with no children without throwing', () => {
    const root = buildRoot([])
    const { descendants } = computeRecipeLayout(root, 'size', 1, 600, 600)
    expect(descendants).toHaveLength(1)
    expect(descendants[0].r).toBeGreaterThan(0)
    expect(Number.isFinite(descendants[0].r)).toBe(true)
  })

  it('gives an empty child compartment a visible draggable radius', () => {
    const root = buildRoot([ingredient('a')])
    const emptyCompartment: RecipeNode = { data: compartment('empty'), parent: root, children: [] }
    root.children!.push(emptyCompartment)
    const { posMap } = computeRecipeLayout(root, 'size', 1, 600, 400)
    expect(posMap.get(emptyCompartment)!.r).toBeGreaterThan(0)
    expect(Number.isFinite(posMap.get(emptyCompartment)!.r)).toBe(true)
  })

  it('packs ingredient leaves alongside the root compartment', () => {
    const root = buildRoot([ingredient('a'), ingredient('b')])
    const { descendants } = computeRecipeLayout(root, 'size', 1, 600, 600)
    const leaves = descendants.filter((d) => !d.children)
    expect(leaves).toHaveLength(2)
  })

  it('is deterministic given the same input graph', () => {
    const root = buildRoot([ingredient('a', { surface: true }), ingredient('b')])
    const first = computeRecipeLayout(root, 'size', 1, 600, 600)
    const second = computeRecipeLayout(root, 'size', 1, 600, 600)
    const firstLeaf = first.descendants.find((d) => !d.children)!
    const secondLeaf = second.descendants.find((d) => !d.children)!
    expect(firstLeaf.x).toBeCloseTo(secondLeaf.x, 6)
    expect(firstLeaf.y).toBeCloseTo(secondLeaf.y, 6)
  })

  it('sizeBy changes relative radii: "size" ranks by size, "molecularweight" ranks by MW', () => {
    // 'small' has the bigger size but the smaller molecular weight, and vice versa for 'large' —
    // if sizeBy is actually taking effect, the two modes should disagree on which is bigger.
    const root = buildRoot([
      ingredient('small', { size: 40, molecularweight: 1 }),
      ingredient('large', { size: 5, molecularweight: 1000 }),
    ])
    const bySize = computeRecipeLayout(root, 'size', 1, 600, 600)
    const byMw = computeRecipeLayout(root, 'molecularweight', 1, 600, 600)
    const radiusFor = (layout: ReturnType<typeof computeRecipeLayout>, name: string) =>
      layout.posMap.get(root.children!.find((n) => (n.data as IngredientData).name === name)!)!.r

    expect(radiusFor(bySize, 'small')).toBeGreaterThan(radiusFor(bySize, 'large'))
    expect(radiusFor(byMw, 'large')).toBeGreaterThan(radiusFor(byMw, 'small'))
  })

  it('radiusScale grows/shrinks the whole packed diagram uniformly ("Scale Radius by", legacy radius_scale)', () => {
    // d3.pack() auto-fits to its container box, so a uniform multiplier on every leaf's pack
    // *weight* would be a no-op (ratios — and therefore the fitted layout — are invariant to a
    // constant scale). radiusScale is applied to the pack's container dimensions instead, so the
    // whole diagram (here: the single root compartment's own packed radius) grows as one.
    const root = buildRoot([ingredient('a', { size: 10 }), ingredient('b', { size: 20 })])
    const unscaled = computeRecipeLayout(root, 'size', 1, 600, 600)
    const scaled = computeRecipeLayout(root, 'size', 2, 600, 600)
    const rootUnscaled = unscaled.posMap.get(root)!.r
    const rootScaled = scaled.posMap.get(root)!.r
    expect(rootScaled).toBeCloseTo(rootUnscaled * 2, 5)
  })
})
