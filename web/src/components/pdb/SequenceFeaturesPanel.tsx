import { useEffect, useRef, useState } from 'react'
import { useRecipeStore } from '../../state/recipeStore'
import { useIngredientViewerStore } from '../../state/ingredientViewerStore'
import { isIngredientNode } from '../../domain/recipe/types'
import { fetchUniprotEntry, toNightingaleTrackData, type UniprotEntry } from '../../domain/pdb/uniprotFeatures'
import { highlightResidueRange, clearResidueHighlight } from '../../domain/pdb/residueHighlight'
import '@nightingale-elements/nightingale-manager'
import '@nightingale-elements/nightingale-sequence'
import '@nightingale-elements/nightingale-track'
import './SequenceFeaturesPanel.css'

/**
 * Replaces the "Sequence features" placeholder with a real panel, built on Nightingale
 * (github.com/ebi-webcomponents/nightingale — EBI's actively-maintained continuation of
 * ProtVista, confirmed via npm/GitHub research, not the older unscoped `protvista-*`
 * packages) rather than `@nightingale-elements/nightingale-structure`: that component wraps
 * its own embedded Mol-star (v3.44.0), which would be a third, version-mismatched Mol-star
 * instance alongside this app's existing two (`molstar` v5.10.1) — instead, this panel
 * displays just the sequence + feature track and syncs clicks to the *existing* "Ingredient
 * View" Mol-star instance via `residueHighlight.ts`.
 *
 * The now-redundant "protvista" tab was removed from `Workspace.tsx` (confirmed with the
 * user) — Nightingale *is* the modern ProtVista, so a separate tab pointing at the same
 * library would read as duplicated functionality. "Topology"/"Uniprot mapping" remain
 * untouched placeholders — they were scoped to RCSB's separate, non-Nightingale PDB
 * Component Library.
 *
 * Two effects, split by concern (matching `IngredientOptions.tsx`'s established pattern of
 * separating "data changed" from "scene sync" into distinct effects): one fetches on
 * `accession` change, the other imperatively pushes `sequence`/`data` onto the custom
 * elements once fetched data is ready, and wires the sync listener. `sequence`/`data` are set
 * as JS *properties* via refs, not JSX attributes — Nightingale's own type defs
 * (`nightingale-track.d.ts`: `set data(data: Feature[])`) show these hold non-string data that
 * doesn't round-trip through an HTML attribute, and this app has no other Web Component
 * precedent to follow, so this is the first place that pattern is established.
 *
 * Sync is one-way for this v1 (Nightingale click/hover → Mol-star highlight only), matching
 * an existing precedent in this codebase (`MolstarViewer.tsx`'s own docstring already scopes
 * out "bidirectional highlight sync" for a structurally similar gap). The reverse direction
 * (Mol-star selection → Nightingale highlight) is a separately-scoped follow-up.
 *
 * Confirmed directly against the installed `@nightingale-elements/*` packages' own bundled
 * source (not assumed from documentation): every Nightingale element dispatches a `"change"`
 * CustomEvent on click/hover/mouseout, with `detail: {eventType, feature, ...}` — `feature`
 * carries the clicked track feature's `start`/`end` (the fields `toNightingaleTrackData`
 * populates). `nightingale-manager` already relays this between sibling `nightingale-*`
 * children for free (sequence↔track highlight sync); the listener here is only for bridging
 * out to Mol-star, not for syncing the Nightingale elements with each other.
 */
export function SequenceFeaturesPanel() {
  const selectedNode = useRecipeStore((s) => s.selectedNode)
  const plugin = useIngredientViewerStore((s) => s.plugin)
  const structure = useIngredientViewerStore((s) => s.structure)

  const data = selectedNode && isIngredientNode(selectedNode) ? selectedNode.data : undefined
  const accession = data?.uniprot || undefined

  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'error' | 'ready'; entry?: UniprotEntry; error?: string }>({
    status: 'idle',
  })

  const managerRef = useRef<HTMLElement>(null)
  const sequenceRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLElement>(null)

  // 1. Fetch whenever the selected ingredient's UniProt accession changes.
  useEffect(() => {
    if (!accession) {
      setState({ status: 'idle' })
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    fetchUniprotEntry(accession)
      .then((entry) => {
        if (!cancelled) setState({ status: 'ready', entry })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', error: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      cancelled = true
    }
  }, [accession])

  // 2. Once fetched, push the sequence/feature data onto the custom elements (JS properties,
  // not JSX attributes — see this file's docstring) and wire the Mol-star sync bridge.
  useEffect(() => {
    if (state.status !== 'ready' || !state.entry) return
    const seqEl = sequenceRef.current as (HTMLElement & { sequence?: string }) | null
    const trackEl = trackRef.current as (HTMLElement & { data?: unknown }) | null
    if (!seqEl || !trackEl) return
    seqEl.sequence = state.entry.sequence
    trackEl.data = toNightingaleTrackData(state.entry)

    const onChange = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as { eventType?: string; feature?: { start?: number; end?: number } } | undefined
      if (!plugin || !structure || !detail?.feature) return
      if (detail.eventType === 'click' || detail.eventType === 'mouseover') {
        const { start, end } = detail.feature
        if (start != null && end != null) highlightResidueRange(plugin, structure, start, end)
      } else if (detail.eventType === 'mouseout' || detail.eventType === 'reset') {
        clearResidueHighlight(plugin)
      }
    }
    trackEl.addEventListener('change', onChange)
    return () => trackEl.removeEventListener('change', onChange)
  }, [state, plugin, structure])

  if (!data) return <p className="panel-note">Select an ingredient (Recipe table or Recipe View) to see its sequence features.</p>
  if (!accession) return <p className="panel-note">This ingredient has no UniProt accession — apply one from the UniProt search table first.</p>

  return (
    <div className="sequence-features-panel">
      {state.status === 'loading' && <p className="panel-note">Loading…</p>}
      {state.status === 'error' && <p className="search-panel-error">{state.error}</p>}
      {state.status === 'ready' && (
        <>
          <p className="panel-note sequence-features-caveat">
            Residue highlighting assumes the structure's residue numbering matches UniProt — may be inaccurate for
            engineered constructs, tags, or multi-domain entries.
          </p>
          <nightingale-manager ref={managerRef}>
            <nightingale-sequence ref={sequenceRef} height={40} length={state.entry?.sequence.length} display-start={1} display-end={state.entry?.sequence.length} />
            <nightingale-track ref={trackRef} height={40} length={state.entry?.sequence.length} display-start={1} display-end={state.entry?.sequence.length} layout="non-overlapping" />
          </nightingale-manager>
        </>
      )}
    </div>
  )
}
