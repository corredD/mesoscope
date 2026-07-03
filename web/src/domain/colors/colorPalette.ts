/**
 * Port of js/cp_serialized.js: cp_SerializedColorSchem / cp_DeserializedColorSchem
 * (Save/Load > Color palette, "Ingredient-Colors").
 *
 * Not ported: the legacy import path also updates `property_mapping[colorby].colors`
 * when the canvas is colored by a non-default property and a `unique_array` is active
 * (js/cp_serialized.js:1600-1603). That reaches into live canvas/UI state
 * (`canvas_color`, `unique_array`) that belongs to the wrapped RecipeCanvas, not this
 * domain layer — the palette-file round trip (color in, color out) is preserved here;
 * re-deriving the canvas color-by-property mapping from it is a Phase 4 UI concern.
 */
import {
  buildCompartmentNamePath,
  buildIngredientNamePath,
  isCompartmentNode,
  isIngredientNode,
  type IngredientData,
  type RecipeGraph,
} from '../recipe/types'

export interface PaletteColor {
  x: number
  y: number
  z: number
}

export type ColorPalette = Record<string, PaletteColor>

function toPaletteColor(color: number[]): PaletteColor {
  return {
    x: Math.trunc(color[0] * 255.0),
    y: Math.trunc(color[1] * 255.0),
    z: Math.trunc(color[2] * 255.0),
  }
}

/** Port of cp_SerializedColorSchem. Mutates nodes that had no color yet (matches legacy). */
export function exportColorPalette(graph: RecipeGraph): ColorPalette {
  const palette: ColorPalette = {}
  for (const node of graph.nodes) {
    if (isIngredientNode(node)) {
      if (!node.data.color) node.data.color = [1, 0, 0]
      palette[buildIngredientNamePath(node)] = toPaletteColor(node.data.color)
    } else if (isCompartmentNode(node)) {
      if (!node.data.color) node.data.color = [1, 0, 0]
      const path = buildCompartmentNamePath(node)
      const color = toPaletteColor(node.data.color)
      palette[`${path}.membrane.outer_membrane`] = color
      palette[`${path}.membrane.inner_membrane`] = color
    }
  }
  return palette
}

/** Port of cp_DeserializedColorSchem. Mutates matching ingredient/compartment colors in place. */
export function importColorPalette(graph: RecipeGraph, palette: ColorPalette): void {
  for (const node of graph.nodes) {
    if (isIngredientNode(node)) {
      const entry = palette[buildIngredientNamePath(node)]
      if (entry) (node.data as IngredientData).color = [entry.x / 255.0, entry.y / 255.0, entry.z / 255.0]
    } else if (isCompartmentNode(node)) {
      const entry = palette[`${buildCompartmentNamePath(node)}.membrane.outer_membrane`]
      if (entry) node.data.color = [entry.x / 255.0, entry.y / 255.0, entry.z / 255.0]
    }
  }
}
