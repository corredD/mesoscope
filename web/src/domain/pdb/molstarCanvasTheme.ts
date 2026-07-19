import { PluginCommands } from 'molstar/lib/mol-plugin/commands.js'
import type { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context.js'
import { Color } from 'molstar/lib/mol-util/color/index.js'
import type { Theme } from '../../state/themeStore'

/** Kept in sync with `--color-molstar-canvas-bg` in `styles/theme.css`. */
export const MOLSTAR_CANVAS_BACKGROUND: Record<Theme, number> = {
  light: 0xffffff,
  dark: 0x1c1f24,
}

/**
 * Applies only the WebGL renderer background, preserving the camera, lighting, postprocessing,
 * and every structure representation. The function-form command is the Mol* supported way to
 * update one nested Canvas3D setting without replacing the rest of the renderer configuration.
 */
export function setMolstarCanvasTheme(plugin: PluginUIContext, theme: Theme) {
  return PluginCommands.Canvas3D.SetSettings(plugin, {
    settings: (props) => {
      props.renderer.backgroundColor = Color(MOLSTAR_CANVAS_BACKGROUND[theme])
    },
  })
}
