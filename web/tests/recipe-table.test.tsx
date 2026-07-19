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

  it('edits the PDB while preserving the rest of the ingredient source', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    render(<RecipeTable />)

    const input = screen.getByRole('textbox', { name: 'Hemagglutinin PDB' })
    const before = useRecipeStore.getState().graph!.nodes.find((node) => node.data.name === 'Hemagglutinin')!.data
    const sourceBefore = { ...('source' in before ? before.source : {}) }
    fireEvent.change(input, { target: { value: ' 4abc ' } })
    fireEvent.blur(input)

    const ingredient = useRecipeStore.getState().graph!.nodes.find((node) => node.data.name === 'Hemagglutinin')!.data
    expect('source' in ingredient && ingredient.source.pdb).toBe('4abc')
    expect('source' in ingredient && ingredient.source).toEqual({ ...sourceBefore, pdb: '4abc' })
  })

  it('restricts ingredient type editing to protein, fiber, or ligand', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    render(<RecipeTable />)

    const type = screen.getByRole('combobox', { name: 'Hemagglutinin ingredient type' })
    expect([...type.querySelectorAll('option')].map((option) => option.value)).toEqual(['protein', 'fiber', 'ligand'])
    fireEvent.change(type, { target: { value: 'fiber' } })

    const ingredient = useRecipeStore.getState().graph!.nodes.find((node) => node.data.name === 'Hemagglutinin')!.data
    expect('ingtype' in ingredient && ingredient.ingtype).toBe('fiber')
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
