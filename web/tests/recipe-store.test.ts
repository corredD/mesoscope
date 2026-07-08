import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecipeStore } from '../src/state/recipeStore'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

beforeEach(() => {
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null, selectedLink: null })
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

describe('recipeStore.reparentNode', () => {
  it('moves the node into the new parent, updating both sides\' children arrays', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const oldParent = ha.parent!
    const root = graph.nodes[0]
    expect(oldParent).not.toBe(root)

    useRecipeStore.getState().reparentNode(ha, root)

    expect(ha.parent).toBe(root)
    expect(oldParent.children).not.toContain(ha)
    expect(root.children).toContain(ha)
    expect(useRecipeStore.getState().graph).not.toBe(graph)
  })

  it('is a no-op if newParent is already the node\'s parent', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    useRecipeStore.getState().reparentNode(ha, ha.parent!)
    expect(useRecipeStore.getState().graph).toBe(graph)
  })

  it('is a no-op if newParent is one of the node\'s own descendants', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const root = graph.nodes[0]
    const envelope = root.children!.find((n) => n.data.name === 'envelope')!
    useRecipeStore.getState().reparentNode(root, envelope)
    expect(useRecipeStore.getState().graph).toBe(graph)
    expect(root.parent).toBeNull()
  })
})

describe('recipeStore.addLink / deleteLink / updateLink / setLinkEndpoint', () => {
  it('addLink creates a link between the two nodes with blank editable fields', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const na = graph.nodes.find((n) => n.data.name === 'Neuraminidase')!

    useRecipeStore.getState().addLink(ha, na)

    const after = useRecipeStore.getState().graph!
    expect(after.links).toHaveLength(1)
    const link = after.links[0]
    expect(link.source).toBe(ha)
    expect(link.target).toBe(na)
    expect(link.name1).toBe('Hemagglutinin')
    expect(link.name2).toBe('Neuraminidase')
  })

  it('addLink is a no-op when source === target', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    useRecipeStore.getState().addLink(ha, ha)
    expect(useRecipeStore.getState().graph!.links).toHaveLength(0)
  })

  it('updateLink patches only the given link\'s editable fields', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const na = graph.nodes.find((n) => n.data.name === 'Neuraminidase')!
    useRecipeStore.getState().addLink(ha, na)
    const link = useRecipeStore.getState().graph!.links[0]

    useRecipeStore.getState().updateLink(link, { pdb1: '1RVT', sel1: ':A' })

    expect(link.pdb1).toBe('1RVT')
    expect(link.sel1).toBe(':A')
  })

  it('setLinkEndpoint reassigns one endpoint to a different node', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const na = graph.nodes.find((n) => n.data.name === 'Neuraminidase')!
    const root = graph.nodes[0]
    useRecipeStore.getState().addLink(ha, na)
    const link = useRecipeStore.getState().graph!.links[0]

    useRecipeStore.getState().setLinkEndpoint(link, 'target', root)

    expect(link.target).toBe(root)
    expect(link.source).toBe(ha)
  })

  it('deleteLink removes the link and clears selection if it was selected', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const na = graph.nodes.find((n) => n.data.name === 'Neuraminidase')!
    useRecipeStore.getState().addLink(ha, na)
    const link = useRecipeStore.getState().graph!.links[0]
    useRecipeStore.getState().selectLink(link)

    useRecipeStore.getState().deleteLink(link)

    expect(useRecipeStore.getState().graph!.links).toHaveLength(0)
    expect(useRecipeStore.getState().selectedLink).toBeNull()
  })
})

describe('recipeStore.addIngredient / addCompartment', () => {
  it('addIngredient pushes one new blank ingredient into root, appearing in graph.nodes and root.children', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const before = useRecipeStore.getState().graph!
    const root = before.nodes[0]
    const countBefore = before.nodes.length
    const rootChildCountBefore = root.children!.length

    useRecipeStore.getState().addIngredient()

    const after = useRecipeStore.getState().graph!
    expect(after.nodes).toHaveLength(countBefore + 1)
    const added = after.nodes[after.nodes.length - 1]
    expect(added.data.nodetype).toBe('ingredient')
    expect(added.parent).toBe(root)
    expect(root.children).toHaveLength(rootChildCountBefore + 1)
    expect(root.children).toContain(added)
  })

  it('addCompartment pushes one new blank compartment into root', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const before = useRecipeStore.getState().graph!
    const root = before.nodes[0]

    useRecipeStore.getState().addCompartment()

    const after = useRecipeStore.getState().graph!
    const added = after.nodes[after.nodes.length - 1]
    expect(added.data.nodetype).toBe('compartment')
    expect(added.parent).toBe(root)
    expect(root.children).toContain(added)
  })

  it('is a no-op when no recipe is loaded', () => {
    useRecipeStore.getState().addIngredient()
    expect(useRecipeStore.getState().graph).toBeNull()
  })
})

describe('recipeStore.renameNode', () => {
  it('renames an ingredient in place', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!

    useRecipeStore.getState().renameNode(ha, 'HA-renamed')

    expect(ha.data.name).toBe('HA-renamed')
    expect(useRecipeStore.getState().graph).not.toBe(graph)
  })

  it('renames a compartment, and descendant compartment-path lookups (derived live) reflect it immediately', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const envelope = graph.nodes.find((n) => n.data.name === 'envelope')!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!

    useRecipeStore.getState().renameNode(envelope, 'envelope-renamed')

    expect(envelope.data.name).toBe('envelope-renamed')
    // no separate cached path to update — buildAncestorCompartmentPath derives live from .parent
    expect(ha.parent!.data.name).toBe('envelope-renamed')
  })

  it('is a no-op when no recipe is loaded', () => {
    const node = { data: { nodetype: 'compartment' as const, name: 'x', geom: '', geom_type: '', thickness: 0, color: null }, parent: null, children: [] }
    useRecipeStore.getState().renameNode(node, 'y')
    expect(useRecipeStore.getState().graph).toBeNull()
  })
})

describe('recipeStore.deleteCompartment', () => {
  it('cascade-deletes the compartment and every descendant, unlike legacy which orphans them', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const root = graph.nodes[0]
    const envelope = graph.nodes.find((n) => n.data.name === 'envelope')!
    const descendantNames = graph.nodes.filter((n) => n.parent && (n.parent === envelope || n.parent.parent === envelope)).map((n) => n.data.name)
    expect(descendantNames.length).toBeGreaterThan(0)

    useRecipeStore.getState().deleteCompartment(envelope)

    const after = useRecipeStore.getState().graph!
    expect(after.nodes).not.toContain(envelope)
    expect(root.children).not.toContain(envelope)
    for (const name of descendantNames) {
      expect(after.nodes.some((n) => n.data.name === name)).toBe(false)
    }
  })

  it('removes links referencing any deleted descendant', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const na = graph.nodes.find((n) => n.data.name === 'Neuraminidase')!
    useRecipeStore.getState().addLink(ha, na)
    expect(useRecipeStore.getState().graph!.links).toHaveLength(1)

    useRecipeStore.getState().deleteCompartment(ha.parent!)

    expect(useRecipeStore.getState().graph!.links).toHaveLength(0)
  })

  it('is a no-op on the root compartment (no parent to detach from)', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const root = graph.nodes[0]

    useRecipeStore.getState().deleteCompartment(root)

    expect(useRecipeStore.getState().graph).toBe(graph)
  })

  it('clears selectedNode/selectedLink if either was inside the deleted subtree', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const envelope = graph.nodes.find((n) => n.data.name === 'envelope')!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    useRecipeStore.setState({ selectedNode: ha })

    useRecipeStore.getState().deleteCompartment(envelope)

    expect(useRecipeStore.getState().selectedNode).toBeNull()
  })
})

describe('recipeStore.setNodeColor', () => {
  it('writes a normalized [0,1] rgb triplet directly to data.color, unlike applyColorModeToIngredient it never backs up to _color', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!

    useRecipeStore.getState().setNodeColor(ha, '#ff0080')

    expect(ha.data.color).toEqual([1, 0, 128 / 255])
    expect(ha.data._color).toBeUndefined()
  })

  it('also works on a compartment node', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const envelope = graph.nodes.find((n) => n.data.name === 'envelope')!

    useRecipeStore.getState().setNodeColor(envelope, '#00ff00')

    expect(envelope.data.color).toEqual([0, 1, 0])
  })

  it('is a no-op for an unparseable color', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const before = ha.data.color

    useRecipeStore.getState().setNodeColor(ha, 'not-a-color')

    expect(ha.data.color).toBe(before)
  })

  it('is a no-op when no recipe is loaded', () => {
    const node = { data: { nodetype: 'compartment' as const, name: 'x', geom: '', geom_type: '', thickness: 0, color: null }, parent: null, children: [] }
    useRecipeStore.getState().setNodeColor(node, '#ffffff')
    expect(useRecipeStore.getState().graph).toBeNull()
  })
})

describe('recipeStore.applyColorModeToIngredient', () => {
  it('bakes the resolved color into data.color, normalized to [0,1]', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!

    useRecipeStore.getState().applyColorModeToIngredient(() => 'rgb(255, 0, 128)')

    expect(ha.data.color).toEqual([1, 0, 128 / 255])
  })

  it('backs up the previous color into _color only the first time', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const originalColor = ha.data.color

    useRecipeStore.getState().applyColorModeToIngredient(() => 'red')
    expect(ha.data._color).toEqual(originalColor)

    useRecipeStore.getState().applyColorModeToIngredient(() => 'blue')
    expect(ha.data._color).toEqual(originalColor) // still the ORIGINAL, not overwritten by 'red'
    expect(ha.data.color).toEqual([0, 0, 1])
  })

  it('skips compartment nodes and nodes an unparseable color resolver returns', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const root = graph.nodes[0]
    const rootColorBefore = root.data.color

    useRecipeStore.getState().applyColorModeToIngredient(() => 'not-a-real-color')

    expect(root.data.color).toBe(rootColorBefore)
  })

  it('is a no-op when no recipe is loaded', () => {
    useRecipeStore.getState().applyColorModeToIngredient(() => 'red')
    expect(useRecipeStore.getState().graph).toBeNull()
  })
})
