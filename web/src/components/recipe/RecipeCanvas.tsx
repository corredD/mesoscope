import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useRecipeStore } from '../../state/recipeStore'
import { useThemeStore } from '../../state/themeStore'
import { useUiModeStore } from '../../state/uiModeStore'
import { ancestorsSelfFirst, isIngredientNode, nodeKey, type CompartmentData, type IngredientData, type RecipeNode } from '../../domain/recipe/types'
import { type PackedNode } from '../../domain/recipe/computeRecipeLayout'
import { useRecipeSimulation } from '../../domain/recipe/useRecipeSimulation'
import { computePropertyMapping } from '../../domain/recipe/propertyMapping'
import { BUILTIN_COLOR_MODES, computeCategoricalPalette, resolveFillColor, type ColorModeContext } from '../../domain/recipe/colorModes'
import { resolveSpriteImageUrl } from '../../domain/pdb/structureSource'
import { Button } from '../ui/Button'
import './RecipeCanvas.css'

/**
 * Replaces the "Recipe View" text-summary placeholder with the actual
 * hierarchy visualization — the modern equivalent of js/main.js's
 * `update_graph`/`ticked` canvas (main.js:5565-5628, 3892-4042).
 *
 * Native reimplementation over legacy wrap, same reasoning as RecipeTable.tsx
 * and the PDB search panels: legacy's canvas reads/writes the global `graph`
 * directly (drag-to-reparent mutates it in place, `node_selected` etc.),
 * which conflicts with recipeStore being the single source of truth. Built
 * with the npm `d3` package instead of the bundled `extras`'s D3 v4 global.
 *
 * Legacy draws on a single 2D `<canvas>`; this draws SVG circles instead —
 * simpler to keep declarative in React, and at recipe-sized node counts
 * (tens to low hundreds) SVG's per-element overhead isn't a real concern.
 * Confirmed with the user over a canvas-2D rewrite when this file switched
 * from a bounded one-shot layout to a live simulation (see below) — reuses
 * the sprite/label/legend/context-menu JSX almost entirely unchanged.
 *
 * **Live physics, not a one-shot snapshot.** Position — `d3.hierarchy` +
 * `d3.pack` circle-packing plus a genuinely live, continuously-ticking
 * `d3.forceSimulation` for the surface/cluster/parent-containment/link
 * forces — is owned by `useRecipeSimulation` (see that file's docstring for
 * the full live-simulation architecture and why an earlier bounded-tick
 * version made every control change "snap" instead of visibly flow). This
 * component's job is split cleanly along that hook's own core principle:
 * **React owns appearance, the hook's tick handler owns geometry,
 * imperatively.** Every leaf's `<g>` and every link's `<line>`/
 * `<linearGradient>` gets its position (`transform`/`x1,y1,x2,y2`) written
 * directly via `hook.getNodeRef`/`getLinkLineRef`/`getLinkGradientRef` —
 * stable, cached ref-callbacks, NOT inline closures (an inline `(el) => ...`
 * would get a new identity every render, causing React to re-fire it on
 * every unrelated re-render and re-stamp a stale initial position, fighting
 * the tick handler) — and `transform`/`x1..y2` are deliberately NOT set as
 * ordinary React JSX props on these elements, so React's reconciliation
 * never touches (or fights) them once mounted. Compartments use the same
 * `getNodeRef` mechanism; the hook updates the whole packed subtree
 * imperatively when a compartment is dragged.
 *
 * Compartments as rings, ingredients as filled circles nested inside, sized
 * by `sizeBy` (see `computeRecipeLayout`) and colored via `resolveFillColor`
 * (`colorModes.ts` — the full 16-mode legacy `ChangeCanvasColor`/`colorNode`
 * port). Click feeds `recipeStore.selectNode` and `uiModeStore.markVisited`
 * (the "viewed" color mode's visited-flag); Ctrl+click in Edit Mode feeds
 * `uiModeStore.toggleNodeSelection` instead (multi-select for "Add
 * interaction"). Basic zoom/pan via `d3.zoom`, layered independently on top
 * of the hook's per-node transforms (`d3.zoom` only ever writes the outer
 * `<g ref={zoomGroupRef}>` transform; the hook writes inner, per-node
 * transforms nested inside it — two independent, multiplicatively-stacking
 * transform layers, no conflict). `graph.links` render as lines between
 * live-resolved endpoints. Every non-root node is directly draggable; Edit
 * Mode adds persistent drag-to-reparent behavior. Pointer events call
 * `hook.pin(node, x, y)` rather than setting React-rendered coordinates —
 * ingredients reheat the simulation and compartments move as rigid subtrees.
 * `event.stopPropagation()` on pointer-down still prevents `d3.zoom`'s own
 * pan handling from also firing on the same gesture.
 *
 * Also ported (the "full 1:1 parity" follow-up to the Edit Mode slice above):
 * sprite/thumbnail images (`resolveSpriteImageUrl`, SVG `<image>` — fiber
 * ingredients repeat it 3x, surface ingredients get 3 membrane marker lines,
 * a larger popup thumbnail renders for the selected ingredient), curved
 * compartment name labels (native SVG `<textPath>` on a semicircular arc,
 * replacing legacy's manual per-character canvas rotation — SVG has this
 * built in), the ingredient "Node label" dropdown + its `transform.k > 1.5`
 * zoom-dependent visibility threshold, the canvas background color (root's
 * `data.color`, defaulting to legacy's light-grey fallback), and a
 * categorical-mode color legend. The membrane-marker and fiber-image
 * spacing are deliberately a fixed fraction of each ingredient's own
 * (variable) circle radius rather than legacy's angstrom-precise `offsety`/
 * `scale2d` conversion — that conversion was calibrated for a fixed-size
 * screen-space popup panel, not a small in-context circle, so reusing it
 * literally wouldn't produce a meaningful result here. Interaction lines also
 * gradient-blend between their two endpoints' resolved colors via an SVG
 * `<linearGradient>` per link (legacy's `DrawConnections`,
 * main.js:3765-3800) — a selected link stays a flat orange highlight rather
 * than also gradient-blended, matching legacy's own selected-link treatment.
 * Node hover (`onMouseEnter`/`Leave`) is a black-outline highlight distinct
 * from click-selection (legacy's `d.highlight`/`Highlight`,
 * main.js:3672-3690) — it also forces the ingredient label to show
 * regardless of the zoom threshold and takes over the popup thumbnail from
 * whatever's selected, both matching legacy's own `d.highlight ||
 * transform.k > 1.5` / `node_selected or node_over` conditions.
 *
 * NOT ported: link mouseover-highlight (legacy's `d.highlight` on
 * `DrawConnections`, a separate hover-tracking mechanism this canvas has no
 * equivalent entry point for — links have no pointer handlers today).
 */

const DEFAULT_WIDTH = 600
const DEFAULT_HEIGHT = 600
/** Ingredient labels only render past this zoom level (unless selected) — legacy's
 *  `transform.k > 1.5` gate in `DrawLabels` (main.js:3828). */
const LABEL_ZOOM_THRESHOLD = 1.5
/** Compartments smaller than this skip their curved name label — legacy's `fontSizeTitle > 4`
 *  gate (main.js: `fontSizeTitle = Math.round(d.r / 10)`), i.e. `r > 40`. */
const MIN_LABEL_RADIUS = 40
const DEFAULT_BACKGROUND = 'rgb(225, 225, 225)'

const BUILTIN_COLOR_MODES_SET = new Set<string>(BUILTIN_COLOR_MODES)

function explicitColor(color: number[] | null | undefined): string | null {
  if (!color || color.length < 3) return null
  const [r, g, b] = color
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
}

/** Same source data as `explicitColor` but as `#rrggbb`, for the context menu's `<input
 *  type="color">` (which only accepts hex, unlike SVG's `fill`/`stroke`). */
function explicitColorHex(color: number[] | null | undefined): string {
  if (!color || color.length < 3) return '#808080'
  const toHex = (c: number) => Math.round(Math.min(Math.max(c, 0), 1) * 255).toString(16).padStart(2, '0')
  return `#${toHex(color[0])}${toHex(color[1])}${toHex(color[2])}`
}

/** Text shown for an ingredient under the current "Node label" mode — legacy's `DrawLabels`
 *  (main.js:3828-3844); real rendering despite `ChangeCanvasLabel`'s handler being dead code,
 *  see `uiModeStore.ts`'s docstring. */
function labelText(data: IngredientData, labelBy: string): string {
  if (labelBy === 'pdb') return data.source?.pdb || data.name
  if (labelBy === 'uniprot') return data.uniprot || ''
  if (labelBy === 'label') return data.label || data.name
  return data.name // 'name' and 'None' both show the ingredient name, matching legacy exactly
}

/**
 * Deepest compartment whose packed circle contains `(x, y)`, excluding `dragged`'s own subtree
 * — the modern equivalent of legacy's `anotherSubject` (main.js:4863-4909). A linear scan over
 * `descendants` is deliberate, not a placeholder for something smarter: at recipe-sized node
 * counts this is sub-millisecond, and compartments render `fill="none"` so there's no cheaper
 * DOM-based hit-test available anyway.
 */
function findDropTarget(descendants: PackedNode[], x: number, y: number, dragged: RecipeNode): RecipeNode | null {
  let best: PackedNode | null = null
  for (const d of descendants) {
    if (d.data === dragged) continue
    if (d.data.data.nodetype !== 'compartment') continue
    if (ancestorsSelfFirst(d.data).includes(dragged)) continue // d is inside dragged's own subtree
    const dist = Math.hypot(x - d.x, y - d.y)
    if (dist > d.r) continue
    if (!best || d.depth > best.depth) best = d
  }
  return best?.data ?? null
}

export function RecipeCanvas() {
  const graph = useRecipeStore((s) => s.graph)
  const theme = useThemeStore((s) => s.theme)
  const selectedNode = useRecipeStore((s) => s.selectedNode)
  const selectNode = useRecipeStore((s) => s.selectNode)
  const reparentNode = useRecipeStore((s) => s.reparentNode)
  const selectedLink = useRecipeStore((s) => s.selectedLink)
  const editMode = useUiModeStore((s) => s.editMode)
  const selectedNodes = useUiModeStore((s) => s.selectedNodes)
  const toggleNodeSelection = useUiModeStore((s) => s.toggleNodeSelection)
  const groupBy = useUiModeStore((s) => s.groupBy)
  const sizeBy = useUiModeStore((s) => s.sizeBy)
  const colorMode = useUiModeStore((s) => s.colorMode)
  const minColor = useUiModeStore((s) => s.minColor)
  const maxColor = useUiModeStore((s) => s.maxColor)
  const useColorMapping = useUiModeStore((s) => s.useColorMapping)
  const visitedNodes = useUiModeStore((s) => s.visitedNodes)
  const markVisited = useUiModeStore((s) => s.markVisited)
  const labelBy = useUiModeStore((s) => s.labelBy)
  const showSprites = useUiModeStore((s) => s.showSprites)
  const showLegend = useUiModeStore((s) => s.showLegend)
  const radiusScale = useUiModeStore((s) => s.radiusScale)
  const strokeWidth = useUiModeStore((s) => s.strokeWidth)
  const parentForce = useUiModeStore((s) => s.parentForce)
  const surfaceForce = useUiModeStore((s) => s.surfaceForce)
  const linkForce = useUiModeStore((s) => s.linkForce)
  const clusterByForce = useUiModeStore((s) => s.clusterByForce)
  const collisionForce = useUiModeStore((s) => s.collisionForce)
  const renameNode = useRecipeStore((s) => s.renameNode)
  const deleteIngredient = useRecipeStore((s) => s.deleteIngredient)
  const deleteCompartment = useRecipeStore((s) => s.deleteCompartment)
  const setNodeColor = useRecipeStore((s) => s.setNodeColor)

  const svgRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const zoomGroupRef = useRef<SVGGElement>(null)
  const transformRef = useRef(d3.zoomIdentity)
  const [canvasSize, setCanvasSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })

  // Tracks which node is being dragged and its current drop target for HIGHLIGHTING purposes
  // only — position is no longer React state at all. `hook.pin(node, x, y)` fixes the node's
  // live simulation position (`fx`/`fy`) directly; the tick handler renders wherever the physics
  // settles, which the DOM already reflects imperatively by the time this component re-renders
  // for any other reason.
  const [drag, setDrag] = useState<{
    node: RecipeNode
    dropTarget: RecipeNode | null
    offsetX: number
    offsetY: number
  } | null>(null)
  // Reactive mirror of `transformRef.current.k` — the ref alone doesn't trigger a re-render,
  // but ingredient-label visibility (`LABEL_ZOOM_THRESHOLD`) needs to react to zoom changes.
  const [zoomLevel, setZoomLevel] = useState(1)
  // Mouseover-only highlight, distinct from click-selection — legacy's `d.highlight`
  // (main.js:5046, cleared on mouseout main.js:5038): a black outline plus forcing the
  // ingredient label to show regardless of the zoom threshold (main.js:3828/4214's
  // `d.highlight || transform.k > 1.5` condition).
  const [hoveredNode, setHoveredNode] = useState<RecipeNode | null>(null)
  // Right-click context menu (Rename/Delete/Set color) — legacy's `.custom-menu-node`
  // (`index.html:671-676`, shown via a `contextmenu` interception, main.js:6044-6077).
  // Delivered the same way legacy does (a floating menu at the click point) rather than folding
  // these into RecipeTable/the toolbar, matching the "match legacy exactly" precedent already
  // set for interaction creation earlier this session.
  const [contextMenu, setContextMenu] = useState<{ node: RecipeNode; x: number; y: number } | null>(null)

  const root = graph?.nodes[0] ?? null

  // The old fixed 600×600 viewBox made the root/background look like a square floating inside
  // wide or tall dockview panels. Observe the actual stage and use those dimensions for both the
  // SVG coordinate system and d3.pack(), preserving circular geometry while filling any panel
  // aspect ratio. ResizeObserver also catches dock/undock and splitter drags, not just window
  // resizes.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const updateSize = (width: number, height: number) => {
      const next = {
        width: Math.max(Math.round(width), 240),
        height: Math.max(Math.round(height), 200),
      }
      setCanvasSize((current) => (current.width === next.width && current.height === next.height ? current : next))
    }

    updateSize(stage.clientWidth, stage.clientHeight)
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) updateSize(rect.width, rect.height)
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [root])

  // Owns the live d3-force simulation (pack seed + continuous ticking) — see
  // `useRecipeSimulation.ts`'s docstring for the full lifecycle (CREATE/REHEAT/UPDATE tiers) and
  // why position is written imperatively rather than through this component's own React state.
  const { descendants, posMap, pin, release, getNodeRef, getLinkLineRef, getLinkGradientRef } = useRecipeSimulation(root, graph, groupBy, sizeBy, canvasSize.width, canvasSize.height, {
    radiusScale,
    parentForce,
    surfaceForce,
    linkForce,
    clusterByForce,
    collisionForce,
  })

  // Color context — see `colorModes.ts`'s docstring for why `resolveFillColor` is the single
  // shared resolver between here and `RecipeCanvasToolbar.tsx`'s "Apply to ingredient color".
  const colorCtx: ColorModeContext = useMemo(() => {
    const propertyMapping = graph ? computePropertyMapping(graph.nodes) : {}
    const categoricalPalettes = new Map<string, ReadonlyMap<string, string>>()
    if (graph && !BUILTIN_COLOR_MODES_SET.has(colorMode)) {
      categoricalPalettes.set(colorMode, computeCategoricalPalette(graph.nodes, colorMode))
    }
    const nodeIndex = new Map<RecipeNode, number>(graph ? graph.nodes.map((n, i) => [n, i]) : [])
    return { mode: colorMode, minColor, maxColor, propertyMapping, visitedNodes, categoricalPalettes, useColorMapping, nodeIndex, nodeCount: graph?.nodes.length ?? 0 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, colorMode, minColor, maxColor, visitedNodes, useColorMapping])

  useEffect(() => {
    const svg = svgRef.current
    const group = zoomGroupRef.current
    if (!svg || !group) return
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 8])
      // Excludes node circles from starting a pan — `d3.zoom` binds its own native listener
      // directly on the SVG element (via this `.call(zoom)` below), which fires during real DOM
      // bubbling *before* the event ever reaches React's synthetic dispatch (React delegates at
      // the app root, further up the tree). That means a circle's `onPointerDown` calling
      // `event.stopPropagation()` is always too late to stop `d3.zoom`'s own pan-drag from also
      // starting — found live: dragging a node also panned the whole canvas at the same time,
      // and the two competing transforms mostly canceled out, making the node's computed
      // drop position barely move at all despite the pointer moving normally. `.filter()` is
      // `d3.zoom`'s own supported mechanism for this exact case (excluding certain event
      // targets from ever starting a zoom gesture), not a workaround bolted on top of it.
      .filter((event) => !(event.target instanceof Element && event.target.closest('.recipe-canvas-ingredient, .recipe-canvas-compartment')))
      .on('zoom', (event) => {
        transformRef.current = event.transform
        group.setAttribute('transform', event.transform.toString())
        setZoomLevel(event.transform.k)
      })
    const selection = d3.select(svg)
    selection.call(zoom)
    return () => {
      selection.on('.zoom', null)
    }
  }, [])

  if (!graph || !root) {
    return <p className="panel-note">No recipe loaded. Use Load &gt; New Recipe.</p>
  }

  /** Screen (client) coordinates → pack-space, inverting the SVG viewBox scale then the current zoom transform. */
  function toPackSpace(clientX: number, clientY: number): [number, number] {
    const svg = svgRef.current!
    const ctm = svg.getScreenCTM()!.inverse()
    const viewBoxPoint = new DOMPoint(clientX, clientY).matrixTransform(ctm)
    return transformRef.current.invert([viewBoxPoint.x, viewBoxPoint.y])
  }

  function handlePointerDown(event: React.PointerEvent<SVGCircleElement>, node: RecipeNode) {
    if (event.ctrlKey || event.metaKey) {
      event.stopPropagation()
      if (editMode) toggleNodeSelection(node)
      return
    }
    // The root represents the full recipe/canvas frame. Panning the viewport moves it; dragging
    // it as a node would be redundant and would leave no parent boundary to constrain it to.
    const packed = posMap.get(node)
    if (!packed?.parent) return
    event.stopPropagation()
    const [x, y] = toPackSpace(event.clientX, event.clientY)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    // Preserve the point grabbed inside the circle/ring so pointer-down never makes the node jump
    // its centre under the cursor. Dragging is always available; Edit Mode only adds persistent
    // reparenting and Ctrl/Cmd multi-selection on top of this spatial interaction.
    pin(node, packed.x, packed.y)
    setDrag({ node, dropTarget: null, offsetX: packed.x - x, offsetY: packed.y - y })
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return
    const [x, y] = toPackSpace(event.clientX, event.clientY)
    const targetX = x + drag.offsetX
    const targetY = y + drag.offsetY
    pin(drag.node, targetX, targetY)
    const dropTarget = editMode ? findDropTarget(descendants, targetX, targetY, drag.node) : null
    setDrag((prev) => (prev ? { ...prev, dropTarget } : null))
  }

  function handlePointerUp() {
    if (!drag) return
    release(drag.node)
    if (editMode && drag.dropTarget) reparentNode(drag.node, drag.dropTarget)
    setDrag(null)
  }

  // Root compartment can't be renamed/deleted/recolored via the context menu — legacy's own
  // menu is only ever attached per-node via the canvas hit-test, but the root has nowhere
  // meaningful to be "deleted" or reparented from; excluded explicitly here instead.
  function handleRename() {
    if (!contextMenu) return
    const name = window.prompt('Please enter new name', contextMenu.node.data.name)
    if (name != null) renameNode(contextMenu.node, name)
    setContextMenu(null)
  }

  function handleDelete() {
    if (!contextMenu) return
    if (isIngredientNode(contextMenu.node)) deleteIngredient(contextMenu.node)
    else deleteCompartment(contextMenu.node)
    setContextMenu(null)
  }

  function handleSetColor(event: React.ChangeEvent<HTMLInputElement>) {
    if (!contextMenu) return
    setNodeColor(contextMenu.node, event.target.value)
  }

  // A recipe may still provide its legacy root/canvas color in light mode. Dark mode is an
  // application-level readability choice, so its theme surface takes precedence over a saved
  // light-grey root color and returns to the recipe color when light mode is restored.
  const backgroundColor =
    theme === 'dark' ? 'var(--color-recipe-canvas-bg)' : explicitColor(root.data.color) ?? DEFAULT_BACKGROUND

  // Legend: legacy's `DrawColorLegend` (main.js:3848-3889) shows categorical swatches for a
  // custom string-valued column — not for `automatic` (whose colors are per-compartment, not
  // one global category list) or any of the other builtin modes (all numeric/validation/
  // explicit, none of which have a meaningful "list of categories").
  const legendPalette = !BUILTIN_COLOR_MODES_SET.has(colorMode) ? colorCtx.categoricalPalettes.get(colorMode) : undefined
  const legendEntries = showLegend && legendPalette ? [...legendPalette.entries()].filter(([value]) => value !== '') : []

  // Popup thumbnail triggers on selection OR hover — legacy's "node_selected or node_over"
  // condition (main.js:3969-4027); hover takes priority when both are set, matching legacy
  // showing whatever's currently under the pointer over a stale selection.
  const popupNode = (hoveredNode && isIngredientNode(hoveredNode) ? hoveredNode : null) ?? (selectedNode && isIngredientNode(selectedNode) ? selectedNode : null)
  const popupIngredientData = popupNode ? (popupNode.data as IngredientData) : null
  const popupSpriteUrl = popupIngredientData ? resolveSpriteImageUrl(popupIngredientData.sprite?.image ?? null, popupIngredientData.source?.pdb) : null

  return (
    <div ref={stageRef} className="recipe-canvas-stage">
    <svg
      ref={svgRef}
      className={`recipe-canvas${drag ? ' is-dragging' : ''}`}
      viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
      onClick={() => {
        selectNode(null)
        setContextMenu(null)
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <rect
        className="recipe-canvas-background"
        data-canvas-theme={theme}
        x={0}
        y={0}
        width={canvasSize.width}
        height={canvasSize.height}
        fill={backgroundColor}
      />
      <g ref={zoomGroupRef}>
        <g className="recipe-canvas-links">
          {/* Gradient blend between each link's endpoint colors — legacy's `DrawConnections`
              (main.js:3765-3800): `createLinearGradient` from `colorNode(source)` to
              `colorNode(target)`. Selected stays a flat orange/yellow highlight (legacy's own
              selected-link treatment) rather than also gradient-blended. */}
          <defs>
            {/* No x1/y1/x2/y2 here — `getLinkGradientRef` applies the initial axis imperatively
                on mount and the simulation's tick handler keeps it current; setting it as a React
                prop too would let an unrelated re-render reset it to a stale value (see this
                file's docstring). */}
            {graph.links.map((link) => {
              const s = posMap.get(link.source)
              const t = posMap.get(link.target)
              if (!s || !t || link === selectedLink) return null
              const sourceColor = resolveFillColor(link.source, s.depth, isIngredientNode(link.source), colorCtx)
              const targetColor = resolveFillColor(link.target, t.depth, isIngredientNode(link.target), colorCtx)
              return (
                <linearGradient key={link.id} ref={getLinkGradientRef(link)} id={`recipe-canvas-link-grad-${link.id}`} gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor={sourceColor} />
                  <stop offset="1" stopColor={targetColor} />
                </linearGradient>
              )
            })}
          </defs>
          {graph.links.map((link) => {
            const s = posMap.get(link.source)
            const t = posMap.get(link.target)
            if (!s || !t) return null
            const selected = link === selectedLink
            return (
              <line
                key={link.id}
                ref={getLinkLineRef(link)}
                className="recipe-canvas-link"
                stroke={selected ? '#ff8800' : `url(#recipe-canvas-link-grad-${link.id})`}
                strokeWidth={selected ? strokeWidth * 1.5 : strokeWidth}
              />
            )
          })}
        </g>
        {descendants.map((packedNode) => {
          const node = packedNode.data
          // The root is the recipe/layout frame, not a biological compartment. Legacy uses its
          // color as the canvas background but deliberately does not draw its circle; do the same.
          if (!packedNode.parent) return null
          // Not `!packedNode.children`: `d3.hierarchy`'s children-accessor treats an *empty*
          // array as "no children" (its `childs && childs.length` check is falsy for `[]`), so
          // a genuinely empty compartment (e.g. freshly added via "Add compartment") would
          // otherwise get misclassified as a leaf/ingredient — found live, real bug, only
          // surfaced once "Add compartment" made an empty compartment reachable at all.
          const isLeaf = node.data.nodetype === 'ingredient'
          const isDragged = drag?.node === node
          const selected = node === selectedNode
          const multiSelected = selectedNodes.includes(node)
          const isDropTarget = drag?.dropTarget === node
          const color = resolveFillColor(node, packedNode.depth, isLeaf, colorCtx)
          const data = node.data as IngredientData
          const spriteUrl = isLeaf ? resolveSpriteImageUrl(data.sprite?.image ?? null, data.source?.pdb) : null
          const isFiber = isLeaf && data.ingtype === 'fiber'
          const hovered = node === hoveredNode
          const showLabelText = isLeaf && (selected || multiSelected || hovered || zoomLevel > LABEL_ZOOM_THRESHOLD)
          const arcId = `recipe-canvas-arc-${nodeKey(node)}`
          const compartmentData = !isLeaf ? (node.data as CompartmentData) : null
          const membraneThickness = Math.max(Number(compartmentData?.thickness) || 0, 1)
          const membraneHalf = membraneThickness / 2
          const labelRadius = Math.max(packedNode.r - membraneHalf - 5, 1)
          const interactionStroke = isDropTarget ? '#00b894' : selected ? '#ff8800' : multiSelected ? '#0984e3' : hovered ? '#111827' : color
          const interactionStrokeWidth = isDropTarget || selected || multiSelected || hovered ? Math.max(strokeWidth * 1.75, 1.5) : Math.max(strokeWidth, 0.75)

          const selectThisNode = (event: React.MouseEvent<SVGCircleElement>) => {
            event.stopPropagation()
            if (!event.ctrlKey && !event.metaKey) {
              selectNode(node)
              markVisited(node)
            }
          }

          const openContextMenu = (event: React.MouseEvent<SVGCircleElement>) => {
            event.preventDefault()
            event.stopPropagation()
            setContextMenu({ node, x: event.clientX, y: event.clientY })
          }

          return (
            // No `transform` prop here — `getNodeRef` applies the initial position imperatively
            // on mount, and (for leaves) the live simulation's tick handler keeps it current on
            // every frame afterward. Every child below uses LOCAL, origin-relative coordinates
            // (0,0 = this node's center) instead of absolute `cx`/`cy` math, so the whole group
            // moves for free whenever the parent `<g>`'s transform is updated — see this file's
            // docstring. Compartments use the same mechanism; their transforms are updated
            // imperatively when a rigid subtree is dragged, even though they do not participate
            // in the continuously-ticking leaf simulation.
            <g
              key={nodeKey(node)}
              ref={getNodeRef(node)}
              className={`recipe-canvas-node${isDragged ? ' is-dragged' : ''}${hovered ? ' is-hovered' : ''}${selected ? ' is-selected' : ''}`}
              data-recipe-node="true"
              data-node-type={isLeaf ? 'ingredient' : 'compartment'}
              data-node-name={node.data.name}
              opacity={isDragged ? 0.64 : 1}
            >
              {isLeaf ? (
                <circle
                  cx={0}
                  cy={0}
                  r={packedNode.r}
                  className="recipe-canvas-ingredient"
                  fill={color}
                  stroke={interactionStroke}
                  strokeWidth={isDropTarget || selected || multiSelected || hovered ? interactionStrokeWidth : 0}
                  strokeDasharray={isDropTarget ? '4 3' : undefined}
                  onClick={selectThisNode}
                  onPointerDown={(event) => handlePointerDown(event, node)}
                  onContextMenu={openContextMenu}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode((current) => (current === node ? null : current))}
                >
                  <title>{node.data.name}</title>
                </circle>
              ) : (
                <>
                  {/* A soft membrane band plus two crisp leaflet edges. The invisible centreline
                      stroke is deliberately wider than the visible band, making thin/small
                      compartments easy to hover and drag without inflating their appearance. */}
                  <circle
                    className="recipe-canvas-compartment-band"
                    cx={0}
                    cy={0}
                    r={packedNode.r}
                    fill="none"
                    stroke={color}
                    strokeWidth={membraneThickness}
                  />
                  <circle
                    className="recipe-canvas-membrane-edge recipe-canvas-membrane-edge-outer"
                    data-membrane-edge="outer"
                    cx={0}
                    cy={0}
                    r={packedNode.r + membraneHalf}
                    fill="none"
                    stroke={interactionStroke}
                    strokeWidth={interactionStrokeWidth}
                    strokeDasharray={isDropTarget ? '4 3' : undefined}
                  />
                  <circle
                    className="recipe-canvas-membrane-edge recipe-canvas-membrane-edge-inner"
                    data-membrane-edge="inner"
                    cx={0}
                    cy={0}
                    r={Math.max(packedNode.r - membraneHalf, 0)}
                    fill="none"
                    stroke={interactionStroke}
                    strokeWidth={interactionStrokeWidth}
                    strokeDasharray={isDropTarget ? '4 3' : undefined}
                  />
                  <circle
                    className="recipe-canvas-compartment recipe-canvas-compartment-hit"
                    data-compartment-hit="true"
                    cx={0}
                    cy={0}
                    r={packedNode.r}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={Math.max(membraneThickness + 12, 18)}
                    pointerEvents="stroke"
                    onClick={selectThisNode}
                    onPointerDown={(event) => handlePointerDown(event, node)}
                    onContextMenu={openContextMenu}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode((current) => (current === node ? null : current))}
                  >
                    <title>{node.data.name}</title>
                  </circle>
                </>
              )}

              {/* Sprite/thumbnail image — legacy's per-node thumbnail in `DrawIngredients`
                  (main.js:3740-3751), gated by the "Node image" checkbox. Fiber ingredients
                  repeat the image 3 times (legacy main.js:4017-4022, spaced by
                  `sprite.lengthy`) — simplified here to a fixed fraction of the circle's own
                  diameter rather than replicating legacy's angstrom-precise spacing, which was
                  calibrated for a fixed large screen-space popup, not a small in-context
                  circle whose radius varies per ingredient. */}
              {showSprites && spriteUrl && !isFiber && (
                <image href={spriteUrl} x={-packedNode.r} y={-packedNode.r} width={packedNode.r * 2} height={packedNode.r * 2} preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
              )}
              {showSprites && spriteUrl && isFiber && (
                <>
                  {[-1, 0, 1].map((offset) => (
                    <image
                      key={offset}
                      href={spriteUrl}
                      x={offset * packedNode.r * 0.9 - packedNode.r * 0.5}
                      y={-packedNode.r * 0.5}
                      width={packedNode.r}
                      height={packedNode.r}
                      preserveAspectRatio="xMidYMid meet"
                      pointerEvents="none"
                    />
                  ))}
                </>
              )}

              {/* Membrane markers — legacy's three offsety-derived lines (main.js:3989-4015):
                  green = center, red = outer leaflet, blue = inner leaflet. Positioned as a
                  fixed fraction of the circle's own radius rather than legacy's angstrom
                  `offsety`/`scale2d` conversion, for the same in-context-circle reason as the
                  fiber sprite spacing above. */}
              {isLeaf && data.surface && (
                <g pointerEvents="none">
                  <line x1={-packedNode.r * 0.6} y1={0} x2={packedNode.r * 0.6} y2={0} stroke="green" strokeWidth={1} />
                  <line x1={-packedNode.r * 0.6} y1={-packedNode.r * 0.3} x2={packedNode.r * 0.6} y2={-packedNode.r * 0.3} stroke="red" strokeWidth={1} />
                  <line x1={-packedNode.r * 0.6} y1={packedNode.r * 0.3} x2={packedNode.r * 0.6} y2={packedNode.r * 0.3} stroke="blue" strokeWidth={1} />
                </g>
              )}

              {/* Curved compartment name — legacy's `drawCircularText` (main.js:5500-5536),
                  ported to SVG's native `<textPath>` along a semicircular arc instead of
                  manually rotating the canvas per character (SVG has this built in). */}
              {!isLeaf && packedNode.r > MIN_LABEL_RADIUS && (
                <>
                  <path id={arcId} d={`M ${-labelRadius} 0 A ${labelRadius} ${labelRadius} 0 0 1 ${labelRadius} 0`} fill="none" stroke="none" />
                  <text className="recipe-canvas-compartment-label" fontSize={Math.min(Math.round(packedNode.r / 10), 16)}>
                    <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
                      {node.data.name}
                    </textPath>
                  </text>
                </>
              )}

              {showLabelText && (
                <text x={0} y={packedNode.r + 10} textAnchor="middle" className="recipe-canvas-ingredient-label" pointerEvents="none">
                  {labelText(data, labelBy)}
                </text>
              )}
            </g>
          )
        })}
      </g>

      {legendEntries.length > 0 && (
        <g className="recipe-canvas-legend">
          {legendEntries.map(([value, swatchColor], i) => (
            <g key={value} transform={`translate(4, ${4 + i * 20})`}>
              <rect width={16} height={16} fill={swatchColor} />
              <text x={20} y={13} fontSize={12}>
                {value}
              </text>
            </g>
          ))}
        </g>
      )}

      {popupSpriteUrl && (
        <image href={popupSpriteUrl} x={canvasSize.width - 108} y={canvasSize.height - 108} width={100} height={100} preserveAspectRatio="xMidYMid meet" pointerEvents="none" className="recipe-canvas-popup-thumbnail" />
      )}
    </svg>
    {contextMenu && (
      <div className="recipe-canvas-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
        <div className="recipe-canvas-context-menu-title">{contextMenu.node.data.name}</div>
        <Button variant="menu" size="sm" onClick={handleRename}>
          Rename
        </Button>
        <Button variant="danger" size="sm" onClick={handleDelete} disabled={!contextMenu.node.parent}>
          Delete
        </Button>
        <label>
          Color
          <input type="color" value={explicitColorHex(contextMenu.node.data.color)} onChange={handleSetColor} />
        </label>
      </div>
    )}
    </div>
  )
}
