/**
 * Port of js/cp_serialized.js: cp_SerializedColorMap / cp_DeserializedColorMap
 * (Save/Load > Color mapping, "Properties-Colors").
 *
 * This is distinct from colorPalette.ts: a palette maps ingredient/compartment
 * *names* to a color; a property mapping maps a *property* (size, molarity,
 * confidence, ...) to the gradient/discrete colors used when the canvas is
 * colored by that property (legacy global `property_mapping`, js/main.js:36-45).
 */

export interface PropertyMappingEntry {
  min: number
  max: number
  cmin: string
  cmax: string
  colors: string[]
}

export type PropertyMapping = Record<string, PropertyMappingEntry>

/** Port of cp_SerializedColorMap. */
export function exportColorMapping(propertyMapping: PropertyMapping): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const key of Object.keys(propertyMapping)) {
    out[key] = propertyMapping[key].colors
  }
  return out
}

/** Port of cp_DeserializedColorMap. Mutates `propertyMapping[key].colors` in place. */
export function importColorMapping(propertyMapping: PropertyMapping, data: Record<string, string[]>): void {
  for (const key of Object.keys(propertyMapping)) {
    if (key in data) propertyMapping[key].colors = data[key]
  }
}
