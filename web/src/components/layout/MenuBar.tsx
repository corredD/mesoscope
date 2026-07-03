import { useEffect, useRef, useState } from 'react'
import { useLayoutStore, type LayoutVisibility } from '../../state/layoutStore'
import { usePresetStore, type PresetId } from '../../state/presetStore'
import { useThemeStore } from '../../state/themeStore'
import { useRecipeStore } from '../../state/recipeStore'
import { RecipeLoader, type RecipeLoaderHandle } from '../recipe/RecipeLoader'
import { useRecipeSaver } from '../recipe/RecipeSaver'
import { SkillMenu, type SkillMenuHandle } from '../skills/SkillMenu'
import { Dialog } from './Dialog'
import { MENU, type MenuLeaf, type MenuNode } from './menuConfig'
import './MenuBar.css'

function resolveLabel(label: MenuLeaf['label'], layout: LayoutVisibility, preset: PresetId): string {
  return typeof label === 'function' ? label(layout, preset) : label
}

function MenuNodeList({ items, onLeafClick }: { items: MenuNode[]; onLeafClick: (leaf: MenuLeaf) => void }) {
  const layout = useLayoutStore()
  const preset = usePresetStore((s) => s.current)
  return (
    <ul className="menu-list">
      {items.map((node, i) => (
        <li key={i}>
          {node.kind === 'leaf' ? (
            <button type="button" className="menu-item" onClick={() => onLeafClick(node)}>
              {resolveLabel(node.label, layout, preset)}
            </button>
          ) : (
            <details className="menu-branch">
              <summary>{node.label}</summary>
              <MenuNodeList items={node.items} onLeafClick={onLeafClick} />
            </details>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Top menu bar: Load / Save / Layout Options / Skills, matching the legacy menu 1:1 (see menuConfig.ts). */
export function MenuBar() {
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [placeholderLabel, setPlaceholderLabel] = useState<string | null>(null)
  const toggle = useLayoutStore((s) => s.toggle)
  const layout = useLayoutStore()
  const preset = usePresetStore((s) => s.current)
  const setPreset = usePresetStore((s) => s.setPreset)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const loadEmpty = useRecipeStore((s) => s.loadEmpty)
  const loadFromUrl = useRecipeStore((s) => s.loadFromUrl)
  const saver = useRecipeSaver()
  const loaderRef = useRef<RecipeLoaderHandle>(null)
  const skillMenuRef = useRef<SkillMenuHandle>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openGroup) return
    const onClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenGroup(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenGroup(null)
    }
    window.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [openGroup])

  const handleLeafClick = (leaf: MenuLeaf) => {
    setOpenGroup(null)
    switch (leaf.action.kind) {
      case 'toggle':
        toggle(leaf.action.flag)
        return
      case 'preset':
        setPreset(leaf.action.id)
        return
      case 'load-empty':
        loadEmpty()
        return
      case 'load-example':
        loadFromUrl(leaf.action.url)
        return
      case 'pick-recipe-file':
        loaderRef.current?.pickRecipeFile()
        return
      case 'pick-color-palette-file':
        loaderRef.current?.pickColorPaletteFile()
        return
      case 'pick-molarity-file':
        loaderRef.current?.pickMolarityFile()
        return
      case 'merge-example':
        loaderRef.current?.mergeFromUrl(leaf.action.url)
        return
      case 'pick-merge-file':
        loaderRef.current?.pickMergeFile()
        return
      case 'copy-skill':
        skillMenuRef.current?.copySkill()
        return
      case 'open-skills-md':
        skillMenuRef.current?.openSkillsMd()
        return
      case 'save-classic':
        saver.saveClassic()
        return
      case 'save-serialized':
        saver.saveSerialized()
        return
      case 'save-csv':
        saver.saveCsv()
        return
      case 'save-color-palette':
        saver.saveColorPalette()
        return
      case 'save-molarity':
        saver.saveMolarity()
        return
      case 'placeholder':
        setPlaceholderLabel(resolveLabel(leaf.label, layout, preset))
    }
  }

  return (
    <div className="menu-bar" ref={barRef}>
      {MENU.map((group) => (
        <div className="menu-group" key={group.label}>
          <button
            type="button"
            className="menu-group-button"
            aria-expanded={openGroup === group.label}
            onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
          >
            {group.label}
          </button>
          {openGroup === group.label && (
            <div className="menu-dropdown">
              <MenuNodeList items={group.items} onLeafClick={handleLeafClick} />
            </div>
          )}
        </div>
      ))}
      <div className="menu-bar-spacer" />
      <button
        type="button"
        className="menu-bar-theme-toggle"
        onClick={toggleTheme}
        title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
        aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      >
        {theme === 'light' ? '☾' : '☀'}
      </button>
      <RecipeLoader ref={loaderRef} />
      <SkillMenu ref={skillMenuRef} />
      {placeholderLabel && (
        <Dialog title="Not yet available" onClose={() => setPlaceholderLabel(null)}>
          <p>
            &ldquo;{placeholderLabel}&rdquo; is part of the legacy Mesoscope menu and will be wired up in a later
            migration phase.
          </p>
        </Dialog>
      )}
    </div>
  )
}
