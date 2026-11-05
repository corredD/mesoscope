// The Recipe view panel on a 2D canvas (recipe-view.md §2, §4, §7, §10; rows 44-79). jsdom draws nothing, so
// `getContext` is a recording fake; gestures are real DOM mouse events through d3-drag; frames run when the test says.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { StrictMode } from 'react'
import { act, cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecipeCanvas } from '../src/components/recipe/RecipeCanvas'
import type { RecipeViewProbe } from '../src/components/recipe/recipeView'
import { parseLegacyRecipe } from '../src/domain/recipe/parseLegacyRecipe'
import { defaultMergeFieldFlags } from '../src/domain/recipe/mergeRecipe'
import type { RecipeNode } from '../src/domain/recipe/types'
import { useRecipeStore } from '../src/state/recipeStore'
import { useThemeStore } from '../src/state/themeStore'
import { useUiModeStore } from '../src/state/uiModeStore'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}
const loadRecipe = (name: string) => act(() => useRecipeStore.getState().loadFromJson(loadFixture(name)))
const store = () => useRecipeStore.getState()
const ui = () => useUiModeStore.getState()
const nodeByName = (name: string): RecipeNode => store().graph!.nodes.find((n) => n.data.name === name)!

// ---- the canvas: a recording 2D context ------------------------------------------------------------------------

interface Call {
  name: string
  args: unknown[]
  /** `fillStyle` when the call was made (a `fillRect`'s colour). */
  fillStyle: unknown
}

function recordingContext() {
  const calls: Call[] = []
  const state: Record<string, unknown> = { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic' }
  const ctx = new Proxy(
    {},
    {
      get(_, prop: string) {
        if (prop in state) return state[prop]
        if (prop === 'measureText') return (text: string) => ({ width: text.length * 5 })
        if (prop === 'createLinearGradient') return () => ({ addColorStop() {} })
        return (...args: unknown[]) => void calls.push({ name: prop, args, fillStyle: state.fillStyle })
      },
      set(_, prop: string, value) {
        state[prop] = value
        return true
      },
    },
  ) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

// ---- frames: requestAnimationFrame under the test's control ----------------------------------------------------

let queue = new Map<number, FrameRequestCallback>()
let nextFrame = 1
/** Runs `n` frames: each runs what was requested before it, and what that requests waits for the next. */
function frames(n = 1) {
  for (let i = 0; i < n; i++) {
    const due = [...queue.values()]
    queue = new Map()
    for (const cb of due) cb(performance.now())
  }
}

let rec: ReturnType<typeof recordingContext>
const realRect = Element.prototype.getBoundingClientRect

/** A measured panel: jsdom's rects are all zero, so the canvas would keep its 600x600 default. */
function measure(width: number, height: number) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON() {} } as DOMRect)
}

beforeEach(() => {
  queue = new Map()
  nextFrame = 1
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queue.set(nextFrame, cb)
    return nextFrame++
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => void queue.delete(id))
  rec = recordingContext()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => rec.ctx as never)
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null, selectedLink: null })
  useUiModeStore.setState({ editMode: false, editModeToggled: false, selectedNodes: [], visitedNodes: new Set() })
  useThemeStore.setState({ theme: 'light' })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Element.prototype.getBoundingClientRect = realRect
})

// ---- what the test sees and does -------------------------------------------------------------------------------

type P = ReturnType<RecipeViewProbe['nodes']>[number]
const canvasEl = () => screen.getByTestId('recipe-canvas') as HTMLCanvasElement
const probe = () => (canvasEl().parentElement as unknown as { __recipeView: RecipeViewProbe }).__recipeView
const nodes = () => probe().nodes()
const named = (name: string): P => nodes().find((n) => n.name === name)!

/** Legacy's pick on the probe's nodes (deepest containing disk, ties to the first), independent of `hitTest.ts`. */
function deepestAt(list: P[], x: number, y: number): number {
  let best = 0
  list.forEach((n, i) => {
    if (n.parent !== null && n.depth > list[best].depth && (x - n.x) ** 2 + (y - n.y) ** 2 < n.r * n.r) best = i
  })
  return best
}

/** A point inside `name`'s disk that no deeper node covers. */
function freePointIn(name: string): { x: number; y: number } {
  const list = nodes()
  const i = list.findIndex((n) => n.name === name)
  const c = list[i]
  for (let r = 0.2; r < 1; r += 0.05)
    for (let a = 0; a < 2 * Math.PI; a += 0.2) {
      const x = c.x + Math.cos(a) * c.r * r
      const y = c.y + Math.sin(a) * c.r * r
      if (deepestAt(list, x, y) === i) return { x, y }
    }
  throw new Error(`no free point in ${name}`)
}

/** An ingredient's centre when nothing else covers it, so a press there picks it. */
function centreOf(name: string): { x: number; y: number } {
  const list = nodes()
  const i = list.findIndex((n) => n.name === name)
  if (deepestAt(list, list[i].x, list[i].y) !== i) throw new Error(`${name} is covered`)
  return { x: list[i].x, y: list[i].y }
}

const win = window
/** A mouse event with a `view`, which d3-drag reads to listen for the move and the release (jsdom refuses a global as one). */
function mouse(type: 'mouseDown' | 'mouseUp' | 'mouseMove', target: Element | Window, init: MouseEventInit) {
  const event = createEvent[type](target, init)
  Object.defineProperty(event, 'view', { value: win })
  fireEvent(target, event)
}
const FAR = { x: 5000, y: 5000 }

/** A left press and release (d3-drag: `mousedown` on the canvas, `mouseup` on the window); the zoom is the identity. */
function press(at: { x: number; y: number }, extra: MouseEventInit = {}) {
  mouse('mouseDown', canvasEl(), { clientX: at.x, clientY: at.y, button: 0, ...extra })
  mouse('mouseUp', win, { clientX: at.x, clientY: at.y, button: 0, ...extra })
}

function rightClick(at: { x: number; y: number }) {
  fireEvent.contextMenu(canvasEl(), { clientX: at.x, clientY: at.y, button: 2 })
}
const menu = () => document.querySelector('.recipe-canvas-context-menu') as HTMLElement | null

/** The background colour of the last frame: `fillRect` right after the frame's `clearRect`. */
function lastBackground(): unknown {
  const i = rec.calls.map((c) => c.name).lastIndexOf('clearRect')
  return rec.calls.slice(i).find((c) => c.name === 'fillRect')?.fillStyle
}
const fillTexts = () => rec.calls.filter((c) => c.name === 'fillText').map((c) => c.args[0])

// ---------------------------------------------------------------------------------------------------------------

describe('RecipeCanvas: the panel', () => {
  it('shows a message without a recipe, a canvas with one', () => {
    render(<RecipeCanvas />)
    expect(screen.getByText(/No recipe loaded/)).toBeInTheDocument()
    cleanup()
    loadRecipe('InfluenzaA.json')
    render(<RecipeCanvas />)
    expect(screen.queryByText(/No recipe loaded/)).not.toBeInTheDocument()
    expect(document.querySelectorAll('canvas.recipe-canvas')).toHaveLength(1)
    expect(document.querySelector('svg.recipe-canvas')).not.toBeInTheDocument()
    expect(nodes()).toHaveLength(store().graph!.nodes.length)
  })

  it('HiDPI: the bitmap is the panel times devicePixelRatio and the first draw call is setTransform(dpr...) (§10.1, row 2)', () => {
    vi.stubGlobal('devicePixelRatio', 2)
    measure(800, 400)
    loadRecipe('InfluenzaA.json')
    render(<RecipeCanvas />)
    const canvas = canvasEl()
    expect(canvas.width).toBe(1600)
    expect(canvas.height).toBe(800)
    frames(1)
    expect(rec.calls[0]).toMatchObject({ name: 'setTransform', args: [2, 0, 0, 2, 0, 0] })
    // The background covers the CSS size, not the bitmap.
    expect(rec.calls.find((c) => c.name === 'fillRect')!.args).toEqual([0, 0, 800, 400])
  })

  it('light theme: the background is the root colour; dark theme: the theme colour (§10.3, row 24)', () => {
    loadRecipe('InfluenzaA.json')
    act(() => store().setNodeColor(store().graph!.nodes[0], '#ff0000'))
    render(<RecipeCanvas />)
    frames(1)
    expect(lastBackground()).toBe('rgb(255,0,0)')

    act(() => useThemeStore.setState({ theme: 'dark' }))
    frames(1)
    // jsdom loads no stylesheet, so this is the component's fallback, which is the dark `--color-recipe-canvas-bg`.
    const css = readFileSync(resolve(__dirname, '../src/styles/theme.css'), 'utf-8')
    const dark = [...css.matchAll(/--color-recipe-canvas-bg:\s*(#[0-9a-f]+)/gi)].at(-1)![1]
    expect(lastBackground()).toBe(dark)

    act(() => useThemeStore.setState({ theme: 'light' }))
    frames(1)
    expect(lastBackground()).toBe('rgb(255,0,0)')
  })

  it('the dark background follows the theme attribute set after the effect ran (§10.3; review M3)', async () => {
    // AppShell sets data-theme in its own passive effect, after this component's: the token is read through it.
    const real = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
      const style = real(el, pseudo)
      const dark = document.documentElement.dataset.theme === 'dark'
      return new Proxy(style, {
        get: (t, k) => (k === 'getPropertyValue' ? (n: string) => (n === '--color-recipe-canvas-bg' ? (dark ? '#171a1f' : '#e1e1e1') : t.getPropertyValue(n)) : Reflect.get(t, k)),
      })
    })
    document.documentElement.dataset.theme = 'light'
    loadRecipe('InfluenzaA.json')
    render(<RecipeCanvas />)
    act(() => useThemeStore.setState({ theme: 'dark' }))
    await act(async () => {
      document.documentElement.dataset.theme = 'dark'
    })
    frames(1)
    expect(lastBackground()).toBe('#171a1f')
    delete document.documentElement.dataset.theme
  })

  it('a recipe without a root colour has legacy\'s grey background (§2.2, row 24)', () => {
    loadRecipe('InfluenzaA.json')
    render(<RecipeCanvas />)
    frames(1)
    expect(lastBackground()).toBe('rgb(224,224,224)')
  })

  it('unmounts cleanly with a frame pending, and a StrictMode mount-unmount-remount keeps one canvas and one scene', () => {
    loadRecipe('InfluenzaA.json')
    const { unmount } = render(<RecipeCanvas />)
    expect(() => unmount()).not.toThrow()
    expect(queue.size).toBe(0) // the pending frame was cancelled

    expect(() =>
      render(
        <StrictMode>
          <RecipeCanvas />
        </StrictMode>,
      ),
    ).not.toThrow()
    expect(document.querySelectorAll('canvas')).toHaveLength(1)
    expect(nodes()).toHaveLength(store().graph!.nodes.length)
    expect(() => frames(3)).not.toThrow()
    expect(probe().frames()).toBeGreaterThan(0)
  })
})

describe('RecipeCanvas: selection by click (rows 49, 50, 63, 64, 65)', () => {
  beforeEach(() => {
    loadRecipe('InfluenzaA.json')
    render(<RecipeCanvas />)
  })

  it('a click on an ingredient selects it, makes it the multi-selection and marks it visited', () => {
    const ha = nodeByName('Hemagglutinin')
    press(centreOf('Hemagglutinin'))
    expect(store().selectedNode).toBe(ha)
    expect(ui().selectedNodes).toEqual([ha])
    expect(ui().visitedNodes.has(ha)).toBe(true)
    press(centreOf('Neuraminidase'))
    expect(store().selectedNode).toBe(nodeByName('Neuraminidase'))
    expect(ui().selectedNodes).toEqual([nodeByName('Neuraminidase')])
  })

  it('highlights on mousedown; the selection side effects (store, visit) wait for the release (§4.5, row 63)', () => {
    // Legacy sets `node_selected` at drag start but loads the table, viewers and visit only at drag end (main.js:5106-5262):
    // selecting in the store at the press would load the Ingredient View's structure in the middle of a drag.
    const at = centreOf('Hemagglutinin')
    mouse('mouseDown', canvasEl(), { clientX: at.x, clientY: at.y, button: 0 })
    expect(store().selectedNode).toBeNull()
    expect(ui().selectedNodes).toEqual([])
    expect(ui().visitedNodes.size).toBe(0)
    rec.calls.length = 0
    frames(1)
    expect(rec.calls.some((c) => c.name === 'fill' && c.fillStyle === 'yellow')).toBe(true)
    mouse('mouseUp', win, { clientX: at.x, clientY: at.y, button: 0 })
    expect(store().selectedNode).toBe(nodeByName('Hemagglutinin'))
    expect(ui().selectedNodes).toEqual([nodeByName('Hemagglutinin')])
    expect(ui().visitedNodes.has(nodeByName('Hemagglutinin'))).toBe(true)
  })

  it('a click on empty canvas clears the selection and the multi-selection (row 50)', () => {
    act(() => {
      store().selectNode(nodeByName('Hemagglutinin'))
      ui().setSelection([nodeByName('Hemagglutinin')])
    })
    press(FAR)
    expect(store().selectedNode).toBeNull()
    expect(ui().selectedNodes).toEqual([])
  })

  it('a click inside a compartment selects it in view mode (row 49) and clears in Edit Mode (row 64)', () => {
    const envelope = nodeByName('envelope')
    const inside = freePointIn('envelope')
    press(inside)
    expect(store().selectedNode).toBe(envelope)
    expect(ui().selectedNodes).toEqual([envelope])

    act(() => {
      ui().toggleEditMode()
      store().selectNode(nodeByName('Hemagglutinin'))
      ui().setSelection([nodeByName('Hemagglutinin')])
    })
    mouse('mouseDown', canvasEl(), { clientX: inside.x, clientY: inside.y, button: 0 })
    mouse('mouseUp', win, { clientX: inside.x, clientY: inside.y, button: 0 })
    // The drop of that no-move drag then selects its subject, as legacy's `dragended` (row 64): no multi-selection.
    expect(store().selectedNode).toBe(envelope)
    expect(ui().selectedNodes).toEqual([])
  })

  it.each([false, true])('Ctrl-click adds to the multi-selection, once only (row 65), Edit Mode %s', (edit) => {
    if (edit) act(() => ui().toggleEditMode())
    const ha = nodeByName('Hemagglutinin')
    const na = nodeByName('Neuraminidase')
    press(centreOf('Hemagglutinin'), { ctrlKey: true })
    press(centreOf('Hemagglutinin'), { ctrlKey: true })
    expect(ui().selectedNodes).toEqual([ha])
    press(centreOf('Neuraminidase'), { ctrlKey: true })
    expect(ui().selectedNodes).toEqual([ha, na])
    press(centreOf('Neuraminidase'), { ctrlKey: true })
    expect(ui().selectedNodes).toEqual([ha, na])
    // A plain click starts over.
    press(centreOf('Hemagglutinin'))
    expect(ui().selectedNodes).toEqual([ha])
  })

  it('a click on a link selects the link and both its ends (row 47)', () => {
    const ha = nodeByName('Hemagglutinin')
    const na = nodeByName('Neuraminidase')
    act(() => store().addLink(ha, na))
    const [a, b] = [named('Hemagglutinin'), named('Neuraminidase')]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    // The middle of the edge-to-edge segment, when no node covers it.
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    expect(d).toBeGreaterThan(a.r + b.r)
    expect(nodes()[deepestAt(nodes(), mid.x, mid.y)].leaf).toBe(false)
    press(mid)
    expect(store().selectedLink).toBe(store().graph!.links[0])
    expect(ui().selectedNodes).toEqual([ha, na])
  })
})

describe('RecipeCanvas: the context menu (§10.7, §8.12, rows 70-76)', () => {
  beforeEach(() => {
    loadRecipe('InfluenzaA.json')
    render(<RecipeCanvas />)
  })

  it('a right-click on a node opens the menu with its name', () => {
    rightClick(centreOf('Hemagglutinin'))
    expect(menu()).toHaveTextContent('Hemagglutinin')
    for (const name of ['Rename', 'Delete', 'Resize']) expect(screen.getByRole('button', { name })).toBeInTheDocument()
    rightClick(freePointIn('envelope'))
    expect(menu()).toHaveTextContent('envelope')
  })

  it('the menu opens at the pointer, in viewport coordinates (position: fixed; review M2)', () => {
    vi.spyOn(HTMLDivElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 50, x: 100, y: 50, right: 900, bottom: 450, width: 800, height: 400, toJSON() {} })
    const at = centreOf('Hemagglutinin')
    rightClick(at)
    expect(menu()!.style.left).toBe(`${at.x}px`)
    expect(menu()!.style.top).toBe(`${at.y}px`)
  })

  it('a colour pick commits on change, not on every input event (review S3)', () => {
    rightClick(centreOf('Hemagglutinin'))
    const input = screen.getByLabelText('Node color')
    const before = store().graph
    fireEvent.input(input, { target: { value: '#123456' } })
    expect(store().graph).toBe(before)
    fireEvent.change(input, { target: { value: '#123456' } })
    expect(store().graph).not.toBe(before)
  })

  it('a resize below what draws is ignored: the frame loop never throws (review N1)', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('3')
    rightClick(freePointIn('envelope'))
    fireEvent.click(screen.getByRole('button', { name: 'Resize' }))
    expect(() => frames(2)).not.toThrow()
    expect(named('envelope').r).toBeGreaterThanOrEqual(5)
  })

  it('a right-click on empty canvas opens none (nothing deletes the root)', () => {
    rightClick(FAR)
    expect(menu()).toBeNull()
  })

  it('a right-click on a link opens none', () => {
    act(() => store().addLink(nodeByName('Hemagglutinin'), nodeByName('Neuraminidase')))
    const [a, b] = [named('Hemagglutinin'), named('Neuraminidase')]
    rightClick({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    expect(menu()).toBeNull()
  })

  it('a press inside the open menu selects nothing, and a press on the canvas closes it', () => {
    const at = centreOf('Hemagglutinin')
    rightClick(at)
    const m = menu()!
    mouse('mouseDown', m, { clientX: at.x, clientY: at.y, button: 0 })
    fireEvent.pointerDown(m, { clientX: at.x, clientY: at.y, button: 0 })
    mouse('mouseUp', win, { clientX: at.x, clientY: at.y, button: 0 })
    expect(store().selectedNode).toBeNull()
    expect(ui().selectedNodes).toEqual([])
    expect(menu()).not.toBeNull()
    press(FAR)
    expect(menu()).toBeNull()
  })

  it('Rename asks for a name and renames (row 76)', () => {
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Hemag')
    rightClick(centreOf('Hemagglutinin'))
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))
    expect(prompt).toHaveBeenCalled()
    expect(nodeByName('Hemag')).toBeDefined()
    expect(store().graph!.nodes.some((n) => n.data.name === 'Hemagglutinin')).toBe(false)
    expect(menu()).toBeNull()
    expect(nodes().some((n) => n.name === 'Hemag')).toBe(true)
  })

  it('a cancelled prompt changes nothing', () => {
    vi.spyOn(window, 'prompt').mockReturnValue(null)
    rightClick(centreOf('Hemagglutinin'))
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))
    expect(nodeByName('Hemagglutinin')).toBeDefined()
  })

  it('Delete on an ingredient removes it from the recipe and the canvas', () => {
    rightClick(centreOf('Hemagglutinin'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(store().graph!.nodes.some((n) => n.data.name === 'Hemagglutinin')).toBe(false)
    expect(nodes().some((n) => n.name === 'Hemagglutinin')).toBe(false)
    expect(menu()).toBeNull()
  })

  it('Resize sets the radius, and an ingredient\'s size (row 71)', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('42')
    rightClick(centreOf('Hemagglutinin'))
    fireEvent.click(screen.getByRole('button', { name: 'Resize' }))
    expect(named('Hemagglutinin').r).toBe(42)
    expect((nodeByName('Hemagglutinin').data as { size: number }).size).toBe(42)

    rightClick(freePointIn('envelope'))
    fireEvent.click(screen.getByRole('button', { name: 'Resize' }))
    expect(named('envelope').r).toBe(42)
    expect(nodeByName('envelope').data).not.toHaveProperty('size')
    expect(() => frames(2)).not.toThrow()
  })

  it('Resize with a non-number does nothing', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('big')
    const before = named('Hemagglutinin').r
    rightClick(centreOf('Hemagglutinin'))
    fireEvent.click(screen.getByRole('button', { name: 'Resize' }))
    expect(named('Hemagglutinin').r).toBe(before)
  })
})

describe('RecipeCanvas: Delete on a compartment (§10.7, §8.11, row 75)', () => {
  it('deletes its subtree and the links to it without throwing', () => {
    loadRecipe('HIV_serialized.json')
    render(<RecipeCanvas />)
    const inner = 'HIV1_capsid_3j3q_PackInner_0_1_0' // a compartment of five ingredients, inside the capsid
    const compartment = nodeByName(inner)
    const subtree = [compartment, ...compartment.children!]
    expect(subtree).toHaveLength(6)
    const outside = nodeByName('HIV1_MA_Hyb_0_1_0')
    act(() => store().addLink(compartment.children![0], outside))
    const before = store().graph!.nodes.length

    rightClick(freePointIn(inner))
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Delete' }))).not.toThrow()
    const after = store().graph!
    expect(after.nodes.length).toBe(before - 6)
    for (const n of subtree) expect(after.nodes).not.toContain(n)
    expect(after.nodes).toContain(outside)
    expect(after.links).toEqual([])
    expect(nodes()).toHaveLength(after.nodes.length)
    expect(() => frames(3)).not.toThrow()
  })
})

describe('RecipeCanvas: adding nodes keeps the layout (§1.9, §7.1-§7.2, rows 9, 77, 78)', () => {
  const key = (n: P) => `${n.name}|${n.depth}|${n.r}|${n.x}|${n.y}`

  it.each([
    ['ingredient', 30, () => store().addIngredient()],
    ['compartment', 150, () => store().addCompartment()],
  ])('a new %s appears at the canvas centre with r %i; every other node stays where it is', (_, r, add) => {
    measure(800, 400)
    loadRecipe('InfluenzaA.json')
    render(<RecipeCanvas />)
    frames(5) // the simulation has moved things from the seeds: positions are not the layout's
    const before = nodes().map(key)
    act(add)
    const added = store().graph!.nodes.at(-1)!.data.name
    const after = nodes()
    const fresh = after.filter((n) => n.name === added)
    expect(fresh).toHaveLength(1)
    expect(fresh[0]).toMatchObject({ x: 400, y: 200, r, parent: 'InfluenzaA' })
    expect(after.filter((n) => n.name !== added).map(key).sort()).toEqual([...before].sort())
  })

  it('appending a recipe lays the whole thing out again: new nodes do not pile up at the centre', () => {
    measure(800, 400)
    loadRecipe('InfluenzaA.json')
    render(<RecipeCanvas />)
    const incoming = parseLegacyRecipe(loadFixture('Mpn_1.0_2.json') as never, 'classic')
    act(() => store().mergeGraph(incoming, { fieldFlags: defaultMergeFieldFlags(), createWhenMerge: true }))
    const list = nodes()
    expect(list.length).toBe(store().graph!.nodes.length)
    expect(list.length).toBeGreaterThan(50)
    const spots = new Set(list.map((n) => `${n.x.toFixed(3)},${n.y.toFixed(3)}`))
    expect(spots.size).toBe(list.length)
    expect(list.filter((n) => n.x === 400 && n.y === 200).length).toBeLessThanOrEqual(1)
    expect(Math.max(...list.map((n) => n.x)) - Math.min(...list.map((n) => n.x))).toBeGreaterThan(200)
  })
})

describe('RecipeCanvas: Edit Mode drag (rows 35, 66-68)', () => {
  it('dragging a nested ingredient onto empty space reparents it to the root, and the root label gets a *', () => {
    loadRecipe('InfluenzaA.json')
    render(<RecipeCanvas />)
    act(() => ui().toggleEditMode())
    const root = store().graph!.nodes[0]
    const ha = nodeByName('Hemagglutinin')
    expect(ha.parent!.data.name).toBe('envelope')
    frames(1)
    expect(fillTexts()).toContain('InfluenzaA')
    expect(fillTexts()).not.toContain('InfluenzaA*')

    const from = centreOf('Hemagglutinin')
    mouse('mouseDown', canvasEl(), { clientX: from.x, clientY: from.y, button: 0 })
    mouse('mouseMove', win, { clientX: FAR.x, clientY: FAR.y, button: 0 })
    frames(1) // the pin takes the node there
    expect(named('Hemagglutinin')).toMatchObject({ x: FAR.x, y: FAR.y })
    mouse('mouseUp', win, { clientX: FAR.x, clientY: FAR.y, button: 0 })

    expect(ha.parent).toBe(root)
    expect(root.children).toContain(ha)
    expect(nodeByName('envelope').children).not.toContain(ha)
    expect(store().selectedNode).toBe(ha) // legacy selects the subject after a drop
    expect(named('Hemagglutinin').parent).toBe('InfluenzaA')
    rec.calls.length = 0
    frames(1)
    expect(fillTexts()).toContain('InfluenzaA*')
  })

  it('outside Edit Mode the same drag moves the node but not its place in the tree', () => {
    loadRecipe('InfluenzaA.json')
    render(<RecipeCanvas />)
    const from = centreOf('Hemagglutinin')
    mouse('mouseDown', canvasEl(), { clientX: from.x, clientY: from.y, button: 0 })
    mouse('mouseMove', win, { clientX: from.x + 10, clientY: from.y, button: 0 })
    frames(1)
    mouse('mouseUp', win, { clientX: from.x + 10, clientY: from.y, button: 0 })
    expect(nodeByName('Hemagglutinin').parent!.data.name).toBe('envelope')
    expect(fillTexts()).not.toContain('InfluenzaA*')
  })
})

describe('RecipeCanvas with no recipe (review M1)', () => {
  it('a left press does not throw', () => {
    act(() => useRecipeStore.setState({ graph: null }))
    render(<RecipeCanvas />)
    expect(() => {
      mouse('mouseDown', canvasEl(), { clientX: 10, clientY: 10, button: 0 })
      mouse('mouseMove', win, { clientX: 90, clientY: 50, button: 0 })
      mouse('mouseUp', win, { clientX: 90, clientY: 50, button: 0 })
    }).not.toThrow()
  })
})
