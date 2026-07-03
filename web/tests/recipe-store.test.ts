import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecipeStore } from '../src/state/recipeStore'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

beforeEach(() => {
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null })
})

describe('recipeStore.loadEmpty', () => {
  it('creates a bare root recipe, matching legacy CreateNew()', () => {
    useRecipeStore.getState().loadEmpty()
    const { graph, format, error } = useRecipeStore.getState()
    expect(error).toBeNull()
    expect(format).toBe('classic')
    expect(graph?.nodes).toHaveLength(1)
    expect(graph?.nodes[0].data.name).toBe('root')
  })
})

describe('recipeStore.loadFromJson', () => {
  it('auto-detects and parses a serialized fixture', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('HIV_serialized.json'))
    const { graph, format, error } = useRecipeStore.getState()
    expect(error).toBeNull()
    expect(format).toBe('serialized')
    expect(graph?.nodes[0].data.name).toBe('HIV')
    expect(graph?.nodes.filter((n) => n.data.nodetype === 'ingredient')).toHaveLength(26)
  })

  it('auto-detects and parses a classic fixture', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const { graph, format, error } = useRecipeStore.getState()
    expect(error).toBeNull()
    expect(format).toBe('classic')
    expect(graph?.nodes.filter((n) => n.data.nodetype === 'ingredient')).toHaveLength(3)
  })

  it('sets an error and leaves the graph untouched for invalid JSON', () => {
    useRecipeStore.getState().loadEmpty()
    useRecipeStore.getState().loadFromJson({ not: 'a recipe' })
    const { graph, error } = useRecipeStore.getState()
    expect(error).not.toBeNull()
    expect(graph?.nodes[0].data.name).toBe('root') // unchanged from the prior loadEmpty()
  })
})

describe('recipeStore.applyColorPalette / applyMolarityCount', () => {
  it('applies an imported color palette onto the loaded graph in place', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const before = useRecipeStore.getState().graph!
    const ha = before.nodes.find((n) => n.data.name === 'Hemagglutinin')!

    useRecipeStore.getState().applyColorPalette({ [`${before.nodes[0].data.name}.envelope.surface.proteins.Hemagglutinin`]: { x: 10, y: 20, z: 30 } })

    const after = useRecipeStore.getState().graph!
    expect(after).not.toBe(before) // new graph reference so subscribers re-render
    const haAfter = after.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    expect(haAfter.data.color).toEqual([10 / 255, 20 / 255, 30 / 255])
    expect(ha.data.color).toEqual([10 / 255, 20 / 255, 30 / 255]) // same underlying node, mutated in place
  })

  it('applies imported molarity/count onto the loaded graph', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const rootName = graph.nodes[0].data.name

    useRecipeStore.getState().applyMolarityCount({
      [`${rootName}.envelope.surface.proteins.Hemagglutinin`]: { molarity: 42, count: 7 },
    })

    const ha = useRecipeStore.getState().graph!.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    expect(ha.data.molarity).toBe(42)
    expect(ha.data.count).toBe(7)
  })

  it('is a no-op when no recipe is loaded', () => {
    useRecipeStore.getState().applyColorPalette({ foo: { x: 1, y: 2, z: 3 } })
    expect(useRecipeStore.getState().graph).toBeNull()
  })
})

describe('recipeStore.loadFromJson: remaining Load > From Examples files', () => {
  // These 5 aren't Phase 2 fixtures and weren't in the manual browser walkthrough
  // (only HIV_serialized.json / InfluenzaA.json were checked live). Loading them
  // through loadFromJson exercises the same validate->detect->parse path loadFromUrl
  // uses for the "From Examples" menu, so this is a faithful proxy without needing
  // the legacy proxy server running.
  const examples = [
    'HIV_immature.json',
    'BloodPlasmaHIV_serialized.json',
    'HIV_immature_blood.json',
    'InfluenzaFull.json',
    'exosome_catalase.json',
  ]

  it.each(examples)('parses %s with no error and at least one ingredient', (name) => {
    useRecipeStore.getState().loadFromJson(loadFixture(name))
    const { graph, error } = useRecipeStore.getState()
    expect(error).toBeNull()
    expect(graph?.nodes.filter((n) => n.data.nodetype === 'ingredient').length).toBeGreaterThan(0)
  })
})

describe('recipeStore.loadFromUrl', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('fetches, validates, and parses JSON from a URL', async () => {
    const fixture = loadFixture('InfluenzaA.json')
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixture,
    }) as unknown as typeof fetch

    await useRecipeStore.getState().loadFromUrl('data/InfluenzaA.json')

    const { graph, format, error, loading } = useRecipeStore.getState()
    expect(error).toBeNull()
    expect(loading).toBe(false)
    expect(format).toBe('classic')
    expect(graph?.nodes.filter((n) => n.data.nodetype === 'ingredient')).toHaveLength(3)
  })

  it('sets an error when the fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }) as unknown as typeof fetch

    await useRecipeStore.getState().loadFromUrl('data/missing.json')

    const { error, loading } = useRecipeStore.getState()
    expect(loading).toBe(false)
    expect(error).toContain('404')
  })
})

describe('recipeStore.updateIngredient / deleteIngredient', () => {
  it('updates name/count/molarity on the target node only, leaving siblings untouched', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const na = graph.nodes.find((n) => n.data.name === 'Neuraminidase')!
    const naCountBefore = na.data.count

    useRecipeStore.getState().updateIngredient(ha, { name: 'HA-renamed', count: 99, molarity: 0.5 })

    const after = useRecipeStore.getState().graph!
    expect(after).not.toBe(graph) // new reference so subscribers re-render
    expect(ha.data.name).toBe('HA-renamed')
    expect(ha.data.count).toBe(99)
    expect(ha.data.molarity).toBe(0.5)
    expect(na.data.count).toBe(naCountBefore)
  })

  it('removes the node from graph.nodes, its parent.children, and any links referencing it', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const before = useRecipeStore.getState().graph!
    const ha = before.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const parent = ha.parent!
    const countBefore = before.nodes.length

    useRecipeStore.getState().deleteIngredient(ha)

    const after = useRecipeStore.getState().graph!
    expect(after.nodes).toHaveLength(countBefore - 1)
    expect(after.nodes).not.toContain(ha)
    expect(parent.children).not.toContain(ha)
    expect(after.links.some((l) => l.source === ha || l.target === ha)).toBe(false)
  })

  it('is a no-op when no recipe is loaded', () => {
    useRecipeStore.getState().updateIngredient({ data: { nodetype: 'ingredient' } } as never, { name: 'x' })
    expect(useRecipeStore.getState().graph).toBeNull()
  })
})

describe('recipeStore.selectNode / applyPdbPick', () => {
  it('applyPdbPick writes pdb/uniprot/label onto the selected node only', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const na = graph.nodes.find((n) => n.data.name === 'Neuraminidase')!

    useRecipeStore.getState().selectNode(ha)
    useRecipeStore.getState().applyPdbPick({ pdb: '6VXX', uniprot: 'P69905', label: 'Spike glycoprotein' })

    expect(ha.data.source.pdb).toBe('6VXX')
    expect(ha.data.uniprot).toBe('P69905')
    expect(ha.data.label).toBe('Spike glycoprotein')
    expect(na.data.source.pdb).not.toBe('6VXX') // sibling untouched
  })

  it('is a no-op when nothing is selected', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    useRecipeStore.getState().applyPdbPick({ pdb: '6VXX' })
    expect(useRecipeStore.getState().graph).toBe(graph) // untouched, no re-render triggered
  })

  it('deleteIngredient clears the selection if the deleted node was selected', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const ha = useRecipeStore.getState().graph!.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    useRecipeStore.getState().selectNode(ha)
    useRecipeStore.getState().deleteIngredient(ha)
    expect(useRecipeStore.getState().selectedNode).toBeNull()
  })
})
