/**
 * Light/dark UI theme, applied as a `data-theme` attribute on `<html>` (see
 * `AppShell.tsx`) that `src/styles/theme.css`'s custom properties key off of.
 * Persisted to `localStorage` (plain read/write, matching this codebase's
 * existing no-middleware zustand style rather than pulling in
 * `zustand/middleware`'s `persist`) so a choice survives a reload.
 *
 * Also drives dockview's own built-in theme class (`dockview-theme-light`/
 * `dockview-theme-dark`, applied in `Workspace.tsx`) so the panel-docking
 * chrome matches the rest of the app. Mol-star's own UI skin (imported
 * separately in `MolstarViewer.tsx`/`IngredientViewer.tsx` as `light.scss`)
 * does NOT follow this toggle — its skin CSS bakes colors into its own
 * component rules rather than exposing custom properties, and both viewers
 * already run a further-restricted UI (chain selection/orientation controls
 * live in `IngredientOptions.tsx` instead), so re-skinning it is its own,
 * separate follow-up rather than something this toggle silently half-does.
 */
import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'mesoscope.theme'

function readStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'dark' ? 'dark' : 'light'
}

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: readStoredTheme(),
  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, theme)
    set({ theme })
  },
  toggle: () =>
    set((state) => {
      const next: Theme = state.theme === 'light' ? 'dark' : 'light'
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, next)
      return { theme: next }
    }),
}))
