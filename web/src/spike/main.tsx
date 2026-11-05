// Step-0 spike (recipe-view-port): is Dragology 0.1.7 fast and event-compatible enough for the
// Recipe view? Throwaway. Measured by tests/spike/measure.mjs. Not part of the app build.
import { Profiler, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DraggableRenderer, lessThan, param, scale, translate, type Draggable, type DragSpec } from 'dragology'
import { packEnclose, packSiblings } from 'd3-hierarchy'
import { interpolateHcl } from 'd3-interpolate'
import { scaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomTransform } from 'd3-zoom'
import { detectRecipeFormat, parseLegacyRecipe } from '../domain/recipe/parseLegacyRecipe'
import type { IngredientData, RecipeGraph } from '../domain/recipe/types'

const W = 1200
const H = 800

type VNode = {
  id: string
  name: string
  parent: string | null
  children: string[]
  leaf: boolean
  surface: boolean
  depth: number
  x: number // relative to the parent's centre (root: world)
  y: number
  r: number
  data: IngredientData | null
}
type S = {
  nodes: Record<string, VNode>
  order: string[] // BFS
  drag: { id: string; x: number; y: number } | null
  target: string | null
  targetSurface: boolean
  pushFor?: string // derived in render (no second preview render), applied on drop
}

const depthColor = scaleLinear<string>().domain([-1, 6]).range(['hsl(360,100%,100%)', 'hsl(228,30%,40%)']).interpolate(interpolateHcl)

// --- layout: legacy radii (size mode), packSiblings per compartment, group-by as an extra level ---
function buildState(graph: RecipeGraph, groupBy: string | null): S {
  const nodes: Record<string, VNode> = {}
  const idOf = new Map(graph.nodes.map((n, i) => [n, `n${i}`]))
  for (const n of graph.nodes) {
    const id = idOf.get(n)!
    const leaf = !n.children
    const data = leaf ? (n.data as IngredientData) : null
    nodes[id] = {
      id,
      name: n.data.name,
      parent: n.parent ? idOf.get(n.parent)! : null,
      children: (n.children ?? []).map((c) => idOf.get(c)!),
      leaf,
      surface: !!data?.surface,
      depth: 0,
      x: 0,
      y: 0,
      r: leaf ? Math.max(Number(data!.size) || 10, 1) : 50,
      data,
    }
  }
  const order = bfs(nodes, 'n0')
  for (const id of order) nodes[id].depth = nodes[id].parent ? nodes[nodes[id].parent!].depth + 1 : 0
  for (const id of [...order].reverse()) {
    const c = nodes[id]
    if (c.leaf) continue
    const interior = c.children.filter((k) => !nodes[k].surface || !c.parent)
    const groups = new Map<string, string[]>()
    for (const k of interior) {
      const key = groupBy && nodes[k].leaf ? String((nodes[k].data as Record<string, unknown>)[groupBy] ?? '') : `self-${k}`
      groups.set(key, [...(groups.get(key) ?? []), k])
    }
    const groupCircles = [...groups.values()].map((members) => {
      const circles = members.map((k) => ({ id: k, x: 0, y: 0, r: nodes[k].r * (nodes[k].leaf ? 1.15 : 1) + (nodes[k].leaf ? 0 : 5) }))
      packSiblings(circles)
      const e = members.length > 1 ? packEnclose(circles) : { x: circles[0].x, y: circles[0].y, r: circles[0].r }
      return { members: circles, x: 0, y: 0, r: e.r + (members.length > 1 ? 6 : 0), ex: e.x, ey: e.y }
    })
    if (groupCircles.length) packSiblings(groupCircles)
    const enclosing = groupCircles.length ? packEnclose(groupCircles) : { x: 0, y: 0, r: 25 }
    for (const g of groupCircles) {
      for (const m of g.members) {
        nodes[m.id].x = g.x - enclosing.x + m.x - g.ex
        nodes[m.id].y = g.y - enclosing.y + m.y - g.ey
      }
    }
    c.r = enclosing.r + 25
    const surf = c.children.filter((k) => nodes[k].surface && c.parent)
    surf.forEach((k, i) => {
      const a = (2 * Math.PI * i) / surf.length
      nodes[k].x = c.r * Math.cos(a)
      nodes[k].y = c.r * Math.sin(a)
    })
  }
  nodes.n0.x = W / 2
  nodes.n0.y = H / 2
  return { nodes, order, drag: null, target: null, targetSurface: false }
}

function bfs(nodes: Record<string, VNode>, rootId: string): string[] {
  const out = [rootId]
  for (let i = 0; i < out.length; i++) out.push(...nodes[out[i]].children)
  return out
}

function absPositions(s: S): Map<string, { x: number; y: number }> {
  const abs = new Map<string, { x: number; y: number }>()
  for (const id of s.order) {
    const n = s.nodes[id]
    if (s.drag && s.drag.id === id) abs.set(id, { x: s.drag.x, y: s.drag.y })
    else if (!n.parent) abs.set(id, { x: n.x, y: n.y })
    else {
      const p = abs.get(n.parent)!
      abs.set(id, { x: p.x + n.x, y: p.y + n.y })
    }
  }
  return abs
}

function absOf(s: S, id: string): { x: number; y: number } {
  if (s.drag && s.drag.id === id) return { x: s.drag.x, y: s.drag.y }
  let x = 0
  let y = 0
  for (let k: string | null = id; k; k = s.nodes[k].parent) {
    if (s.drag && s.drag.id === k) return { x: x + s.drag.x, y: y + s.drag.y }
    x += s.nodes[k].x
    y += s.nodes[k].y
  }
  return { x, y }
}

function subtree(s: S, id: string): Set<string> {
  return new Set(bfs(s.nodes, id))
}

function hitTest(s: S, abs: Map<string, { x: number; y: number }>, p: { x: number; y: number }): string {
  let best = s.order[0]
  for (const id of s.order) {
    const n = s.nodes[id]
    if (!n.parent) continue
    const a = abs.get(id)!
    if ((p.x - a.x) ** 2 + (p.y - a.y) ** 2 < n.r * n.r && n.depth > s.nodes[best].depth) best = id
  }
  return best
}

// --- our own "push neighbours": relax the dragged node's sibling overlaps (dragged fixed) ---
function pushNeighbours(s: S, id: string): S {
  const n = s.nodes[id]
  if (!n.parent) return s
  const parent = s.nodes[n.parent]
  const sibs = parent.children
  const pos = new Map<string, { x: number; y: number }>()
  let maxR = 0
  for (const k of sibs) {
    pos.set(k, { x: s.nodes[k].x, y: s.nodes[k].y })
    maxR = Math.max(maxR, s.nodes[k].r)
  }
  const cell = 2 * maxR + 1
  const grid = new Map<string, string[]>()
  const keyOf = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`
  for (const k of sibs) {
    const p = pos.get(k)!
    const key = keyOf(p.x, p.y)
    let list = grid.get(key)
    if (!list) grid.set(key, (list = []))
    list.push(k)
  }
  const queue = [id]
  const visits = new Map<string, number>()
  const moved = new Set<string>()
  while (queue.length) {
    const a = queue.shift()!
    const pa = pos.get(a)!
    const ra = s.nodes[a].r
    const cx = Math.floor(pa.x / cell)
    const cy = Math.floor(pa.y / cell)
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        for (const b of grid.get(`${gx},${gy}`) ?? []) {
          if (b === a || b === id) continue
          const pb = pos.get(b)!
          const nb = s.nodes[b]
          const dx = pb.x - pa.x
          const dy = pb.y - pa.y
          const dist = Math.hypot(dx, dy) || 1e-6
          const overlap = ra + nb.r - dist
          if (overlap <= 0) continue
          pb.x += (dx / dist) * overlap
          pb.y += (dy / dist) * overlap
          if (parent.parent) {
            const d = Math.hypot(pb.x, pb.y) || 1e-6
            const lim = nb.surface ? parent.r : Math.max(parent.r - 5 - nb.r - (nb.leaf ? 0 : 5), 0)
            if (nb.surface || d > lim) {
              pb.x = (pb.x / d) * lim
              pb.y = (pb.y / d) * lim
            }
          }
          moved.add(b)
          const v = (visits.get(b) ?? 0) + 1
          visits.set(b, v)
          if (v < 4) queue.push(b)
        }
      }
    }
  }
  if (!moved.size) return s
  const nodes = { ...s.nodes }
  for (const b of moved) nodes[b] = { ...nodes[b], x: pos.get(b)!.x, y: pos.get(b)!.y }
  return { ...s, nodes }
}

// --- Edit-Mode reparent preview and drop (legacy anotherSubject + dragended) ---
function previewReparent(s: S, id: string): S {
  if (!s.drag) return s
  const abs = absPositions(s)
  const sub = subtree(s, id)
  const r = s.nodes[id].r
  let best = s.order[0]
  for (const k of s.order) {
    if (sub.has(k) || !s.nodes[k].parent) continue
    const a = abs.get(k)!
    const dist = Math.hypot(a.x - s.drag.x, a.y - s.drag.y)
    if (dist < s.nodes[k].r + r && s.nodes[k].depth > s.nodes[best].depth) best = k
  }
  if (s.nodes[best].leaf) return { ...s, target: null, targetSurface: false }
  const a = abs.get(best)!
  const dist = Math.hypot(a.x - s.drag.x, a.y - s.drag.y)
  return { ...s, target: best, targetSurface: !!s.nodes[best].parent && Math.abs(s.nodes[best].r - dist) < r }
}

function finalizeReparent(s: S, id: string): S {
  if (!s.drag) return s
  const abs = absPositions(s)
  const n = s.nodes[id]
  const nodes = { ...s.nodes }
  const targetId = s.target ?? n.parent!
  const t = nodes[targetId]
  const ta = abs.get(targetId)!
  let x = s.drag.x - ta.x
  let y = s.drag.y - ta.y
  const surface = n.leaf ? s.targetSurface : false
  if (t.parent) {
    const d = Math.hypot(x, y) || 1e-6
    const lim = surface ? t.r : Math.max(t.r - 5 - n.r, 0)
    if (surface || d > lim) {
      x = (x / d) * lim
      y = (y / d) * lim
    }
  }
  if (targetId !== n.parent) {
    const old = nodes[n.parent!]
    nodes[old.id] = { ...old, children: old.children.filter((k) => k !== id) }
    nodes[targetId] = { ...t, children: [...t.children, id], r: t.r + n.r / 2 }
  }
  nodes[id] = { ...n, parent: targetId, x, y, surface }
  const order = bfs(nodes, s.order[0])
  for (const k of order) if (nodes[k].parent) nodes[k] = { ...nodes[k], depth: nodes[nodes[k].parent!].depth + 1 }
  return { nodes, order, drag: null, target: null, targetSurface: false }
}

function setPos(s: S, id: string, x: number, y: number): S {
  return { ...s, nodes: { ...s.nodes, [id]: { ...s.nodes[id], x, y } } }
}

declare global {
  interface Window {
    __beh: number[]
    __prof: number[]
    __evals: number
    __spike: Record<string, unknown>
  }
}
window.__beh = []
window.__evals = 0
window.__prof = []

function timed<T extends object>(spec: DragSpec<T>): DragSpec<T> {
  let t0 = 0
  return spec
    .changeFrame((f) => {
      t0 = performance.now()
      return f
    })
    .changeResult((r) => {
      window.__beh.push(performance.now() - t0)
      return r
    })
}

type Opts = {
  view: ZoomTransform
  hover: string | null
  selected: string[]
  editMode: boolean
  ctrlAtDown: { current: boolean }
  fast: boolean
  push: boolean
  constraintMode: boolean
}

function makeDraggable(o: Opts): Draggable<S> {
  return ({ state, d, draggedId, isTracking }) => {
    const viewT = translate(o.view.x, o.view.y) + scale(o.view.k)
    if (isTracking && o.fast && draggedId) {
      window.__evals++
      const id = draggedId.slice(2)
      const p = absOf(state, id)
      return (
        <g id="view" transform={viewT}>
          <g id={draggedId} transform={translate(p.x, p.y)}>
            <circle r={state.nodes[id].r} />
          </g>
        </g>
      )
    }
    if (state.pushFor) state = pushNeighbours(state, state.pushFor)
    if (state.drag) state = previewReparent(state, state.drag.id)
    const abs = absPositions(state)
    const after = (spec: DragSpec<S>, id: string) =>
      timed(o.push ? spec.onDrop((s) => ({ ...pushNeighbours(s, id), pushFor: undefined })) : spec)
    const withPush = (s: S, id: string): S => (o.push ? { ...s, pushFor: id } : s)
    const specFor = (id: string): DragSpec<S> => {
      const n = state.nodes[id]
      const parent = state.nodes[n.parent!]
      if (o.editMode && !o.ctrlAtDown.current) {
        const p = abs.get(id)!
        const s0: S = { ...state, drag: { id, x: p.x, y: p.y }, pushFor: undefined }
        return timed(
          d
            .vary(s0, [param('drag' as never, 'x' as never), param('drag' as never, 'y' as never)])
            .onDrop((s) => finalizeReparent(previewReparent(s, id), id)),
        )
      }
      if (n.leaf && n.surface && parent.parent) {
        const R = parent.r
        return after(d.varyFunc([Math.atan2(n.y, n.x)], ([t]) => withPush(setPos(state, id, R * Math.cos(t), R * Math.sin(t)), id)), id)
      }
      if (!parent.parent) return after(d.varyFunc([n.x, n.y], ([u, v]) => withPush(setPos(state, id, u, v), id)), id)
      const lim = Math.max(n.leaf ? parent.r - 5 - n.r : parent.r - 10 - n.r, 0)
      if (o.constraintMode)
        return after(
          d.vary(withPush(state, id), [param('nodes', id, 'x'), param('nodes', id, 'y')], {
            constraint: (s) => lessThan(s.nodes[id].x ** 2 + s.nodes[id].y ** 2, lim * lim),
          }),
          id,
        )
      return after(
        d.varyFunc([n.x, n.y], ([u, v]) => {
          const len = Math.hypot(u, v)
          return withPush(len <= lim ? setPos(state, id, u, v) : setPos(state, id, (u / len) * lim, (v / len) * lim), id)
        }),
        id,
      )
    }
    const sel = new Set(o.selected)
    const strokeW = 1
    const els = state.order.map((id) => {
      const n = state.nodes[id]
      if (!n.parent) return null
      const p = abs.get(id)!
      const dragged = state.drag?.id === id
      const fill = sel.has(id) ? 'yellow' : state.target === id && !state.targetSurface ? 'grey' : n.leaf ? 'rgb(120,160,200)' : depthColor(n.depth)
      const stroke = sel.has(id) ? 'orange' : o.hover === id ? 'black' : state.target === id && state.targetSurface ? 'yellow' : depthColor(n.depth + 1)
      if (!n.leaf) {
        const letters = Array.from(n.name.replace(/ and /g, ' & '))
        const fs = Math.max(Math.round(n.r / 10), 10)
        return (
          <g id={`c-${id}`} transform={translate(p.x, p.y)} dragologyZIndex={dragged ? '/1' : n.depth} dragologyOnDrag={() => specFor(id)} data-node={n.name}>
            <circle r={n.r + 5} fill={fill} />
            <circle r={n.r + 5} fill="none" stroke={stroke} strokeWidth={strokeW} />
            <circle r={n.r - 5} fill="none" stroke={stroke} strokeWidth={strokeW} />
            {letters.map((ch, i) => (
              <text transform={`rotate(${-60 + (i * fs * 0.6 * 180) / (Math.PI * (n.r + 5))}) translate(0,${-(n.r + 7)})`} fontSize={fs} fontFamily="Oswald" textAnchor="middle">
                {ch}
              </text>
            ))}
          </g>
        )
      }
      return (
        <g id={`i-${id}`} transform={translate(p.x, p.y)} dragologyZIndex={dragged ? '/1' : 20} dragologyOnDrag={() => specFor(id)} data-node={n.name}>
          <circle r={n.r} fill={dragged ? 'rgba(55,55,255,0.3)' : fill} stroke={stroke} strokeWidth={strokeW} />
          <image href={SPRITE} x={-n.r} y={-n.r} width={2 * n.r} height={2 * n.r} />
          {o.hover === id && (
            <text transform={translate(-n.r, n.r + Math.round(n.r / 2))} fontSize={Math.max(Math.round(n.r / 2), 5)} fontFamily="Georgia" textAnchor="middle">
              {n.name}
            </text>
          )}
        </g>
      )
    })
    const t = state.target && state.drag ? abs.get(state.target)! : null
    return (
      <g onClick={() => {}}>
        <rect width={W} height={H} fill="rgb(225,225,225)" />
        <g id="view" transform={viewT}>
          {els}
          {t && state.drag && <line id="temp-link" x1={t.x} y1={t.y} x2={state.drag.x} y2={state.drag.y} stroke="white" strokeWidth={2} dragologyZIndex={30} />}
        </g>
      </g>
    )
  }
}

const SPRITE = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><circle cx="4" cy="4" r="3" fill="#a55"/></svg>')

function Spike() {
  const [graph, setGraph] = useState<RecipeGraph | null>(null)
  const [state, setState] = useState<S | null>(null)
  const [view, setView] = useState<ZoomTransform>(zoomIdentity)
  const [hover, setHover] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [editMode, setEditMode] = useState(false)
  const [fast, setFast] = useState(true)
  const [push, setPush] = useState(true)
  const [constraintMode, setConstraintMode] = useState(false)
  const downAt = useRef<{ x: number; y: number } | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const ctrlAtDown = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const viewRef = useRef(view)
  viewRef.current = view
  const zoomRef = useRef<ReturnType<typeof zoom<HTMLDivElement, unknown>> | null>(null)

  window.__spike = {
    load: (json: unknown) => {
      const g = parseLegacyRecipe(json, detectRecipeFormat(json))
      setGraph(g)
      setState(buildState(g, null))
    },
    groupBy: (key: string | null) => graph && setState(buildState(graph, key)),
    setEditMode,
    setFast,
    setPush,
    setConstraintMode,
    setView: (x: number, y: number, k: number) => zoomRef.current && select(wrapRef.current!).call(zoomRef.current.transform, zoomIdentity.translate(x, y).scale(k)),
    fit: () => {
      const st = stateRef.current
      if (!st || !zoomRef.current) return
      const abs = absPositions(st)
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (const id of st.order) {
        if (!st.nodes[id].parent) continue
        const a = abs.get(id)!, r = st.nodes[id].r + 10
        x0 = Math.min(x0, a.x - r); y0 = Math.min(y0, a.y - r); x1 = Math.max(x1, a.x + r); y1 = Math.max(y1, a.y + r)
      }
      const k = Math.min(W / (x1 - x0), H / (y1 - y0))
      select(wrapRef.current!).call(zoomRef.current.transform, zoomIdentity.translate(W / 2 - (k * (x0 + x1)) / 2, H / 2 - (k * (y0 + y1)) / 2).scale(k))
    },
    get: () => ({ state: stateRef.current, view: viewRef.current, hover, selected, menu, editMode }),
  }

  useEffect(() => {
    const el = wrapRef.current!
    const z = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.2, 20])
      .filter((e: Event) => e.type === 'wheel' || e.type === 'dblclick' || (e.type === 'mousedown' && (e as MouseEvent).button === 1))
      .on('zoom', (e: { transform: ZoomTransform }) => setView(e.transform))
    zoomRef.current = z
    select(el).call(z)
    const capture = (e: PointerEvent) => {
      ctrlAtDown.current = e.ctrlKey || e.metaKey
      if (e.button !== 0) e.stopPropagation()
    }
    el.addEventListener('pointerdown', capture, true)
    return () => el.removeEventListener('pointerdown', capture, true)
  }, [])

  const draggable = useMemo(
    () =>
      makeDraggable({
        view,
        hover,
        selected,
        editMode,
        ctrlAtDown,
        fast,
        push,
        constraintMode,
      }),
    [view, hover, selected, editMode, fast, push, constraintMode],
  )

  const toWorld = (e: React.MouseEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect()
    const w = viewRef.current.invert([e.clientX - rect.left, e.clientY - rect.top])
    return { x: w[0], y: w[1] }
  }

  return (
    <div
      ref={wrapRef}
      style={{ width: W, height: H, overflow: 'hidden', position: 'relative' }}
      onPointerMove={(e) => {
        const s = stateRef.current
        if (!s || s.drag) return
        const id = hitTest(s, absPositions(s), toWorld(e))
        const next = id === 'n0' ? null : id
        if (next !== hover) setHover(next)
      }}
      onPointerDownCapture={(e) => {
        downAt.current = e.button === 0 ? { x: e.clientX, y: e.clientY } : null
      }}
      onPointerUp={(e) => {
        const d0 = downAt.current
        downAt.current = null
        const s = stateRef.current
        if (!d0 || !s || Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 2) return
        const id = hitTest(s, absPositions(s), toWorld(e))
        const ctrl = e.ctrlKey || e.metaKey
        setSelected((cur) => (id === 'n0' ? [] : ctrl ? [...cur, id] : [id]))
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        if (e.ctrlKey && e.button === 0) return
        const s = stateRef.current
        if (!s) return
        const id = hitTest(s, absPositions(s), toWorld(e))
        setMenu(id === 'n0' ? null : { x: e.clientX, y: e.clientY, id })
      }}
    >
      {state && (
        <Profiler id="dr" onRender={(_id, _phase, actual) => window.__prof.push(actual)}>
          <DraggableRenderer draggable={draggable} state={state} onDropState={setState} width={W} height={H} />
        </Profiler>
      )}
      {menu && (
        <div id="spike-menu" style={{ position: 'fixed', left: menu.x, top: menu.y, background: 'white', border: '1px solid black' }}>
          menu {state?.nodes[menu.id].name}
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Spike />)
