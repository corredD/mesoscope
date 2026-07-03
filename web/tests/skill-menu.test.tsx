import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SkillMenu, type SkillMenuHandle } from '../src/components/skills/SkillMenu'
import { render } from '@testing-library/react'
import * as clipboard from '../src/domain/files/clipboard'

function renderSkillMenu() {
  const ref = createRef<SkillMenuHandle>()
  render(<SkillMenu ref={ref} />)
  return ref.current!
}

describe('SkillMenu.copySkill', () => {
  const originalFetch = global.fetch
  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('does nothing if the safety disclaimer is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    await renderSkillMenu().copySkill()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fetches SKILLS.md, copies the built prompt to the clipboard, and alerts success', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const copySpy = vi.spyOn(clipboard, 'copyTextToClipboard').mockResolvedValue()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '## a skill' }) as unknown as typeof fetch

    await renderSkillMenu().copySkill()

    expect(copySpy).toHaveBeenCalledTimes(1)
    const copiedText = copySpy.mock.calls[0][0]
    expect(copiedText).toContain('--- BEGIN MESOSCOPE SKILL ---')
    expect(copiedText).toContain('## a skill')
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('copied'))
  })

  it('alerts an error (without touching the clipboard) when the fetch fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const copySpy = vi.spyOn(clipboard, 'copyTextToClipboard').mockResolvedValue()
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }) as unknown as typeof fetch

    await renderSkillMenu().copySkill()

    expect(copySpy).not.toHaveBeenCalled()
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('404'))
  })
})

describe('SkillMenu.openSkillsMd', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does nothing if the safety disclaimer is declined', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    renderSkillMenu().openSkillsMd()

    expect(openSpy).not.toHaveBeenCalled()
  })

  it('opens SKILLS.md in a new tab once the disclaimer is accepted', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    renderSkillMenu().openSkillsMd()

    expect(openSpy).toHaveBeenCalledWith('SKILLS.md', '_blank')
  })
})
