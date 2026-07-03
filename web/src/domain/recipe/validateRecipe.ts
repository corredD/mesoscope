/**
 * Lightweight structural validation for recipe JSON before parsing, matching
 * the shape checks SKILLS.md asks an LLM-authored recipe to satisfy
 * (valid JSON object; serialized recipes look like an sCompartment tree;
 * classic recipes carry recipe/cytoplasme/compartments).
 */
import { detectRecipeFormat, type RecipeFormat } from './parseLegacyRecipe'

export interface RecipeValidationResult {
  ok: boolean
  format: RecipeFormat
  errors: string[]
}

export function validateRecipeJson(json: unknown): RecipeValidationResult {
  const errors: string[] = []
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { ok: false, format: 'classic', errors: ['Recipe JSON must be an object.'] }
  }

  const format = detectRecipeFormat(json)
  const obj = json as Record<string, unknown>

  if (format === 'serialized') {
    if (typeof obj.name !== 'string') errors.push('Serialized recipe is missing a "name" string.')
    if (!Array.isArray(obj.Compartments)) errors.push('Serialized recipe is missing a "Compartments" array.')
    if (!Array.isArray(obj.IngredientGroups)) errors.push('Serialized recipe is missing an "IngredientGroups" array.')
  } else {
    if (!obj.recipe || typeof (obj.recipe as Record<string, unknown>).name !== 'string') {
      errors.push('Classic recipe is missing "recipe.name".')
    }
    if (obj.cytoplasme === undefined && obj.compartments === undefined) {
      errors.push('Classic recipe has neither "cytoplasme" nor "compartments".')
    }
  }

  return { ok: errors.length === 0, format, errors }
}
