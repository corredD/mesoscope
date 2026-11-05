/**
 * The Recipe view as a Dragology draggable (recipe-view.md §10.1): SVG drawn from the view state in legacy's order
 * (§2.2, row 29), and every drag declared on the node it starts on (§4, §10.2, §10.4). Recipe data, colours and
 * interaction state come in through `RecipeDrawContext`; only geometry is Dragology state.
 */
import { scale, translate, type Draggable, type DragSpec, type DragSpecBuilder } from 'dragology'
import type { IngredientData, RecipeNode } from '../../domain/recipe/types'
import { resolveSpriteImageUrl } from '../../domain/pdb/structureSource'
import { nodeStyle } from '../../domain/recipe/view/colors'
import { clampToDisk, containmentLimit, onMembrane, pushNeighbours, reparentTarget } from '../../domain/recipe/view/drag'
import { spriteReady } from './spriteCache'
import { linkEnds } from '../../domain/recipe/view/hitTest'
import { compartmentTitle, ingredientLabelGeometry, ingredientLabelText, ingredientLabelVisible, LABEL_FONT, measureCharWidth, TITLE_FONT } from '../../domain/recipe/view/labels'
import { absoluteOf, absolutePositions, withPosition, type Point, type ViewState } from '../../domain/recipe/view/viewState'

/** Layer order: legacy's frame, back to front (§2.2, main.js:3931-4028). Compartments use their depth below 100. */
export const Z = { links: 100, ingredients: 200, pairLines: 300, tempLink: 310, labels: 400, legend: 500 } as const

export interface DrawLink {
  key: string
  source: string
  target: string
}

export interface LegendEntry {
  label: string
  color: string
}

export interface RecipeDrawContext {
  index: Map<string, RecipeNode>
  /** Fill from `colorNode` per node id, for the current colour mode. */
  colors: Map<string, string>
  links: DrawLink[]
  view: { x: number; y: number; k: number }
  width: number
  height: number
  background: string
  hovered: string | null
  hoveredLink: string | null
  selected: string | null
  selection: string[]
  selectedLink: string | null
  editMode: boolean
  /** Ctrl at the last left press: a Ctrl drag in Edit Mode moves instead of reparenting (§4.7). */
  ctrlAtPress: { current: boolean }
  labelOption: string
  showSprites: boolean
  strokeWidth: number
  legend: { entries: LegendEntry[]; w: number; h: number; f: number; ypad: number } | null
}

const nodeLayer = (id: string) => `node-${id}`

/** The drag a node starts (§4.2, §4.7, §10.2, §10.4). Neighbours are pushed aside in every non-Edit drag. */
export function dragSpecFor(d: DragSpecBuilder<ViewState>, state: ViewState, id: string, ctx: RecipeDrawContext): DragSpec<ViewState> {
  const node = state.nodes[id]
  const parent = state.nodes[node.parent!]
  if (ctx.editMode && !ctx.ctrlAtPress.current) {
    // Edit Mode: the node floats; the drop target is derived when drawn and applied on drop (rows 66-68).
    const p = absoluteOf(state, id)
    return d.varyFunc([p.x, p.y], ([x, y]) => ({ ...state, drag: { id, x, y }, push: null }))
  }
  if (node.leaf && node.surface && parent.parent) {
    return d.varyFunc([Math.atan2(node.y, node.x)], ([a]) => {
      const p = onMembrane(a, parent.r)
      return { ...state, push: { id, ...p } }
    })
  }
  const limit = containmentLimit(node, parent)
  return d.varyFunc([node.x, node.y], ([u, v]) => {
    return { ...state, push: { id, ...clampToDisk(u, v, limit) } }
  })
}

/** A drag's move and its pushes applied: what is drawn mid-drag, and what a drop becomes. */
export function applyPush(state: ViewState): ViewState {
  if (!state.push) return state
  const { id, x, y } = state.push
  return { ...pushNeighbours(withPosition(state, id, x, y), id), push: null }
}

function compartmentLayer(id: string, at: Point, r: number, depth: number, fill: string, stroke: string, strokeWidth: number, z: number | string, onDrag: () => DragSpec<ViewState>) {
  // A filled disk r+5 with outlines at r±5: legacy's two arcs in one path, filled nonzero (§2.4).
  return (
    <g id={nodeLayer(id)} transform={translate(at.x, at.y)} dragologyZIndex={z} dragologyOnDrag={onDrag} data-node-id={id} data-depth={depth} data-r={r} data-kind="compartment">
      <circle r={r + 5} fill={fill} />
      <circle r={r + 5} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <circle r={Math.max(r - 5, 0)} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
    </g>
  )
}

export function makeRecipeDraggable(ctx: RecipeDrawContext): Draggable<ViewState> {
  const viewTransform = translate(ctx.view.x, ctx.view.y) + scale(ctx.view.k)
  const selection = new Set(ctx.selection)
  return ({ state, d, draggedId, isTracking }) => {
    if (isTracking && draggedId?.startsWith('node-')) {
      // Only the dragged node and its transform chain: `vary` renders this on every optimizer step (Learned, step 0).
      const p = absoluteOf(state, draggedId.slice(5))
      return (
        <g id="view" transform={viewTransform}>
          <g id={draggedId} transform={translate(p.x, p.y)} />
        </g>
      )
    }
    const shown = applyPush(state)
    const abs = absolutePositions(shown)
    const drop = shown.drag ? reparentTarget(shown, shown.drag.id, shown.drag, abs) : null
    const layers: React.ReactElement[] = []
    const labels: React.ReactElement[] = []
    let titleCounter = 0
    for (const id of shown.order) {
      const node = shown.nodes[id]
      const recipeNode = ctx.index.get(id)
      if (!node.parent || !recipeNode) continue
      const at = abs.get(id)!
      const dragged = shown.drag?.id === id
      const fill = ctx.colors.get(id) ?? 'black'
      const style = nodeStyle(fill, node.depth, {
        selected: ctx.selected === id,
        inSelection: selection.has(id),
        hovered: ctx.hovered === id,
        dropTarget: drop?.target === id && !drop.surface,
        dropTargetSurface: drop?.target === id && drop.surface,
        dragged,
      })
      const onDrag = () => dragSpecFor(d, state, id, ctx)
      if (!node.leaf) {
        layers.push(compartmentLayer(id, at, node.r, node.depth, style.fill, style.stroke, ctx.strokeWidth, dragged ? '/1' : node.depth, onDrag))
        const title = compartmentTitle(recipeNode.data.name, node.r, titleCounter++, measureCharWidth)
        if (title) {
          labels.push(
            <g id={`title-${id}`} transform={translate(at.x, at.y)} dragologyZIndex={dragged ? '/2' : Z.labels} pointerEvents="none">
              {title.letters.map((letter) => (
                <text transform={`rotate(${letter.angle}) translate(0,${-title.radius})`} fontSize={title.fontSize} fontFamily={TITLE_FONT} textAnchor="middle" fill="rgba(0,0,0,1)">
                  {letter.char}
                </text>
              ))}
            </g>,
          )
        }
        continue
      }
      const data = recipeNode.data as IngredientData
      const url = ctx.showSprites ? resolveSpriteImageUrl(data.sprite?.image ?? null, data.source?.pdb) : null
      const sprite = url && spriteReady(url) ? url : null
      layers.push(
        <g id={nodeLayer(id)} transform={translate(at.x, at.y)} dragologyZIndex={dragged ? '/1' : Z.ingredients + node.depth} dragologyOnDrag={onDrag} data-node-id={id} data-depth={node.depth} data-r={node.r} data-kind="ingredient" data-surface={node.surface}>
          <circle r={node.r} fill={style.fill} stroke={style.stroke} strokeWidth={ctx.strokeWidth} />
          {sprite && <image href={sprite} x={-node.r} y={-node.r} width={2 * node.r} height={2 * node.r} preserveAspectRatio="xMidYMid meet" pointerEvents="none" />}
          {node.surface && (
            // §10.5: membrane marker lines in the circle (legacy shows them only in the popup).
            <g pointerEvents="none" data-membrane-markers="">
              <line x1={-node.r * 0.6} y1={0} x2={node.r * 0.6} y2={0} stroke="green" strokeWidth={1} />
              <line x1={-node.r * 0.6} y1={-node.r * 0.3} x2={node.r * 0.6} y2={-node.r * 0.3} stroke="red" strokeWidth={1} />
              <line x1={-node.r * 0.6} y1={node.r * 0.3} x2={node.r * 0.6} y2={node.r * 0.3} stroke="blue" strokeWidth={1} />
            </g>
          )}
        </g>,
      )
      if (ingredientLabelVisible(ctx.hovered === id, ctx.view.k, ctx.labelOption)) {
        const g = ingredientLabelGeometry(node.r)
        labels.push(
          <g id={`label-${id}`} transform={translate(at.x, at.y)} dragologyZIndex={Z.labels} pointerEvents="none">
            <text transform={translate(g.x, g.y)} fontSize={g.fontSize} fontFamily={LABEL_FONT} textAnchor="middle" fill="black">
              {ingredientLabelText(data, ctx.labelOption)}
            </text>
          </g>,
        )
      }
    }
    // Links, edge to edge, with legacy's gradient fixed in world space (0,0)→(170,0) (§2.10, §8.6).
    const links = ctx.links.map((link) => {
      const s = shown.nodes[link.source]
      const t = shown.nodes[link.target]
      if (!s || !t) return null
      const e = linkEnds(abs.get(link.source)!, s.r, abs.get(link.target)!, t.r)
      const hovered = ctx.hoveredLink === link.key
      const selected = ctx.selectedLink === link.key
      const stroke = selected ? 'yellow' : hovered ? 'black' : `url(#gradient-${link.key})`
      return (
        <g id={`link-${link.key}`} dragologyZIndex={Z.links}>
          <defs>
            <linearGradient id={`gradient-${link.key}`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={170} y2={0}>
              <stop offset="0" stopColor={ctx.colors.get(link.source) ?? 'black'} />
              <stop offset="1" stopColor={ctx.colors.get(link.target) ?? 'black'} />
            </linearGradient>
          </defs>
          <line x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke={stroke} strokeWidth={ctx.strokeWidth} />
        </g>
      )
    })
    // Pairs of the multi-selection, yellow, from r/2 inside each (main.js:3944-3952, 5368-5395).
    const pairs: React.ReactElement[] = []
    if (ctx.selection.length % 2 === 0) {
      for (let i = 0; i + 1 < ctx.selection.length; i += 2) {
        const a = abs.get(ctx.selection[i])
        const b = abs.get(ctx.selection[i + 1])
        if (!a || !b) continue
        const ra = shown.nodes[ctx.selection[i]].r / 2
        const rb = shown.nodes[ctx.selection[i + 1]].r / 2
        const e = linkEnds(b, -rb, a, -ra)
        pairs.push(<line id={`pair-${i}`} x1={e.b.x} y1={e.b.y} x2={e.a.x} y2={e.a.y} stroke="yellow" strokeWidth={2} dragologyZIndex={Z.pairLines} />)
      }
    }
    const temp = shown.drag && drop?.target ? { from: abs.get(drop.target)!, to: abs.get(shown.drag.id)! } : null
    return (
      <g onClick={noop}>
        <rect className="recipe-canvas-background" width={ctx.width} height={ctx.height} fill={ctx.background} />
        <g id="view" transform={viewTransform}>
          {layers}
          {links}
          {pairs}
          {temp && <line id="temp-link" x1={temp.from.x} y1={temp.from.y} x2={temp.to.x} y2={temp.to.y} stroke="white" strokeWidth={2} dragologyZIndex={Z.tempLink} pointerEvents="none" />}
          {labels}
          {ctx.legend && (
            // In world space at the origin, so it pans and zooms (§2.9, §8.7).
            <g id="legend" dragologyZIndex={Z.legend} pointerEvents="none">
              {ctx.legend.entries.map((entry, i) => (
                <g transform={translate(0, i * ctx.legend!.h)}>
                  <rect y={ctx.legend!.ypad} width={ctx.legend!.w} height={ctx.legend!.h} fill={entry.color} stroke="black" />
                  <text x={ctx.legend!.w + ctx.legend!.ypad + 5} y={ctx.legend!.h + ctx.legend!.ypad - ctx.legend!.h / 2 + ctx.legend!.f / 2} fontSize={ctx.legend!.f} fontFamily={LABEL_FONT}>
                    {entry.label === '' ? 'unknown' : entry.label}
                  </text>
                </g>
              ))}
            </g>
          )}
        </g>
      </g>
    )
  }
}

/** A no-op click handler on the root: it turns on Dragology's click-versus-drag threshold for every node. */
function noop() {}
