/**
 * The Recipe view's state between frames and its gestures (recipe-view.md §2-§4): the simulation, the draw scene, the
 * frame loop, and legacy's d3-drag/d3-zoom bindings. `RecipeCanvas.tsx` mounts it; nothing here renders React.
 */
import { drag as d3drag, type D3DragEvent } from 'd3-drag'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomTransform } from 'd3-zoom'
import { useRecipeStore } from '../../state/recipeStore'
import { useUiModeStore } from '../../state/uiModeStore'
import type { IngredientData, RecipeGraph, RecipeLink, RecipeNode } from '../../domain/recipe/types'
import { resolveSpriteImageUrl } from '../../domain/pdb/structureSource'
import type { ColorPrep } from '../../domain/recipe/view/colors'
import { DrawCache, drawFrame, type LegendEntry, type Scene } from '../../domain/recipe/view/draw'
import { dropOutcome, dropTarget, hitLink, hitNode, type DropTarget } from '../../domain/recipe/view/hitTest'
import { NEW_COMPARTMENT_R, NEW_INGREDIENT_R, assignClusters, computeRadii, seedPositions } from '../../domain/recipe/view/layout'
import { RecipeSimulation, buildSimNodes, type SimLink, type SimNode } from '../../domain/recipe/view/simulation'
import { spriteImage } from './spriteCache'

export function rgbList(color: number[] | null | undefined): string | null {
  return color && color.length >= 3 ? `rgb(${Math.floor(color[0] * 255)},${Math.floor(color[1] * 255)},${Math.floor(color[2] * 255)})` : null
}

/** What the e2e tests read from the stage element (`__recipeView`): the canvas has no DOM per node. */
export interface RecipeViewProbe {
  nodes: () => { name: string; depth: number; r: number; x: number; y: number; leaf: boolean; surface: boolean; parent: string | null }[]
  transform: () => { x: number; y: number; k: number }
  hot: () => boolean
  frames: () => number
}

/** Everything the canvas keeps between frames; one per mounted panel. */
export class RecipeView {
  readonly sim = new RecipeSimulation()
  readonly cache = new DrawCache()
  index = new Map<RecipeNode, SimNode>()
  linkIndex = new Map<RecipeLink, SimLink>()
  graph: RecipeGraph | null = null
  /** The graph as loaded: the root label's `*` shows once it changes (§2.7, row 35). */
  loaded: RecipeGraph | null = null
  readonly fills = new Map<SimNode, string>()
  sprites = new Map<SimNode, string | null>()
  showSprites = true
  prep: ColorPrep | null = null
  /** The last categorical palette, for the `color`-mode legend (`latest_colorby`, §2.9). */
  lastLegend: LegendEntry[] | null = null
  transform: ZoomTransform = zoomIdentity
  /** Reused per Edit-Mode drag move (no allocation per pointer move). */
  readonly drop: DropTarget = { node: null as unknown as SimNode, distance: 0 }
  readonly tempLink = { source: null as unknown as SimNode, target: null as unknown as SimNode }
  ctx: CanvasRenderingContext2D | null = null
  frame = 0
  frames = 0
  readonly scene: Scene = {
    nodes: [],
    sorted: [],
    links: [],
    fill: this.fills,
    background: 'rgb(224,224,224)',
    transform: { x: 0, y: 0, k: 1 },
    width: 600,
    height: 600,
    dpr: 1,
    strokeWidth: 1,
    labelOption: 'name',
    rootLabel: '',
    hovered: null,
    hoveredLink: null,
    selected: null,
    selectedLink: null,
    selection: [],
    dropTarget: null,
    dropSurface: null,
    tempLink: null,
    editMode: false,
    sprite: (n) => {
      if (!this.showSprites) return null
      const url = this.sprites.get(n)
      return url ? spriteImage(url) : null
    },
    popup: null,
    legend: null,
  }

  /** A frame soon; it keeps stepping the simulation while it is hot (§10.4). */
  request = (): void => {
    if (!this.frame && typeof requestAnimationFrame !== 'undefined') this.frame = requestAnimationFrame(this.tick)
  }

  private readonly tick = (): void => {
    this.frame = 0
    if (this.sim.hot) this.sim.step()
    this.draw()
    if (this.sim.hot) this.request()
  }

  draw(): void {
    const s = this.scene
    if (!this.ctx) return
    s.transform.x = this.transform.x
    s.transform.y = this.transform.y
    s.transform.k = this.transform.k
    const sel = s.selected
    s.popup = sel?.leaf ? sel : s.hovered?.leaf ? s.hovered : null
    drawFrame(this.ctx, s, this.cache)
    this.frames++
  }

  /** Re-sorts the draw order by depth (a floated node, depth 6, draws last). */
  sort(): void {
    this.scene.sorted = [...this.scene.nodes].sort((a, b) => a.depth - b.depth)
  }

  /**
   * The store's graph into the simulation: a new recipe or an append is seeded by legacy's pack, anything else keeps
   * every position (§1.9).
   */
  sync(graph: RecipeGraph | null, opts: { sizeBy: string; radiusScale: number; groupBy: string | null }): void {
    const prev = this.graph
    this.graph = graph
    this.cache.reset()
    if (!graph?.nodes.length) {
      this.index.clear()
      this.scene.nodes = []
      this.scene.sorted = []
      this.scene.links = []
      this.sim.setGraph([], [])
      return
    }
    const root = graph.nodes[0]
    const newRoot = !prev?.nodes.length || prev.nodes[0] !== root
    // More than one new node at once is an append (merge): legacy's merge re-packs (main.js:5696-5718).
    let added = 0
    for (const n of graph.nodes) if (!this.index.has(n)) added++
    const reseed = newRoot || added > 1
    const { width, height } = this.scene
    let nodes: SimNode[]
    if (reseed) {
      const seeds = seedPositions(graph, width, height)
      const radii = computeRadii(graph, opts.sizeBy, opts.radiusScale, (n) => seeds.get(n)?.r ?? NEW_COMPARTMENT_R)
      nodes = buildSimNodes(root, new Map(), (n) => ({ x: seeds.get(n)?.x ?? width / 2, y: seeds.get(n)?.y ?? height / 2, r: radii.get(n)! }))
      if (newRoot) this.loaded = graph
    } else {
      // §7.1-§7.2: a new node appears at the canvas centre, r 30 (ingredient) or 150 (compartment).
      nodes = buildSimNodes(root, this.index, (n) => ({ x: width / 2, y: height / 2, r: n.children ? NEW_COMPARTMENT_R : NEW_INGREDIENT_R }))
    }
    this.index = new Map(nodes.map((n) => [n.node, n]))
    const links: SimLink[] = []
    const linkIndex = new Map<RecipeLink, SimLink>()
    for (const link of graph.links) {
      const source = this.index.get(link.source)
      const target = this.index.get(link.target)
      if (!source || !target) continue
      const l = this.linkIndex.get(link) ?? { source, target, link }
      l.source = source
      l.target = target
      links.push(l)
      linkIndex.set(link, l)
    }
    this.linkIndex = linkIndex
    this.sprites = new Map()
    for (const n of nodes) {
      if (!n.leaf) continue
      const d = n.node.data as IngredientData
      this.sprites.set(n, resolveSpriteImageUrl(d.sprite?.image ?? null, d.source?.pdb))
    }
    this.scene.nodes = nodes
    this.scene.links = links
    this.sort()
    if (reseed) this.sim.load(nodes, links)
    else {
      this.sim.setGraph(nodes, links)
      this.sim.heat()
    }
    this.cluster(opts.groupBy)
  }

  /** "Node group by" (§6.5). A built-in key turns clustering off. */
  cluster(groupBy: string | null): void {
    this.sim.clusterBy = assignClusters(this.scene.nodes, groupBy)
  }

  /** "Node size" or "Scale Radius by" (`mapRadiusToProperty_cb`, §1.7): new radii, positions kept, forces rebuilt. */
  resize(sizeBy: string, radiusScale: number): void {
    if (!this.graph?.nodes.length) return
    const radii = computeRadii(this.graph, sizeBy, radiusScale, (n) => this.index.get(n)?.r ?? NEW_COMPARTMENT_R)
    for (const n of this.scene.nodes) n.r = radii.get(n.node) ?? n.r
    this.cache.reset()
    this.sim.updateForce()
    this.sim.heat()
  }
}

type Subject = { node: SimNode; link: SimLink | null; x: number; y: number; ctrl: boolean; wx: number; wy: number; nx: number; ny: number }
type DragEvent = D3DragEvent<HTMLCanvasElement, unknown, Subject>

/**
 * Legacy's bindings (§4.1, main.js:2944-2963): hover on mousemove, d3-drag for every left press (its subject the
 * deepest node, the root on empty space, so a left drag never pans), then d3-zoom for the wheel, double-click and
 * middle-drag. Returns the unbinding.
 */
export function bindGestures(canvas: HTMLCanvasElement, view: RecipeView, closeMenu: () => void): () => void {
  // Canvas pixels to world, without allocating (a pointer move must not, How we work).
  const wx = (px: number) => (px - view.transform.x) / view.transform.k
  const wy = (py: number) => (py - view.transform.y) / view.transform.k

  // Hover (§4.4): flags only; the next frame draws them.
  const onMove = (e: PointerEvent) => {
    if (!view.scene.nodes.length) return
    const x = wx(e.offsetX)
    const y = wy(e.offsetY)
    const picked = hitNode(view.scene.nodes, x, y)
    const link = hitLink(view.scene.links, x, y, picked)
    const node = link ? null : picked.parent ? picked : null
    if (node !== view.scene.hovered || link !== view.scene.hoveredLink) {
      view.scene.hovered = node
      view.scene.hoveredLink = link
      view.request()
    }
  }
  const onLeave = () => {
    if (!view.scene.hovered && !view.scene.hoveredLink) return
    view.scene.hovered = null
    view.scene.hoveredLink = null
    view.request()
  }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)

  const clearDrop = () => {
    const scene = view.scene
    scene.dropTarget = scene.dropSurface = null
    scene.tempLink = null
  }

  const dragBehavior = d3drag<HTMLCanvasElement, unknown, Subject>()
    .container(canvas)
    // d3 v4's filter: any left press; v7's default also drops Ctrl, which legacy uses to multi-select (§4.2).
    .filter((e: MouseEvent) => !e.button)
    // e.x, e.y: the pointer in canvas pixels (the subject's x, y are the same point, so d3 adds no offset).
    .subject((e: DragEvent) => {
      const src = e.sourceEvent as MouseEvent
      const x = wx(e.x)
      const y = wy(e.y)
      const node = hitNode(view.scene.nodes, x, y)
      const link = hitLink(view.scene.links, x, y, node)
      return { node, link, x: e.x, y: e.y, ctrl: src.ctrlKey || src.metaKey, wx: x, wy: y, nx: node.x, ny: node.y }
    })
    .on('start', (e: DragEvent) => {
      // Legacy highlights at drag start (main.js:5106-5169) and runs the side effects at the end (§4.5, row 63): here
      // only the frame's selection changes, so the table and the viewers do not load in the middle of a drag.
      closeMenu()
      const { node, link, ctrl } = e.subject
      if (!view.scene.nodes.length || link) return
      const editMode = useUiModeStore.getState().editMode
      const scene = view.scene
      if (node.leaf) {
        scene.selected = node
        scene.selection = ctrl ? (scene.selection.includes(node) ? scene.selection : [...scene.selection, node]) : [node]
      } else if (node.parent && !editMode) {
        scene.selected = node
        scene.selection = [node]
      } else {
        scene.selected = null
        scene.selection = []
      }
      view.sim.dragStart(node, editMode, ctrl)
      if (view.sim.drag?.floating) view.sort()
      view.request()
    })
    .on('drag', (e: DragEvent) => {
      const s = e.subject
      if (s.link || !s.node.parent || !view.sim.drag) return
      // World-correct: the grab point stays under the pointer at any zoom (row 57).
      view.sim.dragTo(s.nx + wx(e.x) - s.wx, s.ny + wy(e.y) - s.wy)
      if (view.sim.drag.floating) {
        // Legacy tests the subject where the simulation last put it (main.js:5198-5222).
        const t = dropTarget(view.scene.nodes, s.node, view.drop)
        const scene = view.scene
        if (!t.node.leaf || !t.node.parent) {
          scene.dropTarget = t.node
          scene.dropSurface = Math.abs(t.node.r - t.distance) < s.node.r ? t.node : null
          view.tempLink.source = t.node
          view.tempLink.target = s.node
          scene.tempLink = view.tempLink
        } else clearDrop()
      }
      view.request()
    })
    .on('end', (e: DragEvent) => {
      const { node, link } = e.subject
      const store = useRecipeStore.getState()
      const uiStore = useUiModeStore.getState()
      if (link) {
        // A link: selected with its ends (main.js:5266-5278, row 47).
        store.selectLink(link.link)
        store.selectNode(link.link.source)
        uiStore.setSelection([link.link.source, link.link.target])
        view.request()
        return
      }
      const floating = view.sim.drag?.floating ?? false
      const drop = floating ? dropTarget(view.scene.nodes, node) : null
      view.sim.dragEnd()
      if (floating) view.sort()
      clearDrop()
      // The selection made at the press, now into the stores (table, viewers, visited).
      if (node.leaf) {
        if (e.subject.ctrl) uiStore.addToSelection(node.node)
        else uiStore.setSelection([node.node])
        store.selectNode(node.node)
        store.selectLink(null)
        uiStore.markVisited(node.node)
      } else if (node.parent && !uiStore.editMode) {
        uiStore.setSelection([node.node])
        store.selectNode(node.node)
      } else {
        uiStore.clearSelection()
        store.selectNode(null)
      }
      if (drop) {
        // Rows 66-68: onto a compartment or the root; the target grows by r/2; `surface` recomputed.
        const out = dropOutcome(node, drop)
        if (out.surface !== null && out.surface !== !!(node.node.data as IngredientData).surface) store.updateIngredient(node.node, { surface: out.surface })
        if (out.parent) store.reparentNode(node.node, out.parent.node)
        store.selectNode(node.node) // legacy sets `node_selected` to the subject (main.js:5285)
      }
      view.request()
    })

  // Wheel and double-click zoom anywhere, middle-drag pans; d3-drag takes every left press first (§4.2, rows 51-55).
  const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
    .scaleExtent([0.2, 20])
    .filter((e: MouseEvent) => e.button === 0 || e.button === 1)
    .wheelDelta((e: WheelEvent) => (-e.deltaY * (e.deltaMode ? 120 : 1)) / 500)
    .on('zoom', (e: { transform: ZoomTransform; sourceEvent: Event | null }) => {
      view.transform = e.transform
      if ((e.sourceEvent as MouseEvent | null)?.ctrlKey) view.scene.hovered = null // `clearHighLight` (main.js:3095)
      view.request()
    })
  select(canvas).call(dragBehavior).call(zoomBehavior)
  return () => {
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerleave', onLeave)
    select(canvas).on('.drag', null).on('.zoom', null)
  }
}

