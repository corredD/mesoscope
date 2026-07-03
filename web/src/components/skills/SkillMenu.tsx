import { forwardRef, useImperativeHandle } from 'react'
import { copyTextToClipboard } from '../../domain/files/clipboard'
import { buildRecipeSkillsCopyText, getMesoscopeBaseUrl, SKILLS_SAFETY_DISCLAIMER } from '../../domain/skills/skillsCopyText'

export interface SkillMenuHandle {
  /** Skills > Copy LLM Recipe Skill (js/main.js:CopyRecipeSkillsForLLM). */
  copySkill: () => Promise<void>
  /** Skills > Open SKILLS.md (js/main.js:OpenSkillsMd). */
  openSkillsMd: () => void
}

/**
 * Port of js/main.js:CopyRecipeSkillsForLLM/OpenSkillsMd (main.js:1818-1840).
 * Renders nothing — both actions are native `confirm()`/`alert()` dialogs in
 * legacy too, so this stays a thin imperative handle (like RecipeLoader)
 * rather than building custom modal UI for a one-off feature.
 */
export const SkillMenu = forwardRef<SkillMenuHandle>((_props, ref) => {
  useImperativeHandle(ref, () => ({
    copySkill: async () => {
      if (!window.confirm(SKILLS_SAFETY_DISCLAIMER)) return
      try {
        const response = await fetch('SKILLS.md', { cache: 'no-store' })
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
        const skillText = await response.text()
        await copyTextToClipboard(buildRecipeSkillsCopyText(skillText, getMesoscopeBaseUrl()))
        window.alert('Mesoscope LLM recipe skill copied. Paste it into your LLM to generate recipe files and a direct Mesoscope URL.')
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        window.alert(`Unable to copy the Mesoscope LLM recipe skill: ${message}\nOpen SKILLS.md from the Skills menu instead.`)
      }
    },
    openSkillsMd: () => {
      if (!window.confirm(SKILLS_SAFETY_DISCLAIMER)) return
      window.open('SKILLS.md', '_blank')
    },
  }))
  return null
})
SkillMenu.displayName = 'SkillMenu'
