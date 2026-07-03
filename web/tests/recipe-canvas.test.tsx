import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { RecipeCanvas } from '../src/components/recipe/RecipeCanvas'
import { isIngredientNode } from '../src/domain/recipe/types'
import { useRecipeStore } from '../src/state/recipeStore'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

beforeEach(() => {
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null })
})

describe('RecipeCanvas', () => {
  it('shows a message instead of the canvas when no recipe is loaded', () => {
    render(<RecipeCanvas />)
    expect(screen.getByText(/No recipe loaded/)).toBeInTheDocument()
    expect(document.querySelector('svg.recipe-canvas')).not.toBeInTheDocument()
  })

  it('renders one circle per node, matching the loaded recipe (root + compartments + ingredients)', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    render(<RecipeCanvas />)

    const graph = useRecipeStore.getState().graph!
    const circles = document.querySelectorAll('svg.recipe-canvas circle')
    expect(circles).toHaveLength(graph.nodes.length)
  })

  it('clicking an ingredient circle selects that node in recipeStore', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    render(<RecipeCanvas />)

    const graph = useRecipeStore.getState().graph!
    const ingredient = graph.nodes.find((n) => isIngredientNode(n) && n.data.name === 'Hemagglutinin')!
    const circles = Array.from(document.querySelectorAll('svg.recipe-canvas circle'))
    const target = circles.find((c) => c.querySelector('title')?.textContent === 'Hemagglutinin')!

    fireEvent.click(target)
    expect(useRecipeStore.getState().selectedNode).toBe(ingredient)
  })

  it('clicking the background clears the current selection', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    useRecipeStore.getState().selectNode(graph.nodes[1])
    render(<RecipeCanvas />)

    fireEvent.click(document.querySelector('svg.recipe-canvas')!)
    expect(useRecipeStore.getState().selectedNode).toBeNull()
  })
})
