import { describe, expect, it } from 'vitest'
import {
  buildClusterAnchors,
  clusterAnchors,
  constrainLeafAgainstCompartments,
  constrainLeafToParent,
  createClusterForce,
  createParentContainmentForce,
  createSurfaceForce,
  type SimNode,
} from '../src/domain/recipe/recipeForces'
import { buildSimLinks, constrainPackedNodeAgainstCompartments, translatePackedSubtree } from '../src/domain/recipe/useRecipeSimulation'
import { computeRecipeLayout, type PackedNode } from '../src/domain/recipe/computeRecipeLayout'
import type { CompartmentData, IngredientData, RecipeNode } from '../src/domain/recipe/types'

/**
 * The 3 custom forces (surface/cluster/parent-containment) moved here from
 * `compute-recipe-layout.test.ts` once the live-simulation rewrite split them out of that file
 * into pure, DOM-free factories in `recipeForces.ts`. Tested via velocity-delta assertions — one
 * call at `alpha=1`, exact expected `vx`/`vy` computed from the same formula the force itself
 * uses — rather than a settled-position-after-N-ticks check, since a live simulation no longer
 * has a fixed tick count to characterize against (see `useRecipeSimulation.ts`'s docstring).
 */

function ingredientData(name: string, overrides: Partial<IngredientData> = {}): IngredientData {
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

function compartmentData(name: string, thickness = 0): CompartmentData {
  return { nodetype: 'compartment', name, geom: '', geom_type: 'None', thickness, color: null }
}

/** Minimal hand-built `PackedNode` fixture for a compartment — only the fields the 3 custom
 *  forces actually read (`x`/`y`/`r`) need to be real; the rest of `d3.HierarchyCircularNode`'s
 *  surface (`ancestors()` etc.) is never called by these pure force functions. */
function makeParent(x: number, y: number, r: number, thickness = 0): PackedNode {
  const node: RecipeNode = { data: compartmentData('parent', thickness), parent: null, children: [] }
  return { data: node, x, y, r, depth: 0, height: 1, parent: null, children: [] } as unknown as PackedNode
}

/** Minimal hand-built `SimNode` fixture for a leaf, parented to `parent`. `vx`/`vy` start at 0 so
 *  a single force-function call's result IS the delta, with no prior contribution to subtract. */
function makeLeaf(parent: PackedNode, data: IngredientData, x: number, y: number, r: number): SimNode {
  const node: RecipeNode = { data, parent: parent.data, children: undefined }
  return { data: node, x, y, r, vx: 0, vy: 0, depth: 1, height: 0, parent, children: undefined } as unknown as SimNode
}

describe('createSurfaceForce', () => {
  it('nudges a surface=true leaf toward its parent boundary, exact delta matching the formula', () => {
    const parent = makeParent(100, 100, 50)
    const leaf = makeLeaf(parent, ingredientData('membrane', { surface: true }), 110, 100, 5)
    createSurfaceForce([leaf], { current: 1 })(1)
    // The ingredient centre belongs on the membrane centreline: targetR=parent.r=50.
    expect(leaf.vx).toBeCloseTo(40, 10) // (150 - 110) * 1 * 1
    expect(leaf.vy).toBeCloseTo(0, 10)
  })

  it('scales linearly with strength.current and alpha', () => {
    const parent = makeParent(0, 0, 50)
    const leaf = makeLeaf(parent, ingredientData('membrane', { surface: true }), 10, 0, 5)
    createSurfaceForce([leaf], { current: 0.5 })(0.4)
    // dx=10, targetR=50, tx=50, vx = (50-10)*0.5*0.4 = 8
    expect(leaf.vx).toBeCloseTo(8, 10)
  })

  it('leaves a non-surface leaf completely untouched', () => {
    const parent = makeParent(100, 100, 50)
    const leaf = makeLeaf(parent, ingredientData('interior', { surface: false }), 110, 100, 5)
    createSurfaceForce([leaf], { current: 1 })(1)
    expect(leaf.vx).toBe(0)
    expect(leaf.vy).toBe(0)
  })

  it('reads strength through the live ref every call, not a value captured at creation', () => {
    const parent = makeParent(0, 0, 50)
    const leaf = makeLeaf(parent, ingredientData('membrane', { surface: true }), 10, 0, 5)
    const strength = { current: 0 }
    const force = createSurfaceForce([leaf], strength)
    force(1)
    expect(leaf.vx).toBe(0) // strength was 0 at call time
    strength.current = 1 // mutate AFTER the force closure was created
    force(1)
    expect(leaf.vx).toBeCloseTo(40, 10) // now takes effect, matching the UPDATE lifecycle tier
  })
})

describe('constrainLeafToParent', () => {
  it('projects a surface ingredient exactly onto the parent boundary and preserves tangential motion', () => {
    const parent = makeParent(100, 100, 50)
    const leaf = makeLeaf(parent, ingredientData('membrane', { surface: true }), 110, 100, 5)
    leaf.vx = 4
    leaf.vy = 3

    constrainLeafToParent(leaf)

    expect(leaf.x).toBeCloseTo(150, 10)
    expect(leaf.y).toBeCloseTo(100, 10)
    expect(leaf.vx).toBeCloseTo(0, 10) // radial component removed
    expect(leaf.vy).toBeCloseTo(3, 10) // tangential component preserved
  })

  it('clamps an interior ingredient fully inside its parent but leaves an already-contained one untouched', () => {
    const parent = makeParent(0, 0, 50)
    const outside = makeLeaf(parent, ingredientData('outside'), 60, 0, 10)
    outside.vx = 5
    constrainLeafToParent(outside)
    expect(outside.x).toBeCloseTo(40, 10)
    expect(outside.vx).toBeCloseTo(0, 10)

    const inside = makeLeaf(parent, ingredientData('inside'), 10, 5, 10)
    constrainLeafToParent(inside)
    expect(inside.x).toBe(10)
    expect(inside.y).toBe(5)
  })

  it('keeps an interior ingredient inside the membrane inner edge, including membrane thickness', () => {
    const root = makeParent(0, 0, 200)
    const parent = makeParent(0, 0, 50, 10)
    parent.parent = root
    parent.data.parent = root.data
    const leaf = makeLeaf(parent, ingredientData('inside'), 60, 0, 10)

    constrainLeafToParent(leaf)

    // inner edge = 50 - 5; the whole 10px ingredient must fit inside it.
    expect(leaf.x).toBeCloseTo(35, 10)
  })
})

describe('constrainLeafAgainstCompartments', () => {
  it('projects a foreign ingredient outside a compartment outer membrane', () => {
    const root = makeParent(0, 0, 300)
    const obstacle = makeParent(0, 0, 30, 10)
    obstacle.parent = root
    obstacle.data.parent = root.data
    const leaf = makeLeaf(root, ingredientData('foreign'), 10, 0, 5)
    leaf.vx = -2

    constrainLeafAgainstCompartments(leaf, [root, obstacle])

    // outer edge = 30 + 5; add the leaf radius 5 => centre must be at least 40 away.
    expect(leaf.x).toBeCloseTo(40, 10)
    expect(leaf.vx).toBeCloseTo(0, 10)
  })

  it('does not reject an ingredient from its own compartment or any ancestor compartment', () => {
    const root = makeParent(0, 0, 300)
    const ownCompartment = makeParent(0, 0, 30, 10)
    ownCompartment.parent = root
    ownCompartment.data.parent = root.data
    const leaf = makeLeaf(ownCompartment, ingredientData('member'), 10, 0, 5)

    constrainLeafAgainstCompartments(leaf, [root, ownCompartment])

    expect(leaf.x).toBe(10)
    expect(leaf.y).toBe(0)
  })
})

describe('constrainPackedNodeAgainstCompartments', () => {
  it('keeps unrelated compartment membrane bands from overlapping during drag', () => {
    const root = makeParent(0, 0, 300)
    const dragged = makeParent(-80, 0, 30, 10)
    const obstacle = makeParent(40, 0, 40, 10)
    dragged.parent = root
    obstacle.parent = root
    dragged.data.parent = root.data
    obstacle.data.parent = root.data

    const [x, y] = constrainPackedNodeAgainstCompartments(dragged, obstacle.x, obstacle.y, [root, dragged, obstacle])

    expect(Math.hypot(x - obstacle.x, y - obstacle.y)).toBeCloseTo(80, 10)
  })
})

describe('translatePackedSubtree', () => {
  it('moves a compartment and all contents rigidly while keeping the compartment inside its parent', () => {
    const root: RecipeNode = { data: compartmentData('root'), parent: null, children: [] }
    const compartment: RecipeNode = { data: compartmentData('inner'), parent: root, children: [] }
    const a: RecipeNode = { data: ingredientData('a'), parent: compartment }
    const b: RecipeNode = { data: ingredientData('b'), parent: compartment }
    compartment.children = [a, b]
    root.children = [compartment]

    const { posMap } = computeRecipeLayout(root, 'size', 1, 600, 400)
    const packed = posMap.get(compartment)!
    const parent = packed.parent as PackedNode
    const before = new Map(packed.descendants().map((node) => [node.data, [node.x, node.y] as const]))

    const moved = translatePackedSubtree(packed, parent.x + parent.r * 10, parent.y)
    const compartmentDelta = [packed.x - before.get(compartment)![0], packed.y - before.get(compartment)![1]]

    expect(moved).toHaveLength(3)
    expect(Math.hypot(packed.x - parent.x, packed.y - parent.y)).toBeLessThanOrEqual(parent.r - packed.r + 1e-8)
    for (const node of moved) {
      const [oldX, oldY] = before.get(node.data)!
      expect(node.x - oldX).toBeCloseTo(compartmentDelta[0], 10)
      expect(node.y - oldY).toBeCloseTo(compartmentDelta[1], 10)
    }
  })
})

describe('clusterAnchors / buildClusterAnchors', () => {
  it('places one anchor per unique value, evenly spaced on a ring', () => {
    const parent = makeParent(0, 0, 100)
    const anchors = clusterAnchors(parent, ['enzyme', 'enzyme', 'structural'])
    expect([...anchors.keys()].sort()).toEqual(['enzyme', 'structural'])
    // 2 unique values -> angles 0 and pi; ring radius = parent.r * 0.5 = 50
    expect(anchors.get('enzyme')).toEqual([50, 0])
    const structural = anchors.get('structural')!
    expect(structural[0]).toBeCloseTo(-50, 5)
    expect(structural[1]).toBeCloseTo(0, 5)
  })

  it('buildClusterAnchors groups leaves by parent — same value in different compartments gets independent anchors', () => {
    const parentA = makeParent(0, 0, 100)
    const parentB = makeParent(1000, 0, 100)
    const a1 = makeLeaf(parentA, ingredientData('a1', { ingtype: 'enzyme' }), 10, 0, 5)
    const b1 = makeLeaf(parentB, ingredientData('b1', { ingtype: 'enzyme' }), 1010, 0, 5)
    const anchorsByParent = buildClusterAnchors([a1, b1], 'ingtype')
    expect(anchorsByParent.get(parentA)!.get('enzyme')).toEqual([50, 0])
    expect(anchorsByParent.get(parentB)!.get('enzyme')).toEqual([1050, 0])
  })

  it('returns an empty map when groupBy is null', () => {
    const parent = makeParent(0, 0, 100)
    const leaf = makeLeaf(parent, ingredientData('a'), 10, 0, 5)
    expect(buildClusterAnchors([leaf], null).size).toBe(0)
  })
})

describe('createClusterForce', () => {
  it('pulls each leaf toward its own value\'s anchor, exact delta', () => {
    const parent = makeParent(0, 0, 100)
    const a1 = makeLeaf(parent, ingredientData('a1', { ingtype: 'enzyme' }), 10, 0, 5)
    const a2 = makeLeaf(parent, ingredientData('a2', { ingtype: 'enzyme' }), -10, 0, 5)
    const b1 = makeLeaf(parent, ingredientData('b1', { ingtype: 'structural' }), 0, 10, 5)
    const leaves = [a1, a2, b1]
    const anchors = buildClusterAnchors(leaves, 'ingtype')
    createClusterForce(leaves, 'ingtype', anchors, { current: 1 })(1)

    // enzyme anchor = [50, 0] (see clusterAnchors tests above)
    expect(a1.vx).toBeCloseTo(40, 10) // (50 - 10) * 1 * 1
    expect(a1.vy).toBeCloseTo(0, 10)
    expect(a2.vx).toBeCloseTo(60, 10) // (50 - -10) * 1 * 1
    expect(a2.vy).toBeCloseTo(0, 10)
    // structural anchor ~= [-50, 0]
    expect(b1.vx).toBeCloseTo(-50, 5)
    expect(b1.vy).toBeCloseTo(-10, 10) // (0 - 10) * 1 * 1
  })

  it('is a no-op when groupBy is null, even with a non-empty anchors map', () => {
    const parent = makeParent(0, 0, 100)
    const leaf = makeLeaf(parent, ingredientData('a', { ingtype: 'enzyme' }), 10, 0, 5)
    const anchors = buildClusterAnchors([leaf], 'ingtype') // built with a real groupBy...
    createClusterForce([leaf], null, anchors, { current: 1 })(1) // ...but force called with null
    expect(leaf.vx).toBe(0)
    expect(leaf.vy).toBe(0)
  })
})

describe('createParentContainmentForce', () => {
  it('pulls a leaf that has drifted outside its parent boundary back toward the center', () => {
    const parent = makeParent(0, 0, 50)
    const leaf = makeLeaf(parent, ingredientData('a'), 45, 0, 10) // dist=45, r=10: 45+12=57 > 45
    createParentContainmentForce([leaf], { current: 1 })(1)
    expect(leaf.vx).toBeCloseTo(-45, 10) // (0 - 45) * 1 * 1
    expect(leaf.vy).toBeCloseTo(0, 10)
  })

  it('leaves a leaf comfortably inside the boundary untouched', () => {
    const parent = makeParent(0, 0, 50)
    const leaf = makeLeaf(parent, ingredientData('a'), 10, 0, 10) // dist=10: 10+12=22 <= 45
    createParentContainmentForce([leaf], { current: 1 })(1)
    expect(leaf.vx).toBe(0)
    expect(leaf.vy).toBe(0)
  })

  it('excludes surface leaves regardless of position — that is createSurfaceForce\'s job', () => {
    const parent = makeParent(0, 0, 50)
    const leaf = makeLeaf(parent, ingredientData('a', { surface: true }), 45, 0, 10) // would trigger if not surface
    createParentContainmentForce([leaf], { current: 1 })(1)
    expect(leaf.vx).toBe(0)
    expect(leaf.vy).toBe(0)
  })
})

describe('buildSimLinks', () => {
  it('includes a link only when both endpoints resolve to a currently-simulated leaf', () => {
    const parent = makeParent(0, 0, 100)
    const a = makeLeaf(parent, ingredientData('a'), 10, 0, 5)
    const b = makeLeaf(parent, ingredientData('b'), -10, 0, 5)
    const leaves = [a, b]
    const posMap = new Map([
      [a.data, a],
      [b.data, b],
      [parent.data, parent],
    ])
    const linkBetweenLeaves = { id: 1, source: a.data, target: b.data, name1: 'a', name2: 'b', pdb1: '', sel1: '', sel2: '', coords1: [], coords2: [], beads1: [], beads2: [] }
    const linkToCompartment = { id: 2, source: a.data, target: parent.data, name1: 'a', name2: 'parent', pdb1: '', sel1: '', sel2: '', coords1: [], coords2: [], beads1: [], beads2: [] }

    const simLinks = buildSimLinks([linkBetweenLeaves, linkToCompartment], posMap, leaves)

    expect(simLinks).toHaveLength(1)
    expect(simLinks[0].source).toBe(a)
    expect(simLinks[0].target).toBe(b)
  })
})
