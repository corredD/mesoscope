import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { RecipeTable } from '../src/components/recipe/RecipeTable'
import { useRecipeStore } from '../src/state/recipeStore'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

beforeEach(() => {
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null })
})

describe('RecipeTable', () => {
  it('shows a message instead of a table when no recipe is loaded', () => {
    render(<RecipeTable />)
    expect(screen.getByText(/Nothing to show in the table yet/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders one row per ingredient, matching the loaded recipe', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    render(<RecipeTable />)
    expect(screen.getByDisplayValue('Hemagglutinin')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Neuraminidase')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(1 + 3) // header + 3 ingredients
  })

  it('committing an edited name field updates the store, not just the input', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    render(<RecipeTable />)

    const input = screen.getByDisplayValue('Hemagglutinin')
    fireEvent.change(input, { target: { value: 'HA-renamed' } })
    fireEvent.blur(input)

    const graph = useRecipeStore.getState().graph!
    expect(graph.nodes.some((n) => n.data.name === 'HA-renamed')).toBe(true)
    expect(graph.nodes.some((n) => n.data.name === 'Hemagglutinin')).toBe(false)
  })

  it('clicking Delete on a row removes that ingredient from the store', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    render(<RecipeTable />)

    const row = screen.getByDisplayValue('Hemagglutinin').closest('tr')!
    fireEvent.click(row.querySelector('button')!)

    const graph = useRecipeStore.getState().graph!
    expect(graph.nodes.some((n) => n.data.name === 'Hemagglutinin')).toBe(false)
    expect(screen.queryByDisplayValue('Hemagglutinin')).not.toBeInTheDocument()
  })
})
