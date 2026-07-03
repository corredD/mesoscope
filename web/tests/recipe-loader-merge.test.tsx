import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeLoader, type RecipeLoaderHandle } from '../src/components/recipe/RecipeLoader'
import { useRecipeStore } from '../src/state/recipeStore'
import { isIngredientNode } from '../src/domain/recipe/types'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

beforeEach(() => {
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null })
})

describe('RecipeLoader.mergeFromUrl: Load > Append From > Examples', () => {
  const originalFetch = global.fetch
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('fetches the incoming recipe, opens MergeDialog, and merges into the current graph on confirm', async () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const before = useRecipeStore.getState().graph!.nodes.filter(isIngredientNode).length

    const mpn = loadFixture('Mpn_1.0_2.json')
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mpn }) as unknown as typeof fetch

    const ref = createRef<RecipeLoaderHandle>()
    render(<RecipeLoader ref={ref} />)
    await ref.current!.mergeFromUrl('data/Mpn_1.0_2.json')

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('Column Merging'))
    fireEvent.click(screen.getByRole('button', { name: 'Merge' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const after = useRecipeStore.getState().graph!.nodes.filter(isIngredientNode).length
    expect(after).toBeGreaterThan(before) // Mpn's 180 ingredients got merged in on top of Influenza's 3
    expect(useRecipeStore.getState().error).toBeNull()
  })

  it('sets an error instead of opening a dialog when the fetch fails', async () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }) as unknown as typeof fetch

    const ref = createRef<RecipeLoaderHandle>()
    render(<RecipeLoader ref={ref} />)
    await ref.current!.mergeFromUrl('data/missing.json')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useRecipeStore.getState().error).toContain('404')
  })
})

describe('RecipeLoader.pickMergeFile: Load > Append From > File', () => {
  it('rejects .csv/.xlsx/.zip with an explanatory error, matching the plain-load deferral', () => {
    render(<RecipeLoader ref={createRef<RecipeLoaderHandle>()} />)
    const input = screen.getByLabelText('Merge recipe from file')
    fireEvent.change(input, { target: { files: [new File(['a,b'], 'x.csv', { type: 'text/csv' })] } })
    expect(useRecipeStore.getState().error).toContain('.csv/.xlsx/.zip')
  })
})
