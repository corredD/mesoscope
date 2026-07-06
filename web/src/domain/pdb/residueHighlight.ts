/**
 * Highlights a residue range on the loaded Mol-star structure, given a UniProt sequence
 * position range — the "Sequence Features" panel's (`SequenceFeaturesPanel.tsx`) sync target
 * when a Nightingale (github.com/ebi-webcomponents/nightingale) feature is clicked/hovered.
 * Split out of the component, same convention as `ingredientViewControls.ts`/
 * `molstarCustomShapes.ts` (Mol-star API surface kept out of JSX).
 *
 * This is genuinely new territory for this codebase — nothing here previously touched
 * Mol-star's interactivity/selection managers, only representation/color/visibility
 * (`buildIngredientRepresentation` in `ingredientViewControls.ts`).
 *
 * Residue-numbering caveat, disclosed here and surfaced in the panel's own UI (not just this
 * comment): maps the UniProt sequence position directly onto the structure's `auth_seq_id`,
 * not `label_seq_id`. `label_seq_id` (mmCIF SEQRES numbering) always starts at 1 and would be
 * wrong by the modeled construct's start offset whenever it doesn't begin at UniProt residue 1
 * (common — cleaved signal peptides, N-terminal tags, partial domains). `auth_seq_id`
 * (depositor numbering) is frequently set to match UniProt numbering directly for
 * straightforward, tag-free, single-domain entries, so naive 1:1 against it is often correct
 * in practice — but wrong for constructs/engineered mutants/multi-domain renumbering. Legacy's
 * `node.data.mapping[uniprot][chain]` (a SIFTS-style residue mapping) was apparently pre-baked
 * into recipe JSON at authoring time, not computed live, so porting it isn't actually
 * shovel-ready; a live SIFTS/PDBe-mappings lookup is a real, separately-scoped follow-up, not
 * attempted here.
 */
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder.js'
import { Script } from 'molstar/lib/mol-script/script.js'
import { StructureSelection } from 'molstar/lib/mol-model/structure/query/selection.js'
import type { PluginContext } from 'molstar/lib/mol-plugin/context.js'
import type { Structure } from 'molstar/lib/mol-model/structure/structure/structure.js'

/** Highlights (hover-style, not a persistent selection) `[start, end]` on the loaded structure. */
export function highlightResidueRange(plugin: PluginContext, structure: Structure, start: number, end: number): void {
  const expr = MS.struct.generator.atomGroups({
    'residue-test': MS.core.rel.inRange([MS.ammp('auth_seq_id'), start, end]),
  })
  const selection = Script.getStructureSelection(expr, structure)
  const loci = StructureSelection.toLociWithSourceUnits(selection)
  plugin.managers.interactivity.lociHighlights.highlightOnly({ loci })
}

/** Clears any highlight set by `highlightResidueRange` (e.g. on mouseout/reset). */
export function clearResidueHighlight(plugin: PluginContext): void {
  plugin.managers.interactivity.lociHighlights.clearHighlights()
}
