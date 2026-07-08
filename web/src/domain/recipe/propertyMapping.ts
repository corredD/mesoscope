/**
 * Numeric-range stats per ingredient property — the modern equivalent of legacy's
 * `property_mapping` scan (js/main.js:2200-2294), built once from the loaded graph rather than
 * accumulated as a global while parsing. Used today by `computeRecipeLayout.ts` to normalize
 * the "group by" cluster-attraction force; kept as a standalone pure function (not folded into
 * `computeRecipeLayout.ts`) because it's reusable later for color-by-property/size-by-property,
 * both still-deferred legacy features (`ChangeCanvasColor`/`mapRadiusToProperty`) that would
 * need the same stats.
 *
 * Only numeric-valued properties are included — legacy's scan also tracked categorical values
 * for its color/cluster palette assignment, but every current consumer of this function only
 * needs a numeric range, so categorical support is left for whichever of those two deferred
 * features actually needs it.
 */
import { isIngredientNode, type IngredientData, type RecipeNode } from './types'

export interface PropertyStats {
  min: number
  max: number
}

export function computePropertyMapping(nodes: RecipeNode[]): Record<string, PropertyStats> {
  const stats: Record<string, PropertyStats> = {}
  for (const node of nodes) {
    if (!isIngredientNode(node)) continue
    const data = node.data as IngredientData
    for (const key of Object.keys(data)) {
      const value = data[key]
      if (typeof value !== 'number' || Number.isNaN(value)) continue
      const entry = stats[key]
      if (!entry) {
        stats[key] = { min: value, max: value }
      } else {
        if (value < entry.min) entry.min = value
        if (value > entry.max) entry.max = value
      }
    }
  }
  return stats
}

// Per-ingredient identifiers that are always (or near-always) unique — grouping by one of
// these would create one cluster per ingredient, which isn't a useful "group by" option even
// though it's technically a valid scalar field.
const UNGROUPABLE_FIELDS = new Set(['name', 'label', 'comments', 'uniprot'])

/**
 * Ingredient properties worth offering in the "Group by" dropdown (`RecipeCanvasToolbar.tsx`)
 * — unlike `computePropertyMapping`, this includes categorical/string fields (`ingtype`,
 * `buildtype`) as well as numeric ones, since legacy's real "cluster by function" use case
 * (the user's own example) means grouping by a category, not a numeric range. A property only
 * qualifies if it has at least 2 distinct values among the loaded ingredients — grouping by
 * something every ingredient shares the same value for would just produce one cluster.
 */
export function listGroupableProperties(nodes: RecipeNode[]): string[] {
  const valuesByKey = new Map<string, Set<string>>()
  for (const node of nodes) {
    if (!isIngredientNode(node)) continue
    const data = node.data as IngredientData
    for (const key of Object.keys(data)) {
      if (UNGROUPABLE_FIELDS.has(key)) continue
      const value = data[key]
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue
      const values = valuesByKey.get(key) ?? new Set<string>()
      values.add(String(value))
      valuesByKey.set(key, values)
    }
  }
  return [...valuesByKey.entries()].filter(([, values]) => values.size >= 2).map(([key]) => key).sort()
}
