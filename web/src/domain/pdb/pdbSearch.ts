/**
 * PDB/UniProt search, replacing js/query_helper.js:queryPDBfromName/
 * queryPDBfromSequence/queryPDBfromUniprot/queryUniportKBfromName
 * (query_helper.js:557-685) — NOT a verbatim port. Empirically confirmed
 * (curl, not just reading the source) that every endpoint those functions
 * call is dead:
 *  - `https://www.rcsb.org/pdb/rest/search/` (old RCSB REST search) -> 404
 *  - `https://www.rcsb.org/pdb/rest/customReport.csv` -> 404
 *  - `https://www.uniprot.org/uniprot/?...&format=tab` -> redirects to
 *    `rest.uniprot.org` with the query string mangled into the path,
 *    resulting in a 400
 * These are RCSB's and UniProt's own legacy APIs, decommissioned on their
 * end — not something recoverable by fixing a URL typo. Porting the exact
 * calls would ship a search feature that returns nothing, so this module
 * calls each provider's current replacement API instead, preserving the
 * legacy feature's intent (search PDB by text/sequence/UniProt accession,
 * search UniProt by name) rather than its decommissioned mechanism:
 *  - RCSB's current search API, `search.rcsb.org/rcsbsearch/v2/query`
 *    (confirmed working, wildcard CORS: `access-control-allow-origin: *`)
 *  - UniProt's current REST API, `rest.uniprot.org/uniprotkb/search`
 *    (confirmed working, wildcard CORS)
 * Both are called directly from the browser — no proxy needed, unlike
 * cross-origin recipe loading (which legacy's own `/recipe_proxy` exists
 * for because arbitrary recipe-host CORS can't be assumed).
 *
 * Scope cut: legacy's `customReport.csv` path additionally fetched rich
 * per-result metadata (title, experimental technique, taxonomy, molecular
 * weight) in a second request. That endpoint is one of the dead ones with
 * no drop-in replacement that returns the same columns in one call, so
 * this module returns only `{id, score}` for PDB results — enough to
 * populate a result table and apply a pick back onto an ingredient, which
 * is the part of the feature that actually feeds back into the recipe
 * graph. Richer metadata display can be added later as its own slice.
 */

export interface PdbSearchResult {
  id: string
  score: number
}

interface RcsbTerminalQuery {
  type: 'terminal'
  service: 'full_text' | 'sequence'
  parameters: Record<string, unknown>
}

async function rcsbSearch(query: RcsbTerminalQuery, rows: number): Promise<PdbSearchResult[]> {
  const response = await fetch('https://search.rcsb.org/rcsbsearch/v2/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, return_type: 'entry', request_options: { paginate: { start: 0, rows } } }),
  })
  if (response.status === 204) return [] // RCSB's "no results" response
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const data = (await response.json()) as { result_set?: { identifier: string; score: number }[] }
  return (data.result_set ?? []).map((r) => ({ id: r.identifier.split('_')[0], score: r.score }))
}

/** Replaces queryPDBfromName (free-text search over PDB entries). */
export function searchPdbByText(query: string, rows = 25): Promise<PdbSearchResult[]> {
  return rcsbSearch({ type: 'terminal', service: 'full_text', parameters: { value: query } }, rows)
}

/** Replaces queryPDBfromSequence (BLAST-style protein sequence search). */
export function searchPdbBySequence(sequence: string, rows = 25): Promise<PdbSearchResult[]> {
  return rcsbSearch(
    { type: 'terminal', service: 'sequence', parameters: { evalue_cutoff: 1, identity_cutoff: 0.3, sequence_type: 'protein', value: sequence } },
    rows,
  )
}

/** Replaces queryPDBfromUniprot (find PDB entries for a UniProt accession). */
export function searchPdbByUniprot(accession: string, rows = 25): Promise<PdbSearchResult[]> {
  return rcsbSearch({ type: 'terminal', service: 'full_text', parameters: { value: accession } }, rows)
}

export interface UniprotSearchResult {
  accession: string
  id: string
  proteinName: string
  organism: string
  length: number
}

interface UniprotApiEntry {
  primaryAccession: string
  uniProtkbId: string
  organism?: { scientificName?: string }
  proteinDescription?: {
    recommendedName?: { fullName?: { value?: string } }
    submissionNames?: { fullName?: { value?: string } }[]
  }
  sequence?: { length?: number }
}

/** Replaces queryUniportKBfromName (free-text search over UniProtKB). */
export async function searchUniprot(query: string, size = 25): Promise<UniprotSearchResult[]> {
  const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(query)}&fields=accession,id,protein_name,organism_name,length&format=json&size=${size}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const data = (await response.json()) as { results?: UniprotApiEntry[] }
  return (data.results ?? []).map((r) => ({
    accession: r.primaryAccession,
    id: r.uniProtkbId,
    proteinName: r.proteinDescription?.recommendedName?.fullName?.value ?? r.proteinDescription?.submissionNames?.[0]?.fullName?.value ?? '',
    organism: r.organism?.scientificName ?? '',
    length: r.sequence?.length ?? 0,
  }))
}
