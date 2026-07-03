import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { RecipeLoader, type RecipeLoaderHandle } from '../src/components/recipe/RecipeLoader'
import { useRecipeStore } from '../src/state/recipeStore'

beforeEach(() => {
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null })
})

function csvFile(text: string, name = 'ingredients.csv') {
  return new File([text], name, { type: 'text/csv' })
}

describe('RecipeLoader: CSV import opens the column mapping dialog', () => {
  it('shows a mapping dialog pre-guessed from the header row, then loads on confirm', async () => {
    const ref = createRef<RecipeLoaderHandle>()
    render(<RecipeLoader ref={ref} />)

    const csv = 'Protein Name,PDB Source,Copy Number\nSpike,6VXX,3\nMatrix,,10\n'
    const input = screen.getByLabelText('Load recipe from file')
    fireEvent.change(input, { target: { files: [csvFile(csv)] } })

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('Column Mapping'))
    // guessAllColumns should have pre-selected "Protein Name" for the name field.
    expect(screen.getByText('protein name').parentElement).toHaveTextContent('Protein Name')

    fireEvent.click(screen.getByRole('button', { name: 'Load' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const graph = useRecipeStore.getState().graph!
    expect(graph.nodes.some((n) => n.data.name === 'Spike')).toBe(true)
    expect(graph.nodes.some((n) => n.data.name === 'Matrix')).toBe(true)
  })

  it('Cancel discards the pending import without touching the store', async () => {
    const ref = createRef<RecipeLoaderHandle>()
    render(<RecipeLoader ref={ref} />)

    const input = screen.getByLabelText('Load recipe from file')
    fireEvent.change(input, { target: { files: [csvFile('name,count\nA,1\n')] } })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useRecipeStore.getState().graph).toBeNull()
  })
})
