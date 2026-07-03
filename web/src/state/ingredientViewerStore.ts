/**
 * Shared handle between `IngredientView` (the Mol-star canvas, replacing
 * "NGL View") and `IngredientOptions` (the controls panel, replacing
 * "NGL Options") — they're separate Golden-Layout-style panels in
 * Workspace.tsx driving one shared Mol-star plugin instance, the same
 * relationship legacy's two panels had over one `NGL.Stage`. This is a
 * *second*, independent Mol-star plugin from the "Mol-*" tab's
 * `MolstarViewer.tsx` — kept separate deliberately, since that one is
 * reserved for a later phase (loading a full packed cellPACK results file,
 * legacy's `MS_LoadModel`), not per-ingredient reference structures.
 *
 * `trajectoryRef`/`modelRef` exist so `ingredientViewControls.ts`'s
 * `buildIngredientRepresentation` can always rebuild the structure hierarchy
 * + representation *from the trajectory* on every chain/representation/color
 * change (deleting the previous model subtree first) rather than
 * incrementally patching an existing structure's components — see that
 * function's docstring for the real, reproducible color-rendering bug this
 * was built to avoid.
 */
import { create } from 'zustand'
import type { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context.js'
import type { Structure } from 'molstar/lib/mol-model/structure/structure/structure.js'
import type { StateObjectSelector } from 'molstar/lib/mol-state/index.js'
import type { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects.js'

export interface IngredientViewerState {
  plugin: PluginUIContext | null
  /** The parsed trajectory the current structure comes from — the stable anchor
   *  `buildIngredientRepresentation` rebuilds from on every option change. */
  trajectoryRef: StateObjectSelector<PluginStateObject.Molecule.Trajectory> | null
  /** Chain ids of the currently loaded structure, in encounter order. */
  chains: string[]
  /** The structure currently loaded, if any — lets other code build selection queries against it. */
  structure: Structure | null
  /** State-tree reference to the loaded structure — needed to build filtered components from it. */
  structureRef: StateObjectSelector<PluginStateObject.Molecule.Structure> | null
  setPlugin: (plugin: PluginUIContext | null) => void
  setTrajectoryRef: (ref: IngredientViewerState['trajectoryRef']) => void
  /** Sets chains + structure + structureRef together — only the initial load (chains
   *  is genuinely new) should use this. */
  setStructureInfo: (chains: string[], structure: Structure | null, structureRef: IngredientViewerState['structureRef']) => void
  /** Updates structure + structureRef only, deliberately leaving `chains` untouched.
   *  Every later rebuild (`IngredientOptions.tsx`'s chain/representation/color effect)
   *  uses this instead of `setStructureInfo` — the chain *list* doesn't change across a
   *  rebuild of the same structure, and passing a freshly-recomputed (but same-content)
   *  array through `setStructureInfo` would change its reference, re-triggering the
   *  "default to all chains selected" effect and silently undoing the user's own chain
   *  selection on every representation/color change. */
  setStructure: (structure: Structure | null, structureRef: IngredientViewerState['structureRef']) => void
}

export const useIngredientViewerStore = create<IngredientViewerState>((set) => ({
  plugin: null,
  trajectoryRef: null,
  chains: [],
  structure: null,
  structureRef: null,
  setPlugin: (plugin) => set({ plugin }),
  setTrajectoryRef: (trajectoryRef) => set({ trajectoryRef }),
  setStructureInfo: (chains, structure, structureRef) => set({ chains, structure, structureRef }),
  setStructure: (structure, structureRef) => set({ structure, structureRef }),
}))
