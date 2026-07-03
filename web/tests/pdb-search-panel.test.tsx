import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PdbSearchPanel } from '../src/components/pdb/PdbSearchPanel'
import { UniprotSearchPanel } from '../src/components/pdb/UniprotSearchPanel'
import { RecipeTable } from '../src/components/recipe/RecipeTable'
import { useRecipeStore } from '../src/state/recipeStore'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

beforeEach(() => {
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null })
})

describe('PdbSearchPanel', () => {
  const originalFetch = global.fetch
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('Apply is disabled until an ingredient is selected in the Recipe table, then writes the pick back onto it', async () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result_set: [{ identifier: '6VXX', score: 1 }] }),
    }) as unknown as typeof fetch

    render(
      <>
        <RecipeTable />
        <PdbSearchPanel />
      </>,
    )

    fireEvent.change(screen.getByPlaceholderText('protein name…'), { target: { value: 'hemagglutinin' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(screen.getByText('6VXX')).toBeInTheDocument())

    const applyButton = screen.getByRole('button', { name: 'Apply' })
    expect(applyButton).toBeDisabled()

    fireEvent.click(screen.getByDisplayValue('Hemagglutinin').closest('tr')!)
    expect(applyButton).not.toBeDisabled()

    fireEvent.click(applyButton)
    const ha = useRecipeStore.getState().graph!.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    expect(ha.data.source.pdb).toBe('6VXX')
  })

  it('shows the request error instead of a result table when the search fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' }) as unknown as typeof fetch
    render(<PdbSearchPanel />)
    fireEvent.change(screen.getByPlaceholderText('protein name…'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(screen.getByText(/500/)).toBeInTheDocument())
  })
})

describe('UniprotSearchPanel', () => {
  const originalFetch = global.fetch
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('applies accession + protein name onto the selected ingredient', async () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    useRecipeStore.getState().selectNode(useRecipeStore.getState().graph!.nodes.find((n) => n.data.name === 'Hemagglutinin')!)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{
          primaryAccession: 'P69905', uniProtkbId: 'HBA_HUMAN',
          proteinDescription: { recommendedName: { fullName: { value: 'Hemoglobin subunit alpha' } } },
          organism: { scientificName: 'Homo sapiens' }, sequence: { length: 141 },
        }],
      }),
    }) as unknown as typeof fetch

    render(<UniprotSearchPanel />)
    fireEvent.change(screen.getByPlaceholderText('protein name…'), { target: { value: 'hemoglobin' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(screen.getByText('P69905')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    const ha = useRecipeStore.getState().graph!.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    expect(ha.data.uniprot).toBe('P69905')
    expect(ha.data.label).toBe('Hemoglobin subunit alpha')
  })
})
