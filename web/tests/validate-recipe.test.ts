import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateRecipeJson } from '../src/domain/recipe/validateRecipe'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

describe('validateRecipeJson', () => {
  it('accepts the real serialized and classic fixtures', () => {
    expect(validateRecipeJson(loadFixture('HIV_serialized.json'))).toMatchObject({ ok: true, format: 'serialized' })
    expect(validateRecipeJson(loadFixture('InfluenzaA.json'))).toMatchObject({ ok: true, format: 'classic' })
  })

  it('rejects non-object JSON', () => {
    expect(validateRecipeJson([1, 2, 3]).ok).toBe(false)
    expect(validateRecipeJson('not a recipe').ok).toBe(false)
  })

  it('rejects a classic-shaped object missing recipe.name', () => {
    const result = validateRecipeJson({ cytoplasme: { ingredients: {} } })
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('recipe.name'))).toBe(true)
  })

  it('rejects a serialized-shaped object missing IngredientGroups', () => {
    const result = validateRecipeJson({ name: 'x', Compartments: [] })
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('IngredientGroups'))).toBe(true)
  })
})
