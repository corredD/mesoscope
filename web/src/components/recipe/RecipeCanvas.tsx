/**
 * The Recipe View panel (recipe-view.md): the recipe tree drawn as legacy's D3 canvas drew it (§2), rebuilt on
 * Dragology (§10.1) with the layout a pure function of the tree (§10.2). This component owns the view state (geometry
 * only), keeps it in step with the store (§1.9: no repack on edits), and handles what is not a drag: hover, click,
 * Ctrl-click, wheel and middle-drag zoom/pan, the context menu (§4, §7), and the screen-space overlays (popup and root
 * label, §2.7-§2.8).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { DraggableRenderer } from 'dragology'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomTransform } from 'd3-zoom'
import { useRecipeStore } from '../../state/recipeStore'
import { useThemeStore } from '../../state/themeStore'
import { useUiModeStore } from '../../state/uiModeStore'
import type { IngredientData, RecipeGraph, RecipeLink, RecipeNode } from '../../domain/recipe/types'
import { resolveSpriteImageUrl } from '../../domain/pdb/structureSource'
import { colorNode, colorNodeInfos, prepareColors } from '../../domain/recipe/view/colors'
import { dropReparent } from '../../domain/recipe/view/drag'
import { hitLink, hitNode } from '../../domain/recipe/view/hitTest'
import { DEFAULT_OPTIONS, layoutRecipe, reconcileView } from '../../domain/recipe/view/layout'
import { absolutePositions, indexGraph, viewId, type Point, type ViewState } from '../../domain/recipe/view/viewState'
import { applyPush, makeRecipeDraggable, type DrawLink } from './recipeDraggable'
import { useSpriteVersion } from './spriteCache'
import { Button } from '../ui/Button'
import './RecipeCanvas.css'

const DEFAULT_SIZE = { width: 600, height: 600 }

const linkKeys = new WeakMap<RecipeLink, string>()
let nextLinkKey = 0
function linkKey(link: RecipeLink): string {
  let key = linkKeys.get(link)
  if (!key) linkKeys.set(link, (key = String(nextLinkKey++)))
  return key
}

function rgbList(color: number[] | null | undefined): string | null {
  return color && color.length >= 3 ? `rgb(${Math.floor(color[0] * 255)},${Math.floor(color[1] * 255)},${Math.floor(color[2] * 255)})` : null
}

function toHex(color: string): string {
  const m = /rgba?\((\d+)\D+(\d+)\D+(\d+)/.exec(color)
  if (!m) return '#808080'
  return '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('')
}

/** Natural size of an image once loaded, null until then or on error (legacy draws a thumbnail only when loaded). */
function useImageSize(url: string | null): { width: number; height: number } | null {
  const [size, setSize] = useState<{ url: string; width: number; height: number } | null>(null)
  useEffect(() => {
    if (!url) return
    let live = true
    const img = new Image()
    img.onload = () => live && setSize({ url, width: img.naturalWidth, height: img.naturalHeight })
    img.src = url
    return () => {
      live = false
    }
  }, [url])
  return size && size.url === url && size.width > 0 && size.height > 0 ? size : null
}

interface Sync {
  graph: RecipeGraph | null
  layoutKey: string
  view: ViewState | null
  /** The graph as loaded: the root label's `*` shows once it changes (§2.7, row 35). */
  loaded: RecipeGraph | null
}

type PickedLink = DrawLink & { link: RecipeLink }

export function RecipeCanvas() {
  const graph = useRecipeStore((s) => s.graph)
  const theme = useThemeStore((s) => s.theme)
  const selectedNode = useRecipeStore((s) => s.selectedNode)
  const selectedLink = useRecipeStore((s) => s.selectedLink)
  const ui = useUiModeStore()
  const spriteVersion = useSpriteVersion()

  const stageRef = useRef<HTMLDivElement>(null)
  // Null until measured: the first layout waits for the panel's size (jsdom measures 0: the default).
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null)
  const size = measured ?? DEFAULT_SIZE
  const setSize = setMeasured
  const [view, setView] = useState<ZoomTransform>(zoomIdentity)
  const viewRef = useRef(view)
  viewRef.current = view
  const [hovered, setHovered] = useState<string | null>(null)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null)
  const ctrlAtPress = useRef(false)
  const press = useRef<{ x: number; y: number } | null>(null)

  // View state in step with the store: a new recipe or a new size/scale/grouping lays out again; any other edit
  // keeps every position (§1.9). New nodes appear at the canvas centre with legacy's radius (§7.1-§7.2, §8.18).
  const layoutKey = `${ui.sizeBy}|${ui.radiusScale}|${ui.groupBy ?? ''}`
  const [sync, setSync] = useState<Sync>({ graph: null, layoutKey, view: null, loaded: null })
  let current = sync
  if (measured && (graph !== sync.graph || layoutKey !== sync.layoutKey)) {
    const newRoot = !sync.view || !graph || sync.graph?.nodes[0] !== graph.nodes[0]
    const center = { x: size.width / 2, y: size.height / 2 }
    let next: ViewState | null = null
    if (graph?.nodes.length) {
      // More than one node at once is an append (merge): legacy re-packs the whole recipe then (main.js:5696-5718).
      const merged = !newRoot && graph.nodes.filter((node) => !sync.view!.nodes[viewId(node)]).length > 1
      if (newRoot || merged || layoutKey !== sync.layoutKey) {
        const keep = !newRoot && sync.view ? sync.view.nodes[sync.view.order[0]] : null
        next = layoutRecipe(graph, { sizeBy: ui.sizeBy, radiusScale: ui.radiusScale, groupBy: ui.groupBy, center: keep ? { x: keep.x, y: keep.y } : center })
      } else next = reconcileView(sync.view!, graph, center, (node) => (node.children ? 150 : 30))
    }
    current = { graph, layoutKey, view: next, loaded: newRoot ? graph : sync.loaded }
    setSync(current)
  }
  const state = current.view

  const index = useMemo(() => (graph ? indexGraph(graph) : new Map<string, RecipeNode>()), [graph])
  // The multi-selection drops nodes that left the recipe (deleted, or another recipe loaded).
  useEffect(() => {
    const { selectedNodes, setSelection } = useUiModeStore.getState()
    const live = new Set(graph?.nodes ?? [])
    if (selectedNodes.some((node) => !live.has(node))) setSelection(selectedNodes.filter((node) => live.has(node)))
  }, [graph])
  const prepared = useMemo(() => {
    if (!graph?.nodes.length) return null
    const infos = colorNodeInfos(graph.nodes[0])
    const prep = prepareColors(infos, ui.colorMode, ui.minColor, ui.maxColor, ui.useColorMapping, ui.visitedNodes, ui.categoryColors)
    return { prep, colors: new Map(infos.map((info) => [viewId(info.node), colorNode(info, prep)])) }
  }, [graph, ui.colorMode, ui.minColor, ui.maxColor, ui.useColorMapping, ui.visitedNodes, ui.categoryColors])

  const links: PickedLink[] = useMemo(
    () => (graph?.links ?? []).map((link) => ({ key: linkKey(link), source: viewId(link.source), target: viewId(link.target), link })),
    [graph],
  )

  // The panel's size before the first layout, so the root sits at its centre (legacy's pack centre, §1.1).
  useLayoutEffect(() => {
    const rect = stageRef.current?.getBoundingClientRect()
    setSize(rect && rect.width > 0 && rect.height > 0 ? { width: Math.round(rect.width), height: Math.round(rect.height) } : DEFAULT_SIZE)
  }, [setSize])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize({ width: Math.round(width), height: Math.round(height) })
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [setSize])

  // Wheel and double-click zoom anywhere, middle-drag pans; left presses belong to the nodes (§4.2, rows 51-55).
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const behavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.2, 20])
      .filter((e: Event) => e.type === 'wheel' || e.type === 'dblclick' || (e.type === 'mousedown' && (e as MouseEvent).button === 1))
      .wheelDelta((e: WheelEvent) => (-e.deltaY * (e.deltaMode ? 120 : 1)) / 500)
      .on('zoom', (e: { transform: ZoomTransform; sourceEvent: Event | null }) => {
        if ((e.sourceEvent as MouseEvent | null)?.ctrlKey) setHovered(null)
        setView(e.transform)
      })
    select(stage).call(behavior)
    // Dragology starts a drag on any button; only the left one drags a node (§4.2).
    const capture = (e: PointerEvent) => {
      if (e.button === 0) ctrlAtPress.current = e.ctrlKey || e.metaKey
      else e.stopPropagation()
    }
    stage.addEventListener('pointerdown', capture, true)
    return () => {
      stage.removeEventListener('pointerdown', capture, true)
      select(stage).on('.zoom', null)
    }
  }, [])

  const toWorld = (e: { clientX: number; clientY: number }): Point => {
    const rect = stageRef.current!.getBoundingClientRect()
    const [x, y] = viewRef.current.invert([e.clientX - rect.left, e.clientY - rect.top])
    return { x, y }
  }

  const pick = (p: Point): { node: string; link: PickedLink | null } | null => {
    if (!state) return null
    const abs = absolutePositions(state)
    const node = hitNode(state, abs, p)
    const link = hitLink(state, abs, links, p, node)
    return { node, link: link >= 0 ? links[link] : null }
  }

  /** Legacy's drag start + drag end without movement (§4.5): what a click, or a drop, selects. */
  const choose = (id: string, ctrl: boolean, link: PickedLink | null) => {
    const store = useRecipeStore.getState()
    const uiStore = useUiModeStore.getState()
    if (link) {
      store.selectLink(link.link)
      uiStore.setSelection([link.link.source, link.link.target])
      return
    }
    const node = index.get(id)
    if (!node || !node.parent) {
      store.selectNode(null)
      uiStore.clearSelection()
      return
    }
    if (node.children) {
      // A compartment is selected in view mode (and is the multi-selection, oracle), deselects in Edit Mode (row 64).
      store.selectNode(uiStore.editMode ? null : node)
      uiStore.setSelection(uiStore.editMode ? [] : [node])
      return
    }
    store.selectNode(node)
    store.selectLink(null)
    if (ctrl) uiStore.addToSelection(node)
    else uiStore.setSelection([node])
    uiStore.markVisited(node)
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    // A press in the context menu is the menu's, not a click on the canvas under it.
    const inMenu = !!(e.target as Element).closest?.('.recipe-canvas-context-menu')
    press.current = e.button === 0 && !inMenu ? { x: e.clientX, y: e.clientY } : null
    if (!inMenu) setMenu(null)
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    const start = press.current
    press.current = null
    if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 2) return
    const hit = pick(toWorld(e))
    if (hit) choose(hit.node, e.ctrlKey || e.metaKey, hit.link)
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (e.buttons || !state) return
    const hit = pick(toWorld(e))
    const node = hit && state.nodes[hit.node].parent ? hit.node : null
    const link = hit?.link?.key ?? null
    if (node !== hovered) setHovered(node)
    if (link !== hoveredLink) setHoveredLink(link)
  }
  const onContextMenu = (e: ReactMouseEvent) => {
    e.preventDefault()
    if (e.ctrlKey && e.button === 0) return // macOS Ctrl-click is a multi-select (§4.2)
    const hit = pick(toWorld(e))
    // A link or the empty canvas opens no menu, so nothing deletes the root (§10.6, §8.12).
    if (!hit || hit.link || !index.get(hit.node)?.parent) return
    setMenu({ x: e.clientX, y: e.clientY, id: hit.node })
  }

  const onDropState = (dropped: ViewState) => {
    const store = useRecipeStore.getState()
    if (dropped.drag) {
      const id = dropped.drag.id
      const drop = dropReparent(dropped, id)
      setSync((s) => ({ ...s, view: drop.state }))
      const node = index.get(id)!
      if (drop.surface !== null && drop.surface !== !!(node.data as IngredientData).surface) store.updateIngredient(node, { surface: drop.surface })
      if (drop.newParent) store.reparentNode(node, index.get(drop.newParent)!)
      choose(id, false, null)
    } else {
      setSync((s) => ({ ...s, view: applyPush(dropped) }))
      if (dropped.push) choose(dropped.push.id, false, null)
    }
  }

  const selectedId = selectedNode ? viewId(selectedNode) : null
  const draggable = useMemo(() => {
    if (!graph || !prepared || !graph.nodes.length || spriteVersion < 0) return null
    const root = graph.nodes[0]
    const prep = prepared.prep
    const legendShown = ui.showLegend && !ui.useColorMapping && !DEFAULT_OPTIONS.has(ui.colorMode) && prep.uniqueValues
    return makeRecipeDraggable({
      index,
      colors: prepared.colors,
      links,
      view: { x: view.x, y: view.y, k: view.k },
      width: size.width,
      height: size.height,
      // §10.3: the dark theme's background, else the root colour; legacy sets a missing one to [.88,.88,.88] (§2.2).
      background: theme === 'dark' ? 'var(--color-recipe-canvas-bg)' : (rgbList(root.data.color) ?? 'rgb(224,224,224)'),
      hovered,
      hoveredLink,
      selected: selectedId,
      selection: ui.selectedNodes.map(viewId),
      selectedLink: selectedLink ? linkKey(selectedLink) : null,
      editMode: ui.editMode,
      ctrlAtPress,
      labelOption: ui.labelBy,
      showSprites: ui.showSprites,
      strokeWidth: ui.strokeWidth,
      legend: legendShown ? { entries: prep.uniqueValues!.map((label, i) => ({ label, color: prep.categoryColors![i] })), ...ui.legend, ypad: 5 } : null,
    })
  }, [spriteVersion, graph, prepared, index, links, view, size, theme, hovered, hoveredLink, selectedId, selectedLink, ui.selectedNodes, ui.editMode, ui.labelBy, ui.showSprites, ui.strokeWidth, ui.showLegend, ui.useColorMapping, ui.colorMode, ui.legend])

  const root = graph?.nodes[0]
  // The popup: the selected leaf, else the hovered one when the selection is empty or a compartment (§2.8).
  const hoveredNode = hovered ? index.get(hovered) : undefined
  const popupNode = selectedNode && !selectedNode.children ? selectedNode : hoveredNode && !hoveredNode.children ? hoveredNode : null
  const menuNode = menu ? index.get(menu.id) : undefined

  return (
    <div
      ref={stageRef}
      className="recipe-canvas-stage"
      data-canvas-theme={theme}
      onPointerDownCapture={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHovered(null)}
      onContextMenu={onContextMenu}
    >
      {!graph && <p className="panel-note">No recipe loaded. Use Load to open a recipe.</p>}
      {state && draggable && <DraggableRenderer draggable={draggable} state={state} onDropState={onDropState} width={size.width} height={size.height} />}
      {root && <ScreenOverlay width={size.width} height={size.height} rootName={root.data.name + (graph !== current.loaded ? '*' : '')} popup={popupNode} />}
      {menu && menuNode && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          node={menuNode}
          viewR={state?.nodes[menu.id]?.r ?? 0}
          fill={prepared?.colors.get(menu.id) ?? 'rgb(128,128,128)'}
          categorical={!!prepared?.prep.uniqueValues && !ui.useColorMapping}
          onClose={() => setMenu(null)}
          onResize={(r) => setSync((s) => (s.view ? { ...s, view: { ...s.view, nodes: { ...s.view.nodes, [menu.id]: { ...s.view.nodes[menu.id], r } } } } : s))}
        />
      )}
    </div>
  )
}

/** Screen-space marks: the root label bottom-left (§2.7) and the thumbnail popup (§2.8, row 41). */
function ScreenOverlay({ width, height, rootName, popup }: { width: number; height: number; rootName: string; popup: RecipeNode | null }) {
  const data = popup?.data as IngredientData | undefined
  const url = data ? resolveSpriteImageUrl(data.sprite?.image ?? null, data.source?.pdb) : null
  const image = useImageSize(url)
  let box: ReactNode = null
  if (data && url && image) {
    const w = 150
    const h = w / (image.width / image.height)
    const x = width / 2 - w - 10
    const y = height - h - 10
    const sc2d = (Number(data.sprite?.scale2d) || 1) * (w / image.width)
    const offy = -(Number(data.sprite?.offsety) || 0) * sc2d
    const lengthy = -(Number(data.sprite?.lengthy) || 0) * sc2d
    const fiber = data.ingtype === 'fiber'
    box = (
      <g className="recipe-canvas-popup" data-popup={data.name}>
        <rect x={x} y={y} width={w} height={h} fill="none" stroke="black" />
        <text x={x} y={y} fontSize={10} fontFamily="Georgia">
          {data.name.replace(/,? and /g, ' & ')}
        </text>
        {!fiber && <image href={url} x={x} y={y} width={w} height={h} />}
        {fiber && <image href={url} x={x - lengthy / 2} y={y} width={w} height={h} />}
        {fiber && <image href={url} x={x + lengthy / 2} y={y} width={w} height={h} />}
        {data.surface &&
          (
            [
              ['green', 0],
              ['red', -21],
              ['blue', 21],
            ] as const
          ).map(([color, dy]) => <line key={color} x1={x} x2={x + w} y1={y + h / 2 - offy + dy * sc2d} y2={y + h / 2 - offy + dy * sc2d} stroke={color} strokeWidth={2} />)}
      </g>
    )
  }
  return (
    <svg className="recipe-canvas-overlay" width={width} height={height}>
      <text x={5} y={height - 20} fontSize={20} fontFamily="Georgia" fill="black" data-root-label="">
        {rootName}
      </text>
      {box}
    </svg>
  )
}

interface ContextMenuProps {
  x: number
  y: number
  node: RecipeNode
  viewR: number
  fill: string
  categorical: boolean
  onClose: () => void
  onResize: (r: number) => void
}

/** Colour, rename, delete, resize (§7, rows 70-75). */
function ContextMenu({ x, y, node, viewR, fill, categorical, onClose, onResize }: ContextMenuProps) {
  const store = useRecipeStore.getState()
  const ui = useUiModeStore.getState()
  const value = (node.data as Record<string, unknown>)[ui.colorMode]
  const rename = () => {
    const name = window.prompt('Please enter new name', node.data.name)
    if (name !== null) store.renameNode(node, name)
    onClose()
  }
  const remove = () => {
    // A compartment goes with its subtree and its links (§10.6, §8.11).
    if (node.children) store.deleteCompartment(node)
    else store.deleteIngredient(node)
    onClose()
  }
  const resize = () => {
    const answer = window.prompt('Please enter new size', String(viewR))
    const r = answer === null ? NaN : parseFloat(answer)
    if (!Number.isNaN(r)) {
      onResize(r)
      if (!node.children) store.updateIngredient(node, { size: r })
    }
    onClose()
  }
  return (
    <div className="recipe-canvas-context-menu" style={{ left: x, top: y }}>
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
