import { useEffect } from 'react'
import { useRecipeStore } from '../../state/recipeStore'
import { useThemeStore } from '../../state/themeStore'
import { Dialog } from './Dialog'
import { MenuBar } from './MenuBar'
import { Workspace } from './Workspace'
import './AppShell.css'

/**
 * Application shell: menu bar + workspace, recreating the legacy layout's
 * organization (see ../../../README-modernization.md and the migration
 * plan). Feature wiring (Load/Save/Skills, real panel content) is Phase 4,
 * in progress — see menuConfig.ts for which items are real vs. placeholder.
 */
export function AppShell() {
  const error = useRecipeStore((s) => s.error)
  const setError = useRecipeStore((s) => s.setError)
  const theme = useThemeStore((s) => s.theme)

  // Drives `src/styles/theme.css`'s `:root[data-theme=...]` custom properties.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div className="app-shell">
      <MenuBar />
      <Workspace />
      {error && (
        <Dialog title="Error" onClose={() => setError(null)}>
          <p>{error}</p>
        </Dialog>
      )}
    </div>
  )
}
