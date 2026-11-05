// The multi-selection (legacy `nodes_selections`) never outlives its nodes, and Add interaction pairs it (row 79).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeCanvas } from '../src/components/recipe/RecipeCanvas'
import { RecipeCanvasToolbar } from '../src/components/recipe/RecipeCanvasToolbar'
import { useRecipeStore } from '../src/state/recipeStore'
import { useUiModeStore } from '../src/state/uiModeStore'

beforeEach(() => {
  useRecipeStore.getState().loadFromJson(JSON.parse(readFileSync(resolve(__dirname, '../../data/InfluenzaA.json'), 'utf-8')))
  useUiModeStore.setState({ editMode: true, selectedNodes: [] })
  // No drawing here: the canvas only has to keep its selection in step with the recipe.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const ingredients = () => useRecipeStore.getState().graph!.nodes.filter((n) => !n.children)

function expectNoDanglingLinks() {
  const { nodes, links } = useRecipeStore.getState().graph!
  for (const link of links) {
    expect(nodes).toContain(link.source)
    expect(nodes).toContain(link.target)
  }
}

describe('Add interaction (row 79)', () => {
  it('links the multi-selection two at a time and clears it', () => {
    const [a, b, c] = ingredients()
    useUiModeStore.getState().setSelection([a, b, c])
    render(<RecipeCanvasToolbar />)
    fireEvent.click(screen.getByRole('button', { name: 'Add interaction' }))
    const { links } = useRecipeStore.getState().graph!
    expect(links).toHaveLength(1)
    expect([links[0].source, links[0].target]).toEqual([a, b])
    expect(useUiModeStore.getState().selectedNodes).toEqual([])
  })

  it('is disabled with fewer than two nodes selected', () => {
    useUiModeStore.getState().setSelection([ingredients()[0]])
    render(<RecipeCanvasToolbar />)
    expect(screen.getByRole('button', { name: 'Add interaction' })).toBeDisabled()
  })

  it('after deleting a selected node writes no link to it (toolbar alone)', () => {
    const [a, b] = ingredients()
    useUiModeStore.getState().setSelection([a, b])
    useRecipeStore.getState().deleteIngredient(b)
    render(<RecipeCanvasToolbar />)
    fireEvent.click(screen.getByRole('button', { name: 'Add interaction' }))
    expectNoDanglingLinks()
  })
})

describe('the multi-selection and the recipe (with the canvas mounted)', () => {
  it('drops a deleted node at once', () => {
    render(<RecipeCanvas />)
    const [a, b] = ingredients()
    act(() => useUiModeStore.getState().setSelection([a, b]))
    act(() => useRecipeStore.getState().deleteIngredient(b))
    expect(useUiModeStore.getState().selectedNodes).toEqual([a])
  })

  it('drops the nodes of a deleted compartment, and of a recipe that was replaced', () => {
    render(<RecipeCanvas />)
    const nodes = useRecipeStore.getState().graph!.nodes
    const envelope = nodes.find((n) => n.data.name === 'envelope')!
    act(() => useUiModeStore.getState().setSelection([envelope, ...envelope.children!]))
    act(() => useRecipeStore.getState().deleteCompartment(envelope))
    expect(useUiModeStore.getState().selectedNodes).toEqual([])

    const [x] = ingredients()
    act(() => useUiModeStore.getState().setSelection([nodes[0], x]))
    act(() => useRecipeStore.getState().loadFromJson(JSON.parse(readFileSync(resolve(__dirname, '../../data/HIV_serialized.json'), 'utf-8'))))
    expect(useUiModeStore.getState().selectedNodes).toEqual([])
  })

  it('Add interaction after deleting a selected node links nothing dangling', () => {
    render(
      <>
        <RecipeCanvas />
        <RecipeCanvasToolbar />
      </>,
    )
    const [a, b, c] = ingredients()
    act(() => useUiModeStore.getState().setSelection([a, b, c]))
    act(() => useRecipeStore.getState().deleteIngredient(b))
    expect(useUiModeStore.getState().selectedNodes).toEqual([a, c])
    fireEvent.click(screen.getByRole('button', { name: 'Add interaction' }))
    const { links } = useRecipeStore.getState().graph!
    expect(links).toHaveLength(1)
    expect([links[0].source, links[0].target]).toEqual([a, c])
    expectNoDanglingLinks()
  })
})

describe('Node group by (recipe-view.md §6.5, Ludovic 2026-11-05)', () => {
  it('lists the ingredient fields with two or more values, and choosing one sets the grouping', () => {
    render(<RecipeCanvasToolbar />)
    const select = screen.getByLabelText('Node group by') as HTMLSelectElement
    const options = [...select.options].map((o) => o.value)
    expect(options[0]).toBe('none')
    expect(options).toContain('ingtype')
    expect(options).not.toContain('name')
    fireEvent.change(select, { target: { value: 'ingtype' } })
    expect(useUiModeStore.getState().groupBy).toBe('ingtype')
  })
})
