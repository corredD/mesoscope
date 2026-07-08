import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveStructureSource, resolveSpriteImageUrl } from '../src/domain/pdb/structureSource'

describe('resolveStructureSource', () => {
  it('treats a bare accession (no extension) as an ID for automatic loading', () => {
    expect(resolveStructureSource('3hvt')).toEqual({ kind: 'id', id: '3hvt' })
    expect(resolveStructureSource('6VXX')).toEqual({ kind: 'id', id: '6VXX' })
  })

  it('resolves a .pdb filename to the cellPACK_data GitHub repo', () => {
    expect(resolveStructureSource('MA_matrix_G1.pdb')).toEqual({
      kind: 'repo-file',
      url: 'https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/other/MA_matrix_G1.pdb',
      extension: 'pdb',
    })
  })

  it('resolves a .cif filename to the repo, with the cif extension', () => {
    expect(resolveStructureSource('some_structure.cif')).toEqual({
      kind: 'repo-file',
      url: 'https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/other/some_structure.cif',
      extension: 'cif',
    })
  })

  it('resolves a .mrc filename to the repo, flagged as a volume/density map', () => {
    expect(resolveStructureSource('density_map.mrc')).toEqual({
      kind: 'repo-file',
      url: 'https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/other/density_map.mrc',
      extension: 'mrc',
    })
  })

  it('is case-insensitive on the extension', () => {
    expect(resolveStructureSource('Foo.PDB')?.kind).toBe('repo-file')
    expect(resolveStructureSource('Foo.MRC')).toMatchObject({ extension: 'mrc' })
  })

  it('returns null for an empty pdb value', () => {
    expect(resolveStructureSource('')).toBeNull()
  })

  it('does not treat an unrecognized extension as a file (falls back to ID)', () => {
    expect(resolveStructureSource('something.xyz')).toEqual({ kind: 'id', id: 'something.xyz' })
  })

  it('against the real HIV_serialized.json fixture, resolves exactly 8 as IDs and 18 as repo files', () => {
    // Not a guess: counted directly from the fixture (see
    // web/README-modernization.md's "Phase 4 progress: structure source resolution" section).
    const hiv = JSON.parse(readFileSync(resolve(__dirname, '../../data/HIV_serialized.json'), 'utf-8'))
    const pdbValues: string[] = []
    const walk = (node: { IngredientGroups?: { Ingredients: { source: { pdb: string } }[] }[]; Compartments?: unknown[] }) => {
      for (const group of node.IngredientGroups ?? []) {
        for (const ing of group.Ingredients) pdbValues.push(ing.source.pdb)
      }
      for (const comp of (node.Compartments ?? []) as typeof node[]) walk(comp)
    }
    walk(hiv)
    expect(pdbValues).toHaveLength(26)
    const resolved = pdbValues.map(resolveStructureSource)
    expect(resolved.filter((r) => r?.kind === 'id')).toHaveLength(8)
    expect(resolved.filter((r) => r?.kind === 'repo-file')).toHaveLength(18)
  })
})

describe('resolveSpriteImageUrl', () => {
  it('resolves a sprite.image filename from the cellPACK_data images/ folder', () => {
    expect(resolveSpriteImageUrl('Albumin_C.png', undefined)).toBe(
      'https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/images/Albumin_C.png',
    )
  })

  it('falls back to a PDBe chain-image thumbnail keyed by the PDB accession when there is no sprite.image', () => {
    expect(resolveSpriteImageUrl(null, '1e7i')).toBe('https://www.ebi.ac.uk/pdbe/static/entry/1e7i_deposited_chain_front_image-200x200.png')
  })

  it('does not treat a repo-file pdb (has an extension) as a PDBe accession', () => {
    expect(resolveSpriteImageUrl(null, 'MA_matrix_G1.pdb')).toBeNull()
  })

  it('returns null when neither sprite.image nor a usable pdb accession is present', () => {
    expect(resolveSpriteImageUrl(null, undefined)).toBeNull()
    expect(resolveSpriteImageUrl(null, '')).toBeNull()
  })

  it('prefers sprite.image over the pdb fallback when both are present', () => {
    expect(resolveSpriteImageUrl('Albumin_C.png', '1e7i')).toContain('Albumin_C.png')
  })
})
