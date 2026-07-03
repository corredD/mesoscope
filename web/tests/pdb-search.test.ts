import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchPdbByText, searchPdbBySequence, searchPdbByUniprot, searchUniprot } from '../src/domain/pdb/pdbSearch'

// Response fixtures below are verbatim shapes captured from the real, currently-live
// endpoints via curl (see web/README-modernization.md's "Phase 4 progress: PDB/UniProt
// search" section) — not guessed from documentation, since the legacy endpoints these
// replace turned out to be dead and guessing at a replacement's shape would repeat that
// mistake with a different API.

const RCSB_ENTRY_RESPONSE = {
  query_id: 'b44877f5-c9ce-4572-91e4-4968add37d01',
  result_type: 'entry',
  total_count: 356,
  result_set: [
    { identifier: '1FDH', score: 1.0 },
    { identifier: '3S48', score: 1.0 },
  ],
}

const RCSB_POLYMER_ENTITY_RESPONSE = {
  query_id: 'bc5e6a0d-8454-4184-ac91-b544072610af',
  result_type: 'polymer_entity',
  total_count: 4,
  result_set: [
    { identifier: '11AS_1', score: 1.0 },
    { identifier: '4LNS_1', score: 0.29974811083123426 },
  ],
}

const UNIPROT_RESPONSE = {
  results: [
    {
      entryType: 'UniProtKB reviewed (Swiss-Prot)',
      primaryAccession: 'P68871',
      uniProtkbId: 'HBB_HUMAN',
      organism: { scientificName: 'Homo sapiens', commonName: 'Human', taxonId: 9606 },
      proteinDescription: { recommendedName: { fullName: { value: 'Hemoglobin subunit beta' } } },
      sequence: { length: 147 },
    },
  ],
}

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({ ok, status, statusText: 'x', json: async () => body }) as unknown as typeof fetch
}

describe('pdbSearch: RCSB (search.rcsb.org/rcsbsearch/v2/query)', () => {
  const originalFetch = global.fetch
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('searchPdbByText returns {id, score}, stripping any polymer-entity suffix', async () => {
    mockFetchOnce(RCSB_ENTRY_RESPONSE)
    const results = await searchPdbByText('hemoglobin')
    expect(results).toEqual([
      { id: '1FDH', score: 1.0 },
      { id: '3S48', score: 1.0 },
    ])
  })

  it('searchPdbBySequence strips the "_1" polymer-entity suffix down to the bare 4-char PDB ID', async () => {
    mockFetchOnce(RCSB_POLYMER_ENTITY_RESPONSE)
    const results = await searchPdbBySequence('MKTAYIAK')
    expect(results.map((r) => r.id)).toEqual(['11AS', '4LNS'])
  })

  it('searchPdbByUniprot sends the accession as the query value', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => RCSB_ENTRY_RESPONSE })
    global.fetch = fetchSpy as unknown as typeof fetch
    await searchPdbByUniprot('P69905')
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body.query.parameters.value).toBe('P69905')
  })

  it('treats a 204 (RCSB\'s "no results" response) as an empty list, not an error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 }) as unknown as typeof fetch
    await expect(searchPdbByText('zzznonexistent')).resolves.toEqual([])
  })

  it('throws with the status text on a real HTTP error', async () => {
    mockFetchOnce(null, false, 500)
    await expect(searchPdbByText('x')).rejects.toThrow('500')
  })
})

describe('pdbSearch: UniProt (rest.uniprot.org/uniprotkb/search)', () => {
  const originalFetch = global.fetch
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('maps the UniProt REST response to a flat UniprotSearchResult', async () => {
    mockFetchOnce(UNIPROT_RESPONSE)
    const results = await searchUniprot('hemoglobin')
    expect(results).toEqual([
      { accession: 'P68871', id: 'HBB_HUMAN', proteinName: 'Hemoglobin subunit beta', organism: 'Homo sapiens', length: 147 },
    ])
  })

  it('falls back to a submissionName when there is no recommendedName', async () => {
    mockFetchOnce({
      results: [{
        primaryAccession: 'A0A000', uniProtkbId: 'A0A000_TEST',
        proteinDescription: { submissionNames: [{ fullName: { value: 'Uncharacterized protein' } }] },
      }],
    })
    const results = await searchUniprot('x')
    expect(results[0].proteinName).toBe('Uncharacterized protein')
  })
})
