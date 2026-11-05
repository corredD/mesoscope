import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeCanvas } from '../src/components/recipe/RecipeCanvas'
import type { RecipeNode } from '../src/domain/recipe/types'
import { viewId } from '../src/domain/recipe/view/viewState'
import { parseLegacyRecipe, detectRecipeFormat } from '../src/domain/recipe/parseLegacyRecipe'
import { defaultMergeFieldFlags } from '../src/domain/recipe/mergeRecipe'
import { useRecipeStore } from '../src/state/recipeStore'
import { useThemeStore } from '../src/state/themeStore'
import { useUiModeStore } from '../src/state/uiModeStore'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

function loadInfluenza() {
  useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
  return useRecipeStore.getState().graph!
}

const stage = () => document.querySelector<HTMLElement>('.recipe-canvas-stage')!
const layers = () => Array.from(document.querySelectorAll<SVGGElement>('[data-node-id]'))
const layerOf = (node: RecipeNode) => document.querySelector<SVGGElement>(`[data-node-id="${viewId(node)}"]`)!
const byName = (name: string) => useRecipeStore.getState().graph!.nodes.find((n) => n.data.name === name)!

/** A node layer's centre: jsdom's stage rect is 0,0 and the zoom is identity, so world = client coordinates. */
function centre(layer: Element): { x: number; y: number } {
  // Dragology flattens the layer's chain into one transform: the view's translate/scale, then the node's translate.
  const all = [...(layer.getAttribute('transform') ?? '').matchAll(/translate\(\s*([-\d.e+]+)[ ,]+([-\d.e+]+)\s*\)/gi)]
  const m = all[all.length - 1]
  if (!m) throw new Error('layer has no translate')
  return { x: Number(m[1]), y: Number(m[2]) }
}

function click(x: number, y: number, init: PointerEventInit = {}) {
  fireEvent.pointerDown(stage(), { button: 0, clientX: x, clientY: y, pointerId: 1, ...init })
  fireEvent.pointerUp(stage(), { button: 0, clientX: x, clientY: y, pointerId: 1, ...init })
}

const clickNode = (node: RecipeNode, init: PointerEventInit = {}) => {
  const c = centre(layerOf(node))
  click(c.x, c.y, init)
}

beforeEach(() => {
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null, selectedLink: null })
  useUiModeStore.setState({ editMode: false, selectedNodes: [] })
  useThemeStore.setState({ theme: 'light' })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RecipeCanvas', () => {
  it('shows the "No recipe loaded" note and no node layers without a recipe (§1.9)', () => {
    render(<RecipeCanvas />)
    expect(screen.getByText(/No recipe loaded/)).toBeInTheDocument()
    expect(layers()).toHaveLength(0)
  })

  it('draws one layer per non-root node and none for the root (§2.3)', () => {
    const graph = loadInfluenza()
    render(<RecipeCanvas />)
    expect(layers()).toHaveLength(graph.nodes.length - 1)
    expect(document.querySelector(`[data-node-id="${viewId(graph.nodes[0])}"]`)).not.toBeInTheDocument()
  })

  it('draws a compartment as a disk r+5 and two outlines at r+5 and r-5 (§2.4)', () => {
    loadInfluenza()
    render(<RecipeCanvas />)
    const compartment = document.querySelector('[data-kind="compartment"]')!
    const r = Number(compartment.getAttribute('data-r'))
    const circles = Array.from(compartment.querySelectorAll('circle'))
    expect(circles.map((c) => Number(c.getAttribute('r')))).toEqual([r + 5, r + 5, r - 5])
  })

  it("puts Influenza's surface ingredients on the envelope's membrane (§10.4)", () => {
    loadInfluenza()
    render(<RecipeCanvas />)
    const envelope = layerOf(byName('envelope'))
    const e = centre(envelope)
    const radius = Number(envelope.getAttribute('data-r'))
    for (const name of ['Hemagglutinin', 'Neuraminidase', 'M2protein']) {
      const layer = layerOf(byName(name))
      expect(layer.getAttribute('data-surface')).toBe('true')
      const p = centre(layer)
      expect(Math.hypot(p.x - e.x, p.y - e.y)).toBeCloseTo(radius, 0)
    }
  })

  it('selects a clicked ingredient and Ctrl-click appends to the multi-selection (§4.5, row 65)', () => {
    loadInfluenza()
    render(<RecipeCanvas />)
    const ha = byName('Hemagglutinin')
    const na = byName('Neuraminidase')
    clickNode(ha)
    expect(useRecipeStore.getState().selectedNode).toBe(ha)
    expect(useUiModeStore.getState().selectedNodes).toEqual([ha])
    clickNode(na, { ctrlKey: true })
    expect(useUiModeStore.getState().selectedNodes).toEqual([ha, na])
    // The same gesture in Edit Mode (row 65 holds in both modes).
    act(() => useUiModeStore.setState({ editMode: true, selectedNodes: [] }))
    clickNode(ha)
    clickNode(na, { ctrlKey: true })
    expect(useUiModeStore.getState().selectedNodes).toEqual([ha, na])
  })

  it('click inside a compartment selects it in view mode, not in Edit Mode; empty space clears (§4.5, row 64)', () => {
    loadInfluenza()
    render(<RecipeCanvas />)
    const envelope = byName('envelope')
    const c = centre(layerOf(envelope))
    // The envelope's centre is far from its surface-only membrane ingredients.
    click(c.x, c.y)
    expect(useRecipeStore.getState().selectedNode).toBe(envelope)

    act(() => useUiModeStore.setState({ editMode: true }))
    useRecipeStore.getState().selectNode(null)
    click(c.x, c.y)
    expect(useRecipeStore.getState().selectedNode).toBeNull()

    act(() => useUiModeStore.setState({ editMode: false }))
    clickNode(byName('Hemagglutinin'))
    expect(useRecipeStore.getState().selectedNode).not.toBeNull()
    click(1, 1)
    expect(useRecipeStore.getState().selectedNode).toBeNull()
    expect(useUiModeStore.getState().selectedNodes).toEqual([])
  })

  it('opens the context menu on a node and not on empty space (§10.6)', () => {
    loadInfluenza()
    render(<RecipeCanvas />)
    fireEvent.contextMenu(stage(), { clientX: 1, clientY: 1 })
    expect(document.querySelector('.recipe-canvas-context-menu')).not.toBeInTheDocument()
    const c = centre(layerOf(byName('Hemagglutinin')))
    fireEvent.contextMenu(stage(), { clientX: c.x, clientY: c.y })
    const menu = document.querySelector('.recipe-canvas-context-menu')!
    expect(menu).toBeInTheDocument()
    for (const label of ['Color', 'Rename', 'Delete', 'Resize']) expect(menu.textContent).toContain(label)
  })

  it('appending a recipe lays the merged nodes out, as legacy re-packs on merge (main.js:5696-5718, review #5)', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('HIV_serialized.json'))
    render(<RecipeCanvas />)
    const before = new Set(layers().map((l) => l.getAttribute('data-node-id')))
    const fluJson = loadFixture('InfluenzaA.json')
    act(() => useRecipeStore.getState().mergeGraph(parseLegacyRecipe(fluJson, detectRecipeFormat(fluJson)), { fieldFlags: defaultMergeFieldFlags(), createWhenMerge: true }))
    const added = layers().filter((l) => !before.has(l.getAttribute('data-node-id')))
    expect(added.length).toBeGreaterThan(1)
    const spots = new Set(added.map((l) => JSON.stringify(centre(l))))
    expect(spots.size).toBe(added.length) // not stacked at one point
    expect(added.some((l) => l.getAttribute('data-r') === '30')).toBe(false)
  })

  it('a press on a context-menu item does not also click the node under it (review #4)', () => {
    loadInfluenza()
    render(<RecipeCanvas />)
    const ha = byName('Hemagglutinin')
    const c = centre(layerOf(ha))
    fireEvent.contextMenu(stage(), { clientX: c.x, clientY: c.y, button: 2 })
    const rename = Array.from(document.querySelectorAll('.recipe-canvas-context-menu button')).find((b) => b.textContent === 'Rename')!
    fireEvent.pointerDown(rename, { button: 0, clientX: c.x, clientY: c.y, pointerId: 1 })
    fireEvent.pointerUp(rename, { button: 0, clientX: c.x, clientY: c.y, pointerId: 1 })
    expect(useRecipeStore.getState().selectedNode).toBeNull()
    expect(useUiModeStore.getState().selectedNodes).toEqual([])
  })

  it('deleting a compartment from the context menu removes it and its subtree (§10.6)', () => {
    const graph = loadInfluenza()
    render(<RecipeCanvas />)
    const envelope = byName('envelope')
    const subtree = new Set<RecipeNode>()
    const walk = (n: RecipeNode) => {
      subtree.add(n)
      n.children?.forEach(walk)
    }
    walk(envelope)
    expect(subtree.size).toBeGreaterThan(1)
    const before = layers().length
    const c = centre(layerOf(envelope))
    fireEvent.contextMenu(stage(), { clientX: c.x, clientY: c.y })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(layers().length).toBe(before - subtree.size)
    for (const n of subtree) expect(document.querySelector(`[data-node-id="${viewId(n)}"]`)).not.toBeInTheDocument()
    expect(useRecipeStore.getState().graph!.nodes.length).toBe(graph.nodes.length - subtree.size)
  })

  it('keeps every layer where it is when an ingredient is added, and puts the new one at the centre with r 30 (§1.9, §7.1)', () => {
    loadInfluenza()
    render(<RecipeCanvas />)
    const before = new Map(layers().map((l) => [l.getAttribute('data-node-id'), centre(l)]))
    act(() => useRecipeStore.getState().addIngredient())
    const after = layers()
    expect(after).toHaveLength(before.size + 1)
    const added = after.filter((l) => !before.has(l.getAttribute('data-node-id')))
    expect(added).toHaveLength(1)
    expect(centre(added[0])).toEqual({ x: 300, y: 300 })
    expect(added[0].getAttribute('data-r')).toBe('30')
    for (const l of after) {
      const id = l.getAttribute('data-node-id')!
      if (before.has(id)) expect(centre(l)).toEqual(before.get(id))
    }
  })

  it('shows the recipe name as the root label, with `*` after an edit (row 35)', () => {
    const graph = loadInfluenza()
    render(<RecipeCanvas />)
    const label = () => document.querySelector('text[data-root-label]')!.textContent
    expect(label()).toBe(graph.nodes[0].data.name)
    act(() => useRecipeStore.getState().addIngredient())
    expect(label()).toBe(graph.nodes[0].data.name + '*')
  })

  it('fills the background with the dark surface in dark theme and the root colour in light (§10.3)', () => {
    loadInfluenza()
    render(<RecipeCanvas />)
    const background = () => document.querySelector('.recipe-canvas-background')!
    const lightFill = background().getAttribute('fill')
    expect(lightFill).not.toBe('var(--color-recipe-canvas-bg)')
    expect(lightFill).toMatch(/^rgb\(/)
    act(() => useThemeStore.setState({ theme: 'dark' }))
    expect(stage()).toHaveAttribute('data-canvas-theme', 'dark')
    expect(background()).toHaveAttribute('fill', 'var(--color-recipe-canvas-bg)')
    act(() => useThemeStore.setState({ theme: 'light' }))
    expect(background()).toHaveAttribute('fill', lightFill)
  })

  it('mounts and unmounts under StrictMode without throwing', () => {
    const graph = loadInfluenza()
    let view!: ReturnType<typeof render>
    expect(() => {
      view = render(
        <StrictMode>
          <RecipeCanvas />
        </StrictMode>,
      )
    }).not.toThrow()
    expect(layers()).toHaveLength(graph.nodes.length - 1)
    expect(() => view.unmount()).not.toThrow()
  })
})
