import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchUniprotEntry, toNightingaleTrackData } from '../src/domain/pdb/uniprotFeatures'

// Fixture below is a verbatim shape captured from the real, currently-live endpoint via
// `curl rest.uniprot.org/uniprotkb/P00338.json` (LDHA — one of the real accessions already
// present in data/exosome_catalase.json) — not guessed, matching pdbSearch.test.ts's own
// precedent, since this project has twice found legacy UniProt/RCSB endpoints that look
// plausible from documentation but are actually dead.
const LDHA_RESPONSE = {
  sequence: { value: 'MATLKDQLIYNLLKEEQTPQ' },
  features: [
    {
      type: 'Initiator methionine',
      location: { start: { value: 1, modifier: 'EXACT' }, end: { value: 1, modifier: 'EXACT' } },
      description: 'Removed',
    },
    {
      type: 'Chain',
      location: { start: { value: 2, modifier: 'EXACT' }, end: { value: 332, modifier: 'EXACT' } },
      description: 'L-lactate dehydrogenase A chain',
      featureId: 'PRO_0000168411',
    },
    {
      type: 'Active site',
      location: { start: { value: 193, modifier: 'EXACT' }, end: { value: 193, modifier: 'EXACT' } },
      // no description on this one — confirmed real UniProt entries omit it sometimes
    },
  ],
}

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({ ok, status, statusText: 'x', json: async () => body }) as unknown as typeof fetch
}

describe('uniprotFeatures: fetchUniprotEntry (rest.uniprot.org/uniprotkb/{accession})', () => {
  const originalFetch = global.fetch
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('maps sequence + features to a flat UniprotEntry', async () => {
    mockFetchOnce(LDHA_RESPONSE)
    const entry = await fetchUniprotEntry('P00338')
    expect(entry).toEqual({
      accession: 'P00338',
      sequence: 'MATLKDQLIYNLLKEEQTPQ',
      features: [
        { type: 'Initiator methionine', start: 1, end: 1, description: 'Removed' },
        { type: 'Chain', start: 2, end: 332, description: 'L-lactate dehydrogenase A chain' },
        { type: 'Active site', start: 193, end: 193, description: '' },
      ],
    })
  })

  it('URL-encodes the accession', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => LDHA_RESPONSE })
    global.fetch = fetchSpy as unknown as typeof fetch
    await fetchUniprotEntry('P00338')
    expect(fetchSpy.mock.calls[0][0]).toBe('https://rest.uniprot.org/uniprotkb/P00338.json')
  })

  it('throws with the status text on a real HTTP error', async () => {
    mockFetchOnce(null, false, 404)
    await expect(fetchUniprotEntry('NOTREAL')).rejects.toThrow('404')
  })

  it('tolerates a response with no features (empty array, not a crash)', async () => {
    mockFetchOnce({ sequence: { value: 'MK' } })
    const entry = await fetchUniprotEntry('X00000')
    expect(entry.features).toEqual([])
  })
})

describe('uniprotFeatures: toNightingaleTrackData', () => {
  it('shapes features into nightingale-track\'s documented Feature format, one per feature', () => {
    const entry = {
      accession: 'P00338',
      sequence: 'MATLKDQLIYNLLKEEQTPQ',
      features: [
        { type: 'Chain', start: 2, end: 332, description: 'L-lactate dehydrogenase A chain' },
        { type: 'Active site', start: 193, end: 193, description: 'Proton acceptor' },
      ],
    }
    expect(toNightingaleTrackData(entry)).toEqual([
      { accession: 'P00338-0', start: 2, end: 332, type: 'Chain', tooltipContent: 'L-lactate dehydrogenase A chain' },
      { accession: 'P00338-1', start: 193, end: 193, type: 'Active site', tooltipContent: 'Proton acceptor' },
    ])
  })

  it('returns an empty array for an entry with no features', () => {
    expect(toNightingaleTrackData({ accession: 'X', sequence: '', features: [] })).toEqual([])
  })
})
