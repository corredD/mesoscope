/**
 * Panel-visibility state for the four Layout Options toggles
 * (js/layout_mg.js: layout_toggleSequenceFeatures/ObjectProperties/
 * InteractionTable/SearchTable). Each legacy toggle flips visibility for a
 * *group* of Golden Layout tabs together, not one tab each — this store
 * mirrors those exact groupings so Phase 4 can wire real panel content in
 * without re-deriving them:
 *
 *  - sequenceFeatures: "Sequence features", "Topology", "Uniprot mapping", "protvista"
 *  - objectProperties: "Object Properties"
 *  - interactionTable: "Interaction table"
 *  - searchTable:      "Uniprot search table", "PDB search table"
 *
 * All start visible, matching the legacy default layout on load.
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
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  sequenceFeatures: true,
  objectProperties: true,
  interactionTable: true,
  searchTable: true,
  toggle: (key) => set((state) => ({ [key]: !state[key] })),
}))
