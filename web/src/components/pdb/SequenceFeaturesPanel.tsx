import { useEffect, useRef } from 'react'
import { useRecipeStore } from '../../state/recipeStore'
import { useIngredientViewerStore } from '../../state/ingredientViewerStore'
import { isIngredientNode } from '../../domain/recipe/types'
import { highlightResidueRange, clearResidueHighlight } from '../../domain/pdb/residueHighlight'
import 'protvista-uniprot'
import './SequenceFeaturesPanel.css'

/**
 * Replaces the "Sequence features" placeholder with the real thing: `protvista-uniprot`
 * (github.com/ebi-webcomponents/protvista-uniprot) — the actual, actively-maintained widget
 * that renders UniProt's own "Feature viewer" page (confirmed directly: it's the same
 * accession-in, categorized-accordion-out component, not a lookalike). Superseded a first
 * attempt built directly on the lower-level `@nightingale-elements/nightingale-sequence`/
 * `nightingale-track` building blocks: that version only flattened every feature into one
 * overlapping row and only recognized old-style UniProt type codes for coloring, so most
 * feature types (anything not spelled exactly like `DOMAIN`/`CHAIN`/etc.) rendered as
 * unreadable black marks with no category grouping — confirmed live, not assumed, this is
 * what prompted the switch. `protvista-uniprot` does its own fetching (UniProt, PDBe,
 * proteomics-API, variation) keyed only on `accession` — `uniprotFeatures.ts`'s manual fetch
 * is no longer needed for this panel.
 *
 * `nostructure` is set deliberately: `protvista-uniprot` can render its own embedded
 * structure viewer (`@nightingale-elements/nightingale-structure`, its own bundled Mol-star),
 * which would be a third, version-mismatched Mol-star instance alongside this app's existing
 * two. Confirmed by reading the installed package's own source
 * (`protvista-uniprot.ts`/`protvista-uniprot-structure.ts`) that `nostructure` gates whether
 * that sub-component is ever inserted into the render tree at all — no insertion means no
 * `connectedCallback`, means no Mol-star ever instantiated, not just "hidden." Sync to the
 * *existing* Mol-star "Ingredient View" instance is the custom bridge below instead, same as
 * the original design.
 *
 * `protvista-uniprot` deliberately does not use shadow DOM ("we are not using shadowDOM
 * because of Mol*", per its own source comment), so its internal category tracks (rendered as
 * `nightingale-track-canvas` elements) are plain light-DOM descendants — a single bubbling
 * `"change"` listener on the wrapper div below catches clicks from all of them, no shadow-root
 * traversal needed. Confirmed directly against `@nightingale-elements/nightingale-new-core`'s
 * installed source (`bindEvents.ts`) that `nightingale-track-canvas` dispatches the exact same
 * `"change"` CustomEvent contract (`detail: {eventType, feature, ...}`) this app's original
 * Mol-star bridge was already built against, via the same shared `createEvent` helper — so the
 * bridge logic itself didn't need to change, only what renders above it.
 */
export function SequenceFeaturesPanel() {
  const selectedNode = useRecipeStore((s) => s.selectedNode)
  const plugin = useIngredientViewerStore((s) => s.plugin)
  const structure = useIngredientViewerStore((s) => s.structure)

  const data = selectedNode && isIngredientNode(selectedNode) ? selectedNode.data : undefined
  const accession = data?.uniprot || undefined

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

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
    container.addEventListener('change', onChange)
    return () => container.removeEventListener('change', onChange)
  }, [plugin, structure])

  if (!data) return <p className="panel-note">Select an ingredient (Recipe table or Recipe View) to see its sequence features.</p>
  if (!accession) return <p className="panel-note">This ingredient has no UniProt accession — apply one from the UniProt search table first.</p>

  return (
    <div className="sequence-features-panel" ref={containerRef}>
      <p className="panel-note sequence-features-caveat">
        Residue highlighting assumes the structure's residue numbering matches UniProt — may be inaccurate for
        engineered constructs, tags, or multi-domain entries.
      </p>
      <protvista-uniprot key={accession} accession={accession} nostructure />
    </div>
  )
}
