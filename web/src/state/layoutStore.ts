/**
 * Panel-visibility state for the four Layout Options toggles
 * (js/layout_mg.js: layout_toggleSequenceFeatures/ObjectProperties/
 * InteractionTable/SearchTable). Each legacy toggle flips visibility for a
 * *group* of Golden Layout tabs together, not one tab each — this store
 * mirrors those exact groupings so Phase 4 can wire real panel content in
 * without re-deriving them:
 *
 *  - sequenceFeatures: "Sequence features", "Topology", "Uniprot mapping"
 *  - objectProperties: "Object Properties"
 *  - interactionTable: "Interaction table"
 *  - searchTable:      "Uniprot search table", "PDB search table"
 *
 * All start hidden (user-directed, diverging from legacy's all-visible default layout) — the
 * `default` workspace preset's `layoutToggles` in `Workspace.tsx` sets the same, so this is
 * really just documentation of what a from-scratch launch (no preset applied yet) lands on;
 * the preset's own effect is what actually takes effect on every mount, per `PresetId`.
 *
 * `setVisibility` (added for the workspace presets in `Workspace.tsx`'s
 * `WORKSPACE_PRESETS`) sets several of these atomically — a preset needs to
 * land on a specific combination in one go, not compute it via repeated
 * `toggle()` inversions. This store stays the single owner of these four
 * groups regardless of who's setting them (the "Layout Options" menu or a
 * preset) — the existing `TOGGLE_GROUPS`/`syncGroupPanels` effect in
 * `Workspace.tsx` reacts to this state either way, unchanged.
 */
import { create } from 'zustand'

export interface LayoutVisibility {
  sequenceFeatures: boolean
  objectProperties: boolean
  interactionTable: boolean
  searchTable: boolean
}

export type LayoutToggle = keyof LayoutVisibility

interface LayoutStore extends LayoutVisibility {
  toggle: (key: LayoutToggle) => void
  setVisibility: (partial: Partial<LayoutVisibility>) => void
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  sequenceFeatures: false,
  objectProperties: false,
  interactionTable: false,
  searchTable: false,
  toggle: (key) => set((state) => ({ [key]: !state[key] })),
  setVisibility: (partial) => set(partial),
}))
