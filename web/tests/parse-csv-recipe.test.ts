import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { guessAllColumns, guessColumn, type ColumnMapping } from '../src/domain/files/columnMapping'
import { exportRecipeCsv } from '../src/domain/files/csv'
import { buildRecipeFromCsvRows, parseCsvText } from '../src/domain/files/parseCsvRecipe'
import { parseLegacyRecipe } from '../src/domain/recipe/parseLegacyRecipe'
import { isIngredientNode } from '../src/domain/recipe/types'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

describe('columnMapping.guessColumn (port of js/main.js:GuessColumn)', () => {
  // Headers a real spreadsheet might use — none are the exact field key, so this
  // exercises the fuzzy substring match, not an accidental exact-string match.
  const headers = [
    'Protein Name', 'PDB Source', 'Copy Number', 'Compartment', 'Biological Unit',
    'Chain Selection', 'Localisation', 'Model', 'Molarity', 'UniProt',
    'Offset', 'Principal Axis', 'Molecular Weight', 'Confidence Score',
  ]

  it('guesses the intended column for each field from a header synonym', () => {
    const mapping = guessAllColumns(headers)
    expect(mapping.name).toBe(0)
    expect(mapping.source).toBe(1)
    expect(mapping.count).toBe(2)
    expect(mapping.compartment).toBe(3)
    expect(mapping.bu).toBe(4)
    expect(mapping.selection).toBe(5)
    expect(mapping.location).toBe(6)
    expect(mapping.model).toBe(7)
    expect(mapping.molarity).toBe(8)
    expect(mapping.uniprot).toBe(9)
    expect(mapping.molecularweight).toBe(12)
    expect(mapping.confidence).toBe(13)
  })

  it('returns -1 (Absent) when no header matches a field', () => {
    expect(guessColumn('image', headers)).toBe(-1)
    expect(guessColumn('scale2d', headers)).toBe(-1)
  })
})

describe('parseCsvText', () => {
  it('splits a quoted, comma-escaped CSV (matching csv.ts export escaping) back into rows', () => {
    const csv = 'name,comments\n"Spike, glyco","says ""hi"""\nENV,plain\n'
    const { headers, rows } = parseCsvText(csv)
    expect(headers).toEqual(['name', 'comments'])
    expect(rows).toEqual([
      ['Spike, glyco', 'says "hi"'],
      ['ENV', 'plain'],
    ])
  })
})

describe('buildRecipeFromCsvRows: oracle round trip against a real fixture', () => {
  // No CSV/XLSX fixtures exist in data/, and the legacy CSV import path
  // (parseSpreadSheetRecipe) isn't independently exercised anywhere else, so
  // this dissolves the "no real-data oracle" gap the other way around: export
  // a real, already-fixture-verified recipe (HIV_serialized.json) to CSV with
  // this app's own exporter, then verify the importer reconstructs the same
  // per-ingredient field values from that CSV.
  //
  // This does NOT verify fidelity against an arbitrary hand-authored CSV in
  // the wild (a genuinely different, still-open gap — see
  // web/README-modernization.md), and it does not check compartment nesting:
  // exportRecipeCsv flattens each ingredient's compartment into one dotted
  // path string, and by design (see parseCsvRecipe.ts's docstring) this
  // importer only keeps the last path segment as a flat, un-nested
  // compartment — so two differently-nested compartments that happen to
  // share a last path segment will legitimately merge on reimport.
  const original = parseLegacyRecipe(loadFixture('HIV_serialized.json'), 'serialized')
  const csv = exportRecipeCsv(original)
  const { headers, rows } = parseCsvText(csv)

  const mapping: ColumnMapping = {
    ...guessAllColumns(headers),
    name: headers.indexOf('name'),
    source: headers.indexOf('pdb'),
    count: headers.indexOf('count'),
    molarity: headers.indexOf('molarity'),
    molecularweight: headers.indexOf('molecularweight'),
    confidence: headers.indexOf('confidence'),
    location: headers.indexOf('surface'),
    uniprot: headers.indexOf('uniprot'),
    comment: headers.indexOf('comments'),
    label: headers.indexOf('label'),
    bu: headers.indexOf('bu'),
    selection: headers.indexOf('selection'),
    model: headers.indexOf('model'),
    compartment: headers.indexOf('compartment'),
  }

  const reimported = buildRecipeFromCsvRows(headers, rows, mapping)

  it('preserves the ingredient count', () => {
    expect(reimported.nodes.filter(isIngredientNode)).toHaveLength(original.nodes.filter(isIngredientNode).length)
  })

  it('preserves per-ingredient scalar fields, matched by fingerprint (names repeat in this fixture)', () => {
    const fingerprint = (data: { name: string; count: number; molarity: number; source: { pdb: string } }) =>
      JSON.stringify([data.name, data.count, data.molarity, data.source.pdb])

    const originalByFingerprint = new Map(original.nodes.filter(isIngredientNode).map((n) => [fingerprint(n.data), n.data]))
    const reimportedIngredients = reimported.nodes.filter(isIngredientNode)

    for (const node of reimportedIngredients) {
      const originalData = originalByFingerprint.get(fingerprint(node.data))
      expect(originalData, `no original ingredient matched fingerprint for ${node.data.name}`).toBeTruthy()
      expect(node.data.surface).toBe(originalData!.surface)
      expect(node.data.uniprot).toBe(originalData!.uniprot)
      expect(node.data.comments).toBe(originalData!.comments)
      expect(node.data.label).toBe(originalData!.label)
      // Not asserting source.bu here: ParseBU (main.js:977) strips a leading "BU"/"B"
      // prefix down to the bare digit, so re-importing our own exporter's canonical
      // "BU1" string legitimately turns into "1" — a legacy-inherited, lossy
      // transform on this one field, not a porting bug. See the dedicated
      // buildRecipeFromCsvRows/bu-column test below for ParseBU's exact behavior.
      expect(node.data.source.selection).toBe(originalData!.source.selection)
      expect(node.data.molecularweight).toBe(originalData!.molecularweight)
      expect(node.data.confidence).toBe(originalData!.confidence)
    }
  })
})

describe('buildRecipeFromCsvRows: bu-column parsing (port of js/main.js:ParseBU)', () => {
  // Synthetic — no real fixture exercises every ParseBU branch (colon form,
  // each prefix, blank cell) the way a hand-authored CSV would.
  const headers = ['name', 'bu']
  const rows = [
    ['a', 'BU1'],
    ['b', 'B2'],
    ['c', '3:BU4'],
    ['d', '5'],
    ['e', ''],
  ]
  const mapping = { ...guessAllColumns(headers), name: 0, bu: 1 }
  const graph = buildRecipeFromCsvRows(headers, rows, mapping)
  const buOf = (name: string) => graph.nodes.filter(isIngredientNode).find((n) => n.data.name === name)!.data.source.bu

  it('strips a leading "BU"/"B" prefix down to the bare digit', () => {
    expect(buOf('a')).toBe('1')
    expect(buOf('b')).toBe('2')
  })

  it('takes the segment after a colon as-is, unprocessed', () => {
    expect(buOf('c')).toBe('BU4')
  })

  it('passes a bare number through unchanged', () => {
    expect(buOf('d')).toBe('5')
  })

  it('defaults to "BU1" for a blank cell', () => {
    expect(buOf('e')).toBe('BU1')
  })
})
