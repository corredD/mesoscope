import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultMergeFieldFlags, mergeRecipeGraphs, type MergeFieldFlags } from '../src/domain/recipe/mergeRecipe'
import { parseLegacyRecipe } from '../src/domain/recipe/parseLegacyRecipe'
import { isIngredientNode, type RecipeGraph } from '../src/domain/recipe/types'

function loadDataFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

function loadMergeFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, 'fixtures/merge-oracle', name), 'utf-8'))
}

function emptyGraph(): RecipeGraph {
  return {
    nodes: [{ data: { nodetype: 'compartment', name: 'root', geom: '', geom_type: 'None', thickness: 7.5, color: null, children: [] }, parent: null, children: [] }],
    links: [],
  }
}

const fingerprint = (data: { name: string; count: number; molarity: number; source: { pdb: string } }) =>
  JSON.stringify([data.name, data.count, data.molarity, data.source.pdb])

/**
 * Both oracle scenarios below were captured by running the actual legacy app
 * (localCGIServer.py, :8080) against data/Mpn_1.0_2.json — not derived from
 * reading js/main.js. See mergeRecipe.ts's docstring for why: several merge
 * checkboxes look "live" by field-name matching but are dead in legacy's own
 * output, and that's only visible by actually running the merge and diffing.
 */
describe('mergeRecipeGraphs: oracle scenario A — merge into an empty recipe (isolates createWhenMerge)', () => {
  const current = emptyGraph()
  const incoming = parseLegacyRecipe(loadDataFixture('Mpn_1.0_2.json'), 'classic')
  const merged = mergeRecipeGraphs(current, incoming, { fieldFlags: defaultMergeFieldFlags(), createWhenMerge: true })
  const expected = parseLegacyRecipe(loadMergeFixture('scenario-a-empty-merge-mpn.json'), 'classic')

  it('creates every incoming ingredient once, reparented under the current root (incoming root name is dropped)', () => {
    const mergedIngredients = merged.nodes.filter(isIngredientNode)
    const expectedIngredients = expected.nodes.filter(isIngredientNode)
    expect(mergedIngredients).toHaveLength(expectedIngredients.length)
    expect(mergedIngredients.map((n) => fingerprint(n.data)).sort()).toEqual(expectedIngredients.map((n) => fingerprint(n.data)).sort())
  })

  it("keeps the current graph's own root name, not the incoming recipe's root name", () => {
    expect(merged.nodes[0].data.name).toBe('root')
    expect(merged.nodes.some((n) => n.data.name === 'MycoPn')).toBe(false)
  })
})

describe('mergeRecipeGraphs: oracle scenario B — merge a recipe into an identical copy of itself (isolates the update-on-collision path)', () => {
  const current = parseLegacyRecipe(loadDataFixture('Mpn_1.0_2.json'), 'classic')
  const incoming = parseLegacyRecipe(loadDataFixture('Mpn_1.0_2.json'), 'classic') // separate parse, not the same object graph
  const merged = mergeRecipeGraphs(current, incoming, { fieldFlags: defaultMergeFieldFlags(), createWhenMerge: true })
  const expected = parseLegacyRecipe(loadMergeFixture('scenario-b-mpn-merge-mpn.json'), 'classic')

  it('does not duplicate any node when every incoming name collides', () => {
    expect(merged.nodes).toHaveLength(current.nodes.length)
    const mergedIngredients = merged.nodes.filter(isIngredientNode)
    const expectedIngredients = expected.nodes.filter(isIngredientNode)
    expect(mergedIngredients.map((n) => fingerprint(n.data)).sort()).toEqual(expectedIngredients.map((n) => fingerprint(n.data)).sort())
  })
})

describe('mergeRecipeGraphs: oracle scenario C — merge a hand-perturbed copy (isolates which fields actually change)', () => {
  const current = parseLegacyRecipe(loadDataFixture('Mpn_1.0_2.json'), 'classic')
  const incoming = parseLegacyRecipe(loadMergeFixture('Mpn_perturbed.json'), 'classic')
  const merged = mergeRecipeGraphs(current, incoming, { fieldFlags: defaultMergeFieldFlags(), createWhenMerge: true })
  const expected = parseLegacyRecipe(loadMergeFixture('scenario-c-mpn-merge-perturbed.json'), 'classic')

  const mpn052 = (g: RecipeGraph) => g.nodes.filter(isIngredientNode).find((n) => n.data.name === 'mpn052')!.data

  it('overwrites the fields the perturbed copy actually changed (count, molarity, uniprot, confidence, color, label)', () => {
    const m = mpn052(merged)
    const e = mpn052(expected)
    expect(m.count).toBe(e.count)
    expect(m.count).toBe(9999)
    expect(m.molarity).toBeCloseTo(e.molarity)
    expect(m.uniprot).toBe(e.uniprot)
    expect(m.uniprot).toBe('PERTURBED_UNIPROT')
    expect(m.confidence).toBeCloseTo(e.confidence)
    expect(m.color).toEqual(e.color)
    expect(m.label).toBe(e.label)
  })

  it('overwrites source.bu/selection/model as a side effect of the whole `source` object being replaced', () => {
    const m = mpn052(merged)
    expect(m.source.bu).toBe('BU9')
    expect(m.source.selection).toBe(':X')
    expect(m.source.model).toBe('3')
  })

  it('does NOT overwrite comments — the legacy "comment" checkbox targets a field name ("comment") that never matches the real field ("comments")', () => {
    const original = parseLegacyRecipe(loadDataFixture('Mpn_1.0_2.json'), 'classic')
    const originalComments = mpn052(original).comments
    expect(mpn052(merged).comments).toBe(originalComments)
    expect(mpn052(merged).comments).not.toBe('PERTURBED_COMMENT')
  })
})

describe('mergeRecipeGraphs: synthetic coverage for branches the Mpn oracle cannot exercise', () => {
  function graphWith(nodes: { name: string; count: number; molarity: number; parentName?: string }[]): RecipeGraph {
    const root = { data: { nodetype: 'compartment' as const, name: 'root', geom: '', geom_type: 'None', thickness: 7.5, color: null, children: [] }, parent: null, children: [] as import('../src/domain/recipe/types').RecipeNode[] }
    const byName = new Map([['root', root]])
    for (const n of nodes) {
      const parent = byName.get(n.parentName ?? 'root')!
      const node = {
        data: {
          nodetype: 'ingredient' as const, name: n.name, label: '', size: 25, molecularweight: 0, confidence: 0,
          source: { pdb: '', bu: 'BU1', model: '', selection: '' }, count: n.count, molarity: n.molarity, surface: false,
          geom: '', geom_type: 'file', comments: '', uniprot: '', pcpalAxis: [0, 0, 1], offset: [0, 0, 0],
          fiberAxis: [0, 0, 1], fiberOffset: [0, 0, 0], pos: null, radii: null, ingtype: 'protein', buildtype: 'random',
          color: null, sprite: { image: null, offsety: 0, scale2d: 0, lengthy: 0 },
        },
        parent,
      }
      parent.children.push(node)
      byName.set(n.name, node)
    }
    return { nodes: [root, ...nodes.map((n) => byName.get(n.name)!)], links: [] }
  }

  it('createWhenMerge=false drops unmatched incoming nodes instead of creating them', () => {
    const current = graphWith([{ name: 'A', count: 1, molarity: 0.1 }])
    const incoming = graphWith([{ name: 'A', count: 2, molarity: 0.2 }, { name: 'B', count: 3, molarity: 0.3 }])
    const merged = mergeRecipeGraphs(current, incoming, { fieldFlags: defaultMergeFieldFlags(), createWhenMerge: false })
    expect(merged.nodes.map((n) => n.data.name).sort()).toEqual(['A', 'root'])
    expect(merged.nodes.find((n) => n.data.name === 'A')!.data.count).toBe(2) // still updated: it collided
  })

  it('an unchecked field flag leaves that field untouched on collision', () => {
    const current = graphWith([{ name: 'A', count: 1, molarity: 0.1 }])
    const incoming = graphWith([{ name: 'A', count: 99, molarity: 0.99 }])
    const flags: MergeFieldFlags = { ...defaultMergeFieldFlags(), count: false }
    const merged = mergeRecipeGraphs(current, incoming, { fieldFlags: flags, createWhenMerge: true })
    const a = merged.nodes.find((n) => n.data.name === 'A')!.data as { count: number; molarity: number }
    expect(a.count).toBe(1) // unchecked, untouched
    expect(a.molarity).toBe(0.99) // still checked by default
  })

  it('reparents a newly-created node under a same-named current-graph node, falling back to root', () => {
    const current = graphWith([]) // just root
    // Build the incoming graph's own compartment ("no-match-in-current") so the
    // child's `.parent.data.name` resolves to a real name that simply doesn't
    // exist in `current` — that's the case merge_one_node falls back on.
    const incomingRoot = { data: { nodetype: 'compartment' as const, name: 'incoming-root', geom: '', geom_type: 'None', thickness: 7.5, color: null, children: [] }, parent: null, children: [] as import('../src/domain/recipe/types').RecipeNode[] }
    const incomingComp = { data: { nodetype: 'compartment' as const, name: 'no-match-in-current', geom: '', geom_type: 'None', thickness: 7.5, color: null, children: [] }, parent: incomingRoot, children: [] as import('../src/domain/recipe/types').RecipeNode[] }
    incomingRoot.children.push(incomingComp)
    const incomingChild = {
      data: {
        nodetype: 'ingredient' as const, name: 'child', label: '', size: 25, molecularweight: 0, confidence: 0,
        source: { pdb: '', bu: 'BU1', model: '', selection: '' }, count: 5, molarity: 0.5, surface: false,
        geom: '', geom_type: 'file', comments: '', uniprot: '', pcpalAxis: [0, 0, 1], offset: [0, 0, 0],
        fiberAxis: [0, 0, 1], fiberOffset: [0, 0, 0], pos: null, radii: null, ingtype: 'protein', buildtype: 'random',
        color: null, sprite: { image: null, offsety: 0, scale2d: 0, lengthy: 0 },
      },
      parent: incomingComp,
    }
    incomingComp.children.push(incomingChild)
    const incoming: RecipeGraph = { nodes: [incomingRoot, incomingComp, incomingChild], links: [] }

    const merged = mergeRecipeGraphs(current, incoming, { fieldFlags: defaultMergeFieldFlags(), createWhenMerge: true })
    // "no-match-in-current" itself gets created (falls back to current root), then "child" is
    // reparented under THAT new compartment (which now legitimately exists in the merged graph).
    const newComp = merged.nodes.find((n) => n.data.name === 'no-match-in-current')!
    const child = merged.nodes.find((n) => n.data.name === 'child')!
    expect(newComp.parent).toBe(merged.nodes[0]) // fell back to current root
    expect(child.parent).toBe(newComp)
    expect(newComp.children).toContain(child)
  })

  it('link merge updates an existing link matched by name pair (either order) and adds nothing new', () => {
    const link = (name1: string, name2: string, pdb1: string) => ({
      id: 0, source: {} as never, target: {} as never, name1, name2, pdb1, sel1: '', sel2: '',
      coords1: [], coords2: [], beads1: [], beads2: [],
    })
    const current: RecipeGraph = { nodes: [], links: [link('A', 'B', 'old.pdb')] }
    const incoming: RecipeGraph = { nodes: [], links: [link('B', 'A', 'new.pdb'), link('C', 'D', 'unmatched.pdb')] }
    const merged = mergeRecipeGraphs(current, incoming, { fieldFlags: defaultMergeFieldFlags(), createWhenMerge: true })
    expect(merged.links).toHaveLength(1) // the unmatched C/D link is never added
    expect(merged.links[0].pdb1).toBe('new.pdb') // matched in swapped order, updated in place
  })
})
