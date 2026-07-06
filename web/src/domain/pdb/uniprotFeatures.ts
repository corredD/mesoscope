/**
 * Fetches a single UniProt entry's sequence + feature annotations, for the "Sequence Features"
 * panel (`SequenceFeaturesPanel.tsx`) — a Nightingale-based (github.com/ebi-webcomponents/
 * nightingale) replacement for that panel's placeholder. Kept separate from `pdbSearch.ts`:
 * that module is scoped to *search result lists*; this is a single-accession *entry* fetch
 * with a different response shape, matching this codebase's one-file-per-API-surface
 * convention (`ingredientViewControls.ts`/`molstarStructureUtil.ts`/`molstarCustomShapes.ts`
 * are similarly split by concern rather than merged).
 *
 * Same fetch pattern as `pdbSearch.ts`'s `searchUniprot` (plain `fetch`, throw on non-ok,
 * typed response mapping) against the same confirmed-live `rest.uniprot.org` API — verified
 * directly (`curl rest.uniprot.org/uniprotkb/P00338.json`) rather than assumed, since this
 * project has twice found legacy UniProt/RCSB endpoints that look plausible from source but
 * are actually dead (see `pdbSearch.ts`'s docstring).
 */

export interface UniprotFeature {
  type: string
  start: number
  end: number
  description: string
}

export interface UniprotEntry {
  accession: string
  sequence: string
  features: UniprotFeature[]
}

interface UniprotFeatureApiEntry {
  type: string
  location: { start: { value: number }; end: { value: number } }
  description?: string
}

interface UniprotEntryApiResponse {
  sequence?: { value?: string }
  features?: UniprotFeatureApiEntry[]
}

/** Fetches sequence + feature annotations for one UniProt accession (e.g. `"P00338"`). */
export async function fetchUniprotEntry(accession: string): Promise<UniprotEntry> {
  const response = await fetch(`https://rest.uniprot.org/uniprotkb/${encodeURIComponent(accession)}.json`)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const data = (await response.json()) as UniprotEntryApiResponse
  return {
    accession,
    sequence: data.sequence?.value ?? '',
    features: (data.features ?? []).map((f) => ({
      type: f.type,
      start: f.location.start.value,
      end: f.location.end.value,
      description: f.description ?? '',
    })),
  }
}

/** One entry per Nightingale `nightingale-track` "feature" (`Feature` in its own type defs). */
export interface NightingaleTrackFeature {
  accession: string
  start: number
  end: number
  type: string
  tooltipContent: string
}

/**
 * Shapes a `UniprotEntry`'s features into `nightingale-track`'s documented `data` format
 * (confirmed against the installed package's own `nightingale-track.d.ts`: `accession`,
 * `start`, `end` are the fields the track actually reads for a non-fragmented feature).
 * `accession` here is a per-feature id (Nightingale's own convention, distinct from the
 * UniProt accession the whole track belongs to) — index-suffixed since UniProt's feature
 * list has no stable per-feature id of its own to reuse.
 */
export function toNightingaleTrackData(entry: UniprotEntry): NightingaleTrackFeature[] {
  return entry.features.map((f, i) => ({
    accession: `${entry.accession}-${i}`,
    start: f.start,
    end: f.end,
    type: f.type,
    tooltipContent: f.description,
  }))
}
