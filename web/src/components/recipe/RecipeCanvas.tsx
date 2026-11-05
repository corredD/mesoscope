/**
 * The Recipe View panel (recipe-view.md): legacy's D3 canvas re-ported (§10.1-§10.2). One `<canvas>` drawn by
 * `drawFrame` on every simulation step, one `RecipeSimulation` with legacy's forces, d3-drag and d3-zoom bound as
 * legacy binds them (§4.1). This component keeps the simulation's nodes in step with the store (§1.9: edits never
 * repack) and owns the frame loop; hover and drag state live in refs, so a pointer move never re-renders React.
 */
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useRecipeStore } from '../../state/recipeStore'
import { useThemeStore } from '../../state/themeStore'
import { useUiModeStore } from '../../state/uiModeStore'
import { colorNode, colorNodeInfos, prepareColors } from '../../domain/recipe/view/colors'
import { hitLink, hitNode } from '../../domain/recipe/view/hitTest'
import { DEFAULT_OPTIONS } from '../../domain/recipe/view/layout'
import type { SimNode } from '../../domain/recipe/view/simulation'
import { RecipeView, bindGestures, rgbList, type RecipeViewProbe } from './recipeView'
import { onSpriteLoad } from './spriteCache'
import { Button } from '../ui/Button'
import './RecipeCanvas.css'

function toHex(color: string): string {
  const m = /rgba?\((\d+)\D+(\d+)\D+(\d+)/.exec(color)
  if (!m) return '#808080'
  return '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('')
}

export function RecipeCanvas() {
  const graph = useRecipeStore((s) => s.graph)
  const selectedNode = useRecipeStore((s) => s.selectedNode)
  const selectedLink = useRecipeStore((s) => s.selectedLink)
  const theme = useThemeStore((s) => s.theme)
  const ui = useUiModeStore()

  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [view] = useState(() => new RecipeView())
  const [menu, setMenu] = useState<{ x: number; y: number; node: SimNode } | null>(null)

  // The canvas first: its size seeds the first layout (legacy's pack is the panel's size at mount, §1.1). Then HiDPI
  // (§10.1), gestures (§4.1), the frame loop.
  useEffect(() => {
    const stage = stageRef.current!
    const canvas = canvasRef.current!
    view.ctx = canvas.getContext('2d')
    const fit = (width: number, height: number) => {
      // §2.11: the bitmap follows the panel; no repack, the transform kept.
      const dpr = window.devicePixelRatio || 1
      view.scene.width = width
      view.scene.height = height
      view.scene.dpr = dpr
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      view.request()
    }
    const rect = stage.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) fit(rect.width, rect.height)
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect
            if (width > 0 && height > 0) fit(width, height)
          })
    observer?.observe(stage)
    const unbind = bindGestures(canvas, view, () => setMenu(null))
    ;(stage as unknown as { __recipeView: RecipeViewProbe }).__recipeView = {
      nodes: () =>
        view.scene.nodes.map((n) => ({ name: n.node.data.name, depth: n.depth, r: n.r, x: n.x, y: n.y, leaf: n.leaf, surface: n.surface, parent: n.parent?.node.data.name ?? null })),
      transform: () => ({ x: view.transform.x, y: view.transform.y, k: view.transform.k }),
      hot: () => view.sim.hot,
      frames: () => view.frames,
    }
    view.request()
    return () => {
      observer?.disconnect()
      unbind()
      if (view.frame) cancelAnimationFrame(view.frame)
      view.frame = 0
      view.ctx = null
    }
  }, [view])

  // Store → simulation. Order matters: the graph first, then what reads its nodes.
  useEffect(() => {
    const { sizeBy, radiusScale, groupBy } = useUiModeStore.getState()
    view.sync(graph, { sizeBy, radiusScale, groupBy })
    // The multi-selection drops nodes that left the recipe (deleted, or another recipe loaded).
    const { selectedNodes, setSelection } = useUiModeStore.getState()
    const live = new Set(graph?.nodes ?? [])
    if (selectedNodes.some((node) => !live.has(node))) setSelection(selectedNodes.filter((node) => live.has(node)))
    if (view.scene.hovered && !live.has(view.scene.hovered.node)) view.scene.hovered = null
    view.request()
  }, [graph, view])

  useEffect(() => {
    view.resize(ui.sizeBy, ui.radiusScale)
    view.request()
  }, [ui.sizeBy, ui.radiusScale, view])

  useEffect(() => {
    view.cluster(ui.groupBy)
    view.sim.heat()
    view.request()
  }, [ui.groupBy, view])

  useEffect(() => {
    view.sim.setForces(ui.forces)
    view.request()
  }, [ui.forces, view])

  // Colours (§6): prepared once per mode or recipe change, never per frame.
  useEffect(() => {
    view.fills.clear()
    const s = view.scene
    if (graph?.nodes.length) {
      const infos = colorNodeInfos(graph.nodes[0])
      const prep = prepareColors(infos, ui.colorMode, ui.minColor, ui.maxColor, ui.useColorMapping, ui.visitedNodes, ui.categoryColors)
      view.prep = prep
      for (const info of infos) {
        const n = view.index.get(info.node)
        if (n) view.fills.set(n, colorNode(info, prep))
      }
      const entries = prep.uniqueValues ? prep.uniqueValues.map((label, i) => ({ label, color: prep.categoryColors![i] })) : null
      if (entries) view.lastLegend = entries
      // §2.9: the categorical legend when the mapping is off; the last one in `color` mode with "Show latest legends".
      if (!ui.useColorMapping && !DEFAULT_OPTIONS.has(ui.colorMode) && entries) s.legend = { entries, ...ui.legend, ypad: 5 }
      else if (ui.colorMode === 'color' && ui.showLegend && view.lastLegend) s.legend = { entries: view.lastLegend, ...ui.legend, ypad: 5 }
      else s.legend = null
      // §10.3: the dark theme's background, else the root colour; legacy sets a missing one to [.88,.88,.88] (§2.2).
      const css = stageRef.current ? getComputedStyle(stageRef.current).getPropertyValue('--color-recipe-canvas-bg').trim() : ''
      s.background = theme === 'dark' ? css || '#171a1f' : (rgbList(graph.nodes[0].data.color) ?? 'rgb(224,224,224)')
      s.rootLabel = graph.nodes[0].data.name + (graph !== view.loaded ? '*' : '')
    }
    view.request()
  }, [graph, view, theme, ui.colorMode, ui.minColor, ui.maxColor, ui.useColorMapping, ui.visitedNodes, ui.categoryColors, ui.showLegend, ui.legend])

  // Interaction state the frame reads (§2.6).
  useEffect(() => {
    const s = view.scene
    s.selected = selectedNode ? (view.index.get(selectedNode) ?? null) : null
    s.selectedLink = selectedLink ? (view.linkIndex.get(selectedLink) ?? null) : null
    s.selection = ui.selectedNodes.map((n) => view.index.get(n)).filter((n): n is SimNode => !!n)
    s.editMode = ui.editMode
    s.labelOption = ui.labelBy
    s.strokeWidth = ui.strokeWidth
    view.showSprites = ui.showSprites
    view.request()
  }, [graph, view, selectedNode, selectedLink, ui.selectedNodes, ui.editMode, ui.labelBy, ui.strokeWidth, ui.showSprites])

  useEffect(() => onSpriteLoad(view.request), [view])

  const onContextMenu = (e: ReactMouseEvent) => {
    e.preventDefault()
    if (e.ctrlKey && e.button === 0) return // macOS Ctrl-click is a multi-select (§4.2)
    const canvas = canvasRef.current
    if (!canvas || !view.scene.nodes.length) return
    const r = canvas.getBoundingClientRect()
    const [x, y] = view.transform.invert([e.clientX - r.left, e.clientY - r.top])
    const node = hitNode(view.scene.nodes, x, y)
    // A link or the empty canvas opens no menu, so nothing deletes the root (§10.7, §8.12).
    if (hitLink(view.scene.links, x, y, node) || !node.parent) return
    const stage = stageRef.current!.getBoundingClientRect()
    setMenu({ x: e.clientX - stage.left, y: e.clientY - stage.top, node })
  }

  return (
    <div ref={stageRef} className="recipe-canvas-stage" data-canvas-theme={theme} onContextMenu={onContextMenu}>
      <canvas ref={canvasRef} className="recipe-canvas" data-testid="recipe-canvas" />
      {!graph && <p className="panel-note recipe-canvas-empty">No recipe loaded. Use Load to open a recipe.</p>}
      {menu && graph?.nodes.includes(menu.node.node) && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          node={menu.node}
          fill={view.fills.get(menu.node) ?? 'rgb(128,128,128)'}
          categorical={!!view.prep?.uniqueValues && !ui.useColorMapping}
          onClose={() => setMenu(null)}
          onResize={(r) => {
            menu.node.r = r
            view.cache.reset()
            view.sim.updateForce()
            view.sim.heat()
            view.request()
          }}
        />
      )}
    </div>
  )
}

interface ContextMenuProps {
  x: number
  y: number
  node: SimNode
  fill: string
  categorical: boolean
  onClose: () => void
  onResize: (r: number) => void
}

/** Colour, rename, delete, resize (§7, rows 70-75). From lane `recipe-view-port` (a0d0146). */
function ContextMenu({ x, y, node: sim, fill, categorical, onClose, onResize }: ContextMenuProps) {
  const node = sim.node
  const store = useRecipeStore.getState()
  const ui = useUiModeStore.getState()
  const value = (node.data as Record<string, unknown>)[ui.colorMode]
  const rename = () => {
    const name = window.prompt('Please enter new name', node.data.name)
    if (name !== null) store.renameNode(node, name)
    onClose()
  }
  const remove = () => {
    // A compartment goes with its subtree and its links (§10.7, §8.11).
    if (node.children) store.deleteCompartment(node)
    else store.deleteIngredient(node)
    onClose()
  }
  const resize = () => {
    const answer = window.prompt('Please enter new size', String(sim.r))
    const r = answer === null ? NaN : parseFloat(answer)
    if (!Number.isNaN(r)) {
      onResize(r)
      if (!node.children) store.updateIngredient(node, { size: r })
    }
    onClose()
  }
  return (
    <div className="recipe-canvas-context-menu" style={{ left: x, top: y }} onPointerDown={(e) => e.stopPropagation()}>
      <div className="recipe-canvas-context-menu-title">{node.data.name}</div>
      <label>
        Color
        <input
          type="color"
          aria-label="Node color"
          defaultValue={toHex(categorical ? fill : (rgbList(node.data.color) ?? fill))}
          onChange={(e) => {
            // In a categorical mode the colour is the category's (row 72), else the node's own.
            if (categorical) ui.setCategoryColor(ui.colorMode, value == null ? '' : String(value), e.target.value)
            else store.setNodeColor(node, e.target.value)
          }}
        />
      </label>
      <Button variant="menu" size="sm" onClick={rename}>
        Rename
      </Button>
      <Button variant="danger" size="sm" onClick={remove}>
        Delete
      </Button>
      <Button variant="menu" size="sm" onClick={resize}>
        Resize
      </Button>
    </div>
  )
}
