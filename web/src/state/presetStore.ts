/**
 * Currently-selected workspace layout preset (`WORKSPACE_PRESETS` in
 * `Workspace.tsx`) — a whole-arrangement switch ("I'm doing recipe creation
 * now") layered on top of, not replacing, the four fine-grained "Layout
 * Options" toggles in `layoutStore.ts` (confirmed with the user: both stay,
 * a preset just sets sensible values for those four as part of applying
 * itself). Persisted to `localStorage` the same plain-`getItem`/`setItem`
 * way `themeStore.ts` already does, so the last-used preset survives a
 * reload.
 */
import { create } from 'zustand'

export type PresetId = 'default' | 'recipeCreation' | 'recipeCuration'

const STORAGE_KEY = 'mesoscope.workspacePreset'
const VALID_PRESETS: PresetId[] = ['default', 'recipeCreation', 'recipeCuration']

function readStoredPreset(): PresetId {
  if (typeof localStorage === 'undefined') return 'default'
  const stored = localStorage.getItem(STORAGE_KEY)
  return (VALID_PRESETS as string[]).includes(stored ?? '') ? (stored as PresetId) : 'default'
}

interface PresetStore {
  current: PresetId
  setPreset: (id: PresetId) => void
}

export const usePresetStore = create<PresetStore>((set) => ({
  current: readStoredPreset(),
  setPreset: (id) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
    set({ current: id })
  },
}))
