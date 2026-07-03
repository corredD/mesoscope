/**
 * Port of js/query_helper.js: saveCurrentCSV + ProcessRow (Save > Spreadsheet CSV).
 *
 * Decoupled from the DOM: legacy builds the CSV string and immediately triggers
 * a Blob download in the same function. This module only produces the string;
 * wiring it to a download is a Phase 4 UI concern (domain/files/saveFile.ts).
 *
 * Legacy picks CSV columns from `Object.keys(graph.nodes[first].data)` — i.e.
 * whichever ingredient happens to be first in the grid, so column order/set is
 * an accident of insertion order. We use a fixed, canonical column order over
 * the typed `IngredientData` fields instead, which is more predictable and
 * produces the same columns for the same recipe regardless of row order.
 */
import { isIngredientNode, buildAncestorCompartmentPath, customIngredientFields, type RecipeGraph } from '../recipe/types'

const BASE_COLUMNS = [
  'name', 'label', 'size', 'count', 'molarity', 'molecularweight', 'confidence',
  'surface', 'geom', 'geom_type', 'comments', 'uniprot', 'ingtype', 'buildtype',
  'pdb', 'model', 'selection', 'bu',
] as const

/** Port of js/query_helper.js:ProcessRow. */
function processRow(row: unknown[]): string {
  const cells = row.map((cell) => {
    let value = cell !== null && cell !== undefined ? String(cell) : ''
    if (value === '[object Object]') value = ''
    let escaped = value.replace(/"/g, '""')
    if (/("|,|;|\n)/.test(escaped)) escaped = `"${escaped}"`
    return escaped
  })
  return cells.join(',') + '\n'
}

/** Port of js/query_helper.js:saveCurrentCSV. Returns the CSV text; caller handles download. */
export function exportRecipeCsv(graph: RecipeGraph): string {
  const customColumns = new Set<string>()
  for (const node of graph.nodes) {
    if (isIngredientNode(node)) for (const key of customIngredientFields(node.data)) customColumns.add(key)
  }
  const columns = [...BASE_COLUMNS, ...customColumns, 'compartment']

  const rows: string[][] = [[...columns]]
  for (const node of graph.nodes) {
    if (!isIngredientNode(node)) continue
    const data = node.data
    const row = columns.map((col) => {
      switch (col) {
        case 'pdb': return data.source.pdb
        case 'model': return data.source.model
        case 'selection': return data.source.selection
        case 'bu': return data.source.bu
        case 'compartment': return buildAncestorCompartmentPath(node)
        default: return data[col] as unknown
      }
    })
    rows.push(row as string[])
  }

  return rows.map(processRow).join('')
}
