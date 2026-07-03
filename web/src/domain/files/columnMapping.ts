/**
 * Port of the CSV/XLSX column-to-field mapping from js/main.js: the
 * `allfield`/`allfield_key`/`allfield_labels`/`allfield_query` objects
 * (main.js:334-432) and the fuzzy auto-guess (`GuessColumn`,
 * `findLongestCommonSubstring`, main.js:508-566).
 *
 * Scope cut (see parseCsvRecipe.ts's docstring for the full reasoning):
 * the `compartments` "one column per compartment" special case (legacy's
 * `comp_column`, a secondary multi-column layout) is not ported — only the
 * single `compartment_index` field below.
 */

export type MappableField =
  | 'name' | 'source' | 'count' | 'compartment' | 'bu' | 'selection' | 'location'
  | 'model' | 'molarity' | 'uniprot' | 'offset' | 'pcpalAxis' | 'molecularweight'
  | 'confidence' | 'include' | 'color' | 'comment' | 'label' | 'image' | 'offsety' | 'scale2d'

/** Order matches legacy's attribute_list_order-adjacent field listing (main.js:334-357). */
export const MAPPABLE_FIELDS: MappableField[] = [
  'name', 'source', 'count', 'compartment', 'bu', 'selection', 'location', 'model',
  'molarity', 'uniprot', 'offset', 'pcpalAxis', 'molecularweight', 'confidence',
  'include', 'color', 'comment', 'label', 'image', 'offsety', 'scale2d',
]

/** Port of allfield_labels (main.js:384-407). */
export const FIELD_LABELS: Record<MappableField, string> = {
  name: 'protein name',
  source: 'protein structure (PDB, EMD)',
  count: 'protein copy number',
  compartment: 'protein compartment',
  bu: 'protein biological unit / assembly',
  selection: 'protein selection (chain name)',
  location: 'protein localisation in the compartment (look for keyword: surface, membrane, x, tm)',
  model: 'protein model number in structure file',
  molarity: 'protein concentration',
  uniprot: 'uniprot mapping',
  offset: 'protein offset along the principal vector',
  pcpalAxis: 'protein principal axis which will be aligned to the compartment surface',
  molecularweight: 'protein molecular weight',
  confidence: 'overall confidence score',
  include: 'include the ingredient (x, null, true, false)',
  color: 'predefined color for ingredient (r,g,b)',
  comment: 'notes and comments for the ingredient',
  label: 'label for the ingredient',
  image: 'filename for thumbnail/image',
  offsety: '2d surface protein membrane offset',
  scale2d: '2d surface protein scale (px/Å)',
}

/** Port of allfield_query (main.js:409-431) — keyword list used by the fuzzy guess. */
const FIELD_QUERY_KEYWORDS: Record<MappableField, string[]> = {
  name: ['protein', 'name'],
  source: ['structure', 'source', 'pdb'],
  count: ['copy', 'number', 'count'],
  compartment: ['compartment'],
  bu: ['biological', 'bu', 'assembly', 'stoichiometry'],
  selection: ['selection', 'chain'],
  location: ['membrane', 'localisation', 'localization', 'location', 'surface'],
  model: ['model'],
  molarity: ['contentration', 'molarity'],
  uniprot: ['uniprot'],
  offset: ['offset'],
  pcpalAxis: ['pcpalvector', 'principalvector', 'principalaxis', 'axis', 'vector'],
  molecularweight: ['mw', 'weight', 'molecularweight', 'molecular'],
  confidence: ['confidence', 'score'],
  include: ['include'],
  color: ['color', 'rgb'],
  comment: ['note', 'comment'],
  label: ['label', 'description'],
  image: ['image', 'thumbnail', 'sprite'],
  offsety: ['2dy'],
  scale2d: ['scale2d'],
}

/** -1 means "no column mapped to this field", matching legacy's `-1` sentinel index. */
export type ColumnMapping = Record<MappableField, number>

/** Port of js/main.js:findLongestCommonSubstring (main.js:508-545). */
function findLongestCommonSubstring(a: string, b: string): string {
  let maxLen = 0
  let bestStart = -1
  const table: number[][] = Array.from({ length: a.length }, () => new Array(b.length).fill(0))
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (a[i] === b[j]) {
        table[i][j] = i > 0 && j > 0 ? table[i - 1][j - 1] + 1 : 1
        if (table[i][j] > maxLen) {
          maxLen = table[i][j]
          bestStart = i
        }
      }
    }
  }
  return maxLen > 0 ? a.slice(bestStart - maxLen + 1, bestStart + 1) : ''
}

/**
 * Port of js/main.js:GuessColumn (main.js:547-566). Returns the header index
 * to preselect for `field`, or -1 if nothing matches well enough.
 */
export function guessColumn(field: MappableField, headers: string[]): number {
  const keywords = FIELD_QUERY_KEYWORDS[field]
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]
    if (!header) continue
    const normalized = header.toLowerCase().replace(' ', '')
    for (const keyword of keywords) {
      const common = findLongestCommonSubstring(keyword, normalized)
      if (common && common.length >= keyword.length) return i
    }
  }
  return -1
}

/** Runs `guessColumn` for every mappable field (legacy: one <select> per field, each self-guessing). */
export function guessAllColumns(headers: string[]): ColumnMapping {
  const mapping = {} as ColumnMapping
  for (const field of MAPPABLE_FIELDS) mapping[field] = guessColumn(field, headers)
  return mapping
}
