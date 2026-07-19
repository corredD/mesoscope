import { PluginCommands } from 'molstar/lib/mol-plugin/commands.js'
import type { Canvas3DProps } from 'molstar/lib/mol-canvas3d/canvas3d.js'
import type { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context.js'
import { Color } from 'molstar/lib/mol-util/color/index.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOLSTAR_CANVAS_BACKGROUND, setMolstarCanvasTheme } from '../src/domain/pdb/molstarCanvasTheme'

afterEach(() => vi.restoreAllMocks())

describe('setMolstarCanvasTheme', () => {
  it.each(['light', 'dark'] as const)('updates only the nested renderer background for %s mode', async (theme) => {
    const setSettings = vi.spyOn(PluginCommands.Canvas3D, 'SetSettings').mockResolvedValue(undefined)
    const plugin = {} as PluginUIContext

    await setMolstarCanvasTheme(plugin, theme)

    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(setSettings.mock.calls[0][0]).toBe(plugin)
    const settings = setSettings.mock.calls[0][1].settings
    expect(settings).toBeTypeOf('function')
    const props = { renderer: { backgroundColor: Color(0) } } as Canvas3DProps
    if (typeof settings === 'function') settings(props)
    expect(props.renderer.backgroundColor).toBe(Color(MOLSTAR_CANVAS_BACKGROUND[theme]))
  })
})
