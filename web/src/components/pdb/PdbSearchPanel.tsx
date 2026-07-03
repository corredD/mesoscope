import { useState } from 'react'
import { useRecipeStore } from '../../state/recipeStore'
import { searchPdbByText, searchPdbBySequence, type PdbSearchResult } from '../../domain/pdb/pdbSearch'
import './SearchPanel.css'

type Mode = 'text' | 'sequence'

/**
 * Replaces the legacy `grid_pdb` SlickGrid panel ("PDB search table"). Not a
 * wrap: it calls domain/pdb/pdbSearch.ts, RCSB's current search API, rather
 * than legacy's `queryPDBfromName`/`queryPDBfromSequence` — see that
 * module's docstring for why (their target endpoints are confirmed dead).
 */
export function PdbSearchPanel() {
  const [mode, setMode] = useState<Mode>('text')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PdbSearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const selectedNode = useRecipeStore((s) => s.selectedNode)
  const applyPdbPick = useRecipeStore((s) => s.applyPdbPick)

  const runSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      const found = mode === 'text' ? await searchPdbByText(query) : await searchPdbBySequence(query)
      setResults(found)
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
        <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="text">By name</option>
          <option value="sequence">By sequence</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder={mode === 'text' ? 'protein name…' : 'amino acid sequence…'}
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
              <th>PDB ID</th>
              <th>Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.score.toFixed(2)}</td>
                <td>
                  <button type="button" disabled={!selectedNode} onClick={() => applyPdbPick({ pdb: r.id })}>
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
