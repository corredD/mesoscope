/**
 * Light/dark UI theme, passed to Radix Themes' root provider (`app/App.tsx`)
 * and applied as a `data-theme` attribute on `<html>` (see `AppShell.tsx`)
 * that `src/styles/theme.css`'s Mesoscope-specific properties key off of.
 * Persisted to `localStorage` (plain read/write, matching this codebase's
 * existing no-middleware zustand style rather than pulling in
 * `zustand/middleware`'s `persist`) so a choice survives a reload.
 *
 * Also drives dockview's built-in theme and both Mol-star Canvas3D renderer
 * backgrounds (`domain/pdb/molstarCanvasTheme.ts`). Mol-star's surrounding
 * plugin UI skin is still the bundled `light.scss`: that stylesheet bakes
 * colors into its controls instead of exposing tokens, so only the requested
 * WebGL canvas follows dark mode here; re-skinning the full plugin chrome is
 * a separate follow-up.
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
