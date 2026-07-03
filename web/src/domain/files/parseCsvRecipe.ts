/**
 * Port of js/main.js:parseSpreadSheetRecipe (main.js:1100-1360), scoped to
 * plain CSV (no XLSX workbook, no second "interactions" sheet — legacy only
 * reads links from a 2-sheet XLSX, gated by `!csv_mapping`, so a flat CSV
 * never has them).
 *
 * Scope cuts from the legacy parser, each because the underlying feature
 * doesn't exist yet in this app and replicating it would mean guessing at
 * undocumented edge cases instead of porting something verifiable:
 *  - The `comp_column` "one column per compartment" layout (Brett's
 *    multi-column format, main.js:1255-1291) — not ported; only a single
 *    `compartment` column is supported (see columnMapping.ts).
 *  - Compartment resolution against an *existing* loaded recipe's
 *    compartment tree (`getModalCompGraph`/`float_compartments`,
 *    js/modal_canvas_comp.js) — that's the compartment-hierarchy visual
 *    editor, itself unported (plan: "Wrap", low priority). CSV import here
 *    always starts a fresh recipe, so there's never a pre-existing
 *    compartment to match against; every named compartment is newly
 *    created as a child of root.
 *  - Falling back from an empty `compartment` column to a compartment
 *    *guessed from the location/surface column* (main.js:1248-1253,
 *    1292-1308) — a legacy path that, for the "no pre-existing compartment"
 *    case, ends up creating a compartment literally named "root" nested
 *    inside the real root (a pre-existing quirk, not a feature worth
 *    replicating). Here, `location` only sets the surface/interior flag;
 *    an ingredient with no `compartment` value is parented directly to root.
 *  - `NGL_GetSelection`'s chain-selection-string reformatting (js/ngl.js:1189)
 *    — the raw `selection` cell is stored as-is; reformatting it into an NGL
 *    selection expression belongs with the NGL panel wrap (Phase 4 item 5),
 *    which needs the same helper for hand-entered selections too.
 */
import type { ColumnMapping } from './columnMapping'
import {
  flattenRecipeTree,
  KNOWN_INGREDIENT_FIELDS,
  type CompartmentData,
  type IngredientData,
  type RecipeGraph,
  type RecipeTreeNode,
} from '../recipe/types'

/** Minimal RFC4180-ish CSV parser: quoted fields, doubled-quote escaping, matching
 *  the escaping csv.ts:processRow produces on export. */
export function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const pushField = () => { row.push(field); field = '' }
  const pushRow = () => { pushField(); rows.push(row); row = [] }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      pushField()
    } else if (c === '\n') {
      pushRow()
    } else if (c === '\r') {
      // skip; \r\n handled by the following \n
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) pushRow()

  const [headers, ...dataRows] = rows.filter((r) => r.length > 1 || r[0] !== '')
  return { headers: headers ?? [], rows: dataRows }
}

/** Port of js/main.js:IsSurface (main.js:935-946). */
const SURFACE_TAGS = ['membrane', 'x', 'surface', 'tm', 'true']
function isSurface(cellValue: string | undefined): boolean {
  if (!cellValue) return false
  if (cellValue === 'true') return true
  const normalized = cellValue.toLowerCase().replace(' ', '')
  for (const tag of SURFACE_TAGS) {
    if (normalized.includes(tag)) return true
  }
  return false
}

/** Port of js/main.js:ParseBU (main.js:977-991). */
function parseBU(cellValue: string | undefined): string {
  if (!cellValue) return 'BU1'
  const parts = cellValue.split(':')
  if (parts.length > 1) return parts[1]
  if (parts[0].startsWith('BA')) return parts[0].slice(2)
  if (parts[0].startsWith('BU')) return parts[0].slice(2)
  if (parts[0].startsWith('B')) return parts[0].slice(1)
  return parts[0]
}

function cell(row: string[], index: number): string | undefined {
  return index === -1 ? undefined : row[index]
}

function newIngredient(name: string): IngredientData {
  return {
    nodetype: 'ingredient',
    name,
    label: '',
    size: 25,
    molecularweight: 0,
    confidence: 0,
    source: { pdb: '', bu: 'BU1', model: '', selection: '' },
    count: 0,
    molarity: 0,
    surface: false,
    geom: '',
    geom_type: 'file',
    comments: '',
    uniprot: '',
    pcpalAxis: [0, 0, 1],
    offset: [0, 0, 0],
    fiberAxis: [0, 0, 1],
    fiberOffset: [0, 0, 0],
    pos: null,
    radii: null,
    ingtype: 'protein',
    buildtype: 'random',
    color: [1, 0, 0],
    sprite: { image: null, offsety: 0, scale2d: 0, lengthy: 0 },
    include: true,
  }
}

function newCompartment(name: string): RecipeTreeNode {
  const data: CompartmentData = { nodetype: 'compartment', name, geom: '', geom_type: 'None', thickness: 7.5, color: null }
  return { ...data, children: [] }
}

/** Last path segment of a dotted/slash-separated compartment cell (main.js:1240-1243). */
function lastPathSegment(comp: string): string {
  const dotSplit = comp.split('.')
  const afterDot = dotSplit.length > 1 ? dotSplit[dotSplit.length - 1] : comp
  const slashSplit = afterDot.split('/')
  return slashSplit.length > 1 ? slashSplit[slashSplit.length - 1] : afterDot
}

/**
 * Build a fresh `RecipeGraph` from CSV rows + a completed column mapping.
 * Always names the root "root", matching legacy (`rootName = "root"` is
 * hardcoded in parseSpreadSheetRecipe regardless of what's passed in).
 */
export function buildRecipeFromCsvRows(headers: string[], rows: string[][], mapping: ColumnMapping): RecipeGraph {
  const knownColumns = new Set(Object.values(mapping).filter((i) => i !== -1))
  // Columns that aren't mapped to a field AND don't collide with a structural
  // IngredientData field name (e.g. a "geom"/"size" column from a CSV this
  // app previously exported) become custom data; a same-named, unmapped
  // column never silently overwrites a field the parser already sets.
  const customHeaders = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h, i }) => h !== '' && !knownColumns.has(i) && !KNOWN_INGREDIENT_FIELDS.has(h))

  const root = newCompartment('root')
  const compartmentsByName = new Map<string, RecipeTreeNode>()

  rows.forEach((row, i) => {
    const name = cell(row, mapping.name) || `protein_${i}`
    const pdb = cell(row, mapping.source) || ''
    const geom = pdb ? `${pdb.replace('.pdb', '')}_cms.dae` : ''
    const countCell = cell(row, mapping.count)
    const molarityCell = cell(row, mapping.molarity)
    const axisCell = cell(row, mapping.pcpalAxis)
    const offsetCell = cell(row, mapping.offset)
    const colorCell = cell(row, mapping.color)
    const includeCell = cell(row, mapping.include)

    const ing = newIngredient(name)
    ing.source.pdb = pdb
    ing.source.bu = parseBU(cell(row, mapping.bu))
    ing.source.selection = cell(row, mapping.selection) || ''
    ing.source.model = cell(row, mapping.model) || ''
    ing.geom = geom
    ing.count = countCell ? Number(countCell) || 0 : 0
    ing.molarity = molarityCell ? Number(molarityCell) || 0 : 0
    ing.uniprot = cell(row, mapping.uniprot) || ''
    ing.molecularweight = Number(cell(row, mapping.molecularweight)) || 0
    ing.confidence = Number(cell(row, mapping.confidence)) || 0
    ing.pcpalAxis = axisCell ? axisCell.split(',').map(Number) : [0, 0, 1]
    ing.offset = offsetCell ? offsetCell.split(',').map(Number) : [0, 0, 0]
    ing.color = colorCell ? colorCell.split(',').map(Number) : [1, 0, 0]
    ing.label = cell(row, mapping.label) || ''
    ing.comments = cell(row, mapping.comment) || ''
    ing.sprite = {
      image: cell(row, mapping.image) || null,
      offsety: Number(cell(row, mapping.offsety)) || 0,
      scale2d: Number(cell(row, mapping.scale2d)) || 0,
      lengthy: 0,
    }
    if (includeCell !== undefined) {
      if (includeCell === 'x' || includeCell === 'true') ing.include = true
      else if (includeCell === '' || includeCell === 'false') ing.include = false
    }
    ing.surface = isSurface(cell(row, mapping.location))
    for (const { h, i: colIndex } of customHeaders) ing[h] = row[colIndex]

    const compCell = cell(row, mapping.compartment)
    let parent = root
    if (compCell) {
      const compName = lastPathSegment(compCell)
      let comp = compartmentsByName.get(compName)
      if (!comp) {
        comp = newCompartment(compName)
        compartmentsByName.set(compName, comp)
        root.children!.push(comp)
      }
      parent = comp
    }
    parent.children!.push(ing)
  })

  const nodes = flattenRecipeTree(root)
  return { nodes, links: [] }
}
