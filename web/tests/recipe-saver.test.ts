import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecipeSaver } from '../src/components/recipe/RecipeSaver'
import { useRecipeStore } from '../src/state/recipeStore'
import * as saveFile from '../src/domain/files/saveFile'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

function renderSaver() {
  return renderHook(() => useRecipeSaver()).result
}

beforeEach(() => {
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null })
  vi.restoreAllMocks()
})

describe('useRecipeSaver: no recipe loaded', () => {
  it('sets an error instead of attempting to save', () => {
    const downloadJson = vi.spyOn(saveFile, 'downloadJson')
    renderSaver().current.saveClassic()
    expect(downloadJson).not.toHaveBeenCalled()
    expect(useRecipeStore.getState().error).toContain('No recipe is loaded')
  })
})

describe('useRecipeSaver: with a loaded recipe', () => {
  beforeEach(() => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
  })

  it('saveClassic downloads the classic JSON with the recipe name as filename', () => {
    const downloadJson = vi.spyOn(saveFile, 'downloadJson').mockImplementation(() => {})
    renderSaver().current.saveClassic()
    expect(downloadJson).toHaveBeenCalledTimes(1)
    const [json, filename] = downloadJson.mock.calls[0]
    expect(filename).toBe('InfluenzaA.json')
    expect((json as { recipe: { name: string } }).recipe.name).toBe('InfluenzaA')
  })

  it('saveSerialized downloads the serialized JSON with a _serialized suffix', () => {
    const downloadJson = vi.spyOn(saveFile, 'downloadJson').mockImplementation(() => {})
    renderSaver().current.saveSerialized()
    const [json, filename] = downloadJson.mock.calls[0]
    expect(filename).toBe('InfluenzaA_serialized.json')
    expect((json as { name: string }).name).toBe('InfluenzaA')
  })

  it('saveCsv downloads CSV text with one row per ingredient', () => {
    const downloadText = vi.spyOn(saveFile, 'downloadText').mockImplementation(() => {})
    renderSaver().current.saveCsv()
    const [content, filename, mimeType] = downloadText.mock.calls[0]
    expect(filename).toBe('InfluenzaA.csv')
    expect(mimeType).toContain('text/csv')
    expect(content.trim().split('\n')).toHaveLength(4) // header + 3 ingredients
  })

  it('saveColorPalette downloads a palette keyed by ingredient name path', () => {
    const downloadJson = vi.spyOn(saveFile, 'downloadJson').mockImplementation(() => {})
    renderSaver().current.saveColorPalette()
    const [palette] = downloadJson.mock.calls[0]
    expect(palette).toHaveProperty('InfluenzaA.envelope.surface.proteins.Hemagglutinin')
  })

  it('saveMolarity downloads molarity/count keyed the same way', () => {
    const downloadJson = vi.spyOn(saveFile, 'downloadJson').mockImplementation(() => {})
    renderSaver().current.saveMolarity()
    const [data] = downloadJson.mock.calls[0]
    expect(data).toHaveProperty('InfluenzaA.envelope.surface.proteins.Hemagglutinin')
  })
})
