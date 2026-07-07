/**
 * Highlights/selects a residue range on the loaded Mol-star structure, given a UniProt
 * sequence position range — the "Sequence Features" panel's (`SequenceFeaturesPanel.tsx`)
 * sync target when a Nightingale (github.com/ebi-webcomponents/nightingale) feature is
 * clicked/hovered. Split out of the component, same convention as `ingredientViewControls.ts`/
 * `molstarCustomShapes.ts` (Mol-star API surface kept out of JSX).
 *
 * This is genuinely new territory for this codebase — nothing here previously touched
 * Mol-star's interactivity/selection managers, only representation/color/visibility
 * (`buildIngredientRepresentation` in `ingredientViewControls.ts`).
 *
 * Two distinct behaviors, matching hover vs. click semantics: `highlightResidueRange` is
 * ephemeral (Mol-star's built-in hover-highlight overlay, no new geometry, cleared on
 * mouseout) — used for mouseover. `selectResidueRangeWithStickBalls` is persistent: it builds
 * a real component + `ball-and-stick` representation for the range (same
 * `tryCreateComponentFromExpression`/`representation.addRepresentation` pair
 * `buildIngredientRepresentation` already uses), so the clicked region stays visible as
 * sticks-and-balls on top of the structure's own representation until the next click —
 * used for click.
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
import type { StateObjectSelector } from 'molstar/lib/mol-state/index.js'
import type { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects.js'

function residueRangeExpression(start: number, end: number) {
  return MS.struct.generator.atomGroups({
    'residue-test': MS.core.rel.inRange([MS.ammp('auth_seq_id'), start, end]),
  })
}

/** Highlights (hover-style, not a persistent selection) `[start, end]` on the loaded structure. */
export function highlightResidueRange(plugin: PluginContext, structure: Structure, start: number, end: number): void {
  const selection = Script.getStructureSelection(residueRangeExpression(start, end), structure)
  const loci = StructureSelection.toLociWithSourceUnits(selection)
  plugin.managers.interactivity.lociHighlights.highlightOnly({ loci })
}

/** Clears any highlight set by `highlightResidueRange` (e.g. on mouseout/reset). */
export function clearResidueHighlight(plugin: PluginContext): void {
  plugin.managers.interactivity.lociHighlights.clearHighlights()
}

/**
 * Per-plugin ref to the current click-selection component, plus a per-plugin operation queue
 * — same read-then-delete-then-create race `buildIngredientRepresentation`/
 * `molstarCustomShapes.ts`'s `setCustomShape` already hit and fixed (a fast second click
 * firing before the first's `commit()` resolves would otherwise orphan the first's component).
 * Serializing calls here avoids reintroducing that class of bug for a third time.
 */
const selectionRefs = new WeakMap<PluginContext, string>()
const selectionQueues = new WeakMap<PluginContext, Promise<unknown>>()

function enqueueSelection<T>(plugin: PluginContext, op: () => Promise<T>): Promise<T> {
  const previous = selectionQueues.get(plugin) ?? Promise.resolve()
  const settled = previous.catch(() => {})
  const next = settled.then(op)
  selectionQueues.set(plugin, next.catch(() => {}))
  return next
}

/**
 * Click-to-select: replaces any previous selection from this panel with a `ball-and-stick`
 * component for `[start, end]`. If the structure itself gets rebuilt in the meantime (e.g. the
 * user switches ingredients, which deletes the whole model subtree in
 * `buildIngredientRepresentation`), the stale ref here is simply absent from
 * `plugin.state.data.cells` on the next call — no explicit listener needed to keep this in
 * sync with that rebuild.
 */
export function selectResidueRangeWithStickBalls(
  plugin: PluginContext,
  structureRef: StateObjectSelector<PluginStateObject.Molecule.Structure>,
  start: number,
  end: number,
): Promise<void> {
  return enqueueSelection(plugin, async () => {
    const prevRef = selectionRefs.get(plugin)
    if (prevRef && plugin.state.data.cells.has(prevRef)) {
      await plugin.build().delete(prevRef).commit()
    }
    selectionRefs.delete(plugin)

    const componentRef = await plugin.builders.structure.tryCreateComponentFromExpression(
      structureRef,
      residueRangeExpression(start, end),
      'sequence-feature-selection',
    )
    if (componentRef) {
      selectionRefs.set(plugin, componentRef.ref)
      await plugin.builders.structure.representation.addRepresentation(componentRef, { type: 'ball-and-stick', color: 'element-symbol' })
    }
  })
}

/** Removes the sticks-and-balls component `selectResidueRangeWithStickBalls` last created, if any. */
export function clearResidueSelection(plugin: PluginContext): Promise<void> {
  return enqueueSelection(plugin, async () => {
    const prevRef = selectionRefs.get(plugin)
    if (prevRef && plugin.state.data.cells.has(prevRef)) {
      await plugin.build().delete(prevRef).commit()
    }
    selectionRefs.delete(plugin)
  })
}
