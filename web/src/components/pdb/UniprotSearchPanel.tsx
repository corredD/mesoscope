import { useState } from 'react'
import { useRecipeStore } from '../../state/recipeStore'
import { searchUniprot, type UniprotSearchResult } from '../../domain/pdb/pdbSearch'
import './SearchPanel.css'

/**
 * Replaces the legacy `grid_uniprot` SlickGrid panel ("Uniprot search
 * table"). Not a wrap: calls domain/pdb/pdbSearch.ts's `searchUniprot`
 * (UniProt's current REST API), not legacy's `queryUniportKBfromName`
 * (confirmed dead — see that module's docstring).
 */
export function UniprotSearchPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UniprotSearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const selectedNode = useRecipeStore((s) => s.selectedNode)
  const applyPdbPick = useRecipeStore((s) => s.applyPdbPick)

  const runSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      setResults(await searchUniprot(query))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="search-panel">
      <div className="search-panel-controls">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="protein name…"
        />
        <button type="button" onClick={runSearch} disabled={searching}>
          Search
        </button>
      </div>
      {error && <p className="search-panel-error">{error}</p>}
      {!error && results.length === 0 && !searching && <p className="panel-note">No results yet.</p>}
      {results.length > 0 && (
        <table className="search-panel-table">
          <thead>
            <tr>
              <th>Accession</th>
              <th>Entry</th>
              <th>Protein name</th>
              <th>Organism</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.accession}>
                <td>{r.accession}</td>
                <td>{r.id}</td>
                <td>{r.proteinName}</td>
                <td>{r.organism}</td>
                <td>
                  <button
                    type="button"
                    disabled={!selectedNode}
                    onClick={() => applyPdbPick({ uniprot: r.accession, label: r.proteinName })}
                  >
                    Apply
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!selectedNode && <p className="panel-note">Select an ingredient in the Recipe table to apply a result.</p>}
    </div>
  )
}
