/**
 * One frame of the Recipe view, as legacy's `ticked` draws it (recipe-view.md §2.2, main.js:3892-4042; row 29):
 * background, then in the zoom transform compartments by depth, links, ingredients (with sprites and the §10.6
 * membrane markers), selection pair lines, the Edit-Mode temporary link, labels, the popup (screen space) and the
 * legend (world space, §8.7). The calls are legacy's, call for call where the oracle recorded them (`moveTo` before
 * `beginPath`, the compartment's two arcs in one path), so the recording mock test can compare them.
 *
 * Nothing is allocated per frame: colours, fonts, title layouts and link gradients are cached and rebuilt only when
 * their inputs change.
 */
import { depthColor } from './colors'
import { ROTATION_TEXT, TITLE_FONT, ingredientLabelText, ingredientLabelVisible } from './labels'
import { FLOAT_DEPTH, type SimLink, type SimNode } from './simulation'
import type { IngredientData } from '../types'

export interface Transform {
  x: number
  y: number
  k: number
}

export interface LegendEntry {
  label: string
  color: string
}

/** What a frame shows besides the nodes. The owner mutates it in place; `drawFrame` only reads it. */
export interface Scene {
  /** Breadth-first (legacy `graph.nodes`). */
  nodes: SimNode[]
  /** The same nodes by depth, ascending, stable (legacy sorts a copy each frame, main.js:3931-3933). */
  sorted: SimNode[]
  links: SimLink[]
  /** `colorNode` per node (§6.2), from the colour mode. */
  fill: ReadonlyMap<SimNode, string>
  /** §10.3: the theme's in dark mode, else the root colour. */
  background: string
  transform: Transform
  /** The canvas in CSS pixels; the bitmap is `width·dpr` (§10.1). */
  width: number
  height: number
  dpr: number
  strokeWidth: number
  labelOption: string
  rootLabel: string
  hovered: SimNode | null
  hoveredLink: SimLink | null
  selected: SimNode | null
  selectedLink: SimLink | null
  /** Legacy `nodes_selections`. */
  selection: SimNode[]
  /** Edit-Mode drop feedback (§4.7): `comp_highligh`, `comp_highligh_surface`, `temp_link`. */
  dropTarget: SimNode | null
  dropSurface: SimNode | null
  tempLink: { source: SimNode; target: SimNode } | null
  editMode: boolean
  /** The loaded thumbnail of a node, or null (`#sprites` off, none, or not loaded). */
  sprite: (n: SimNode) => HTMLImageElement | null
  /** The popup's node (§2.8): the selected leaf, else the hovered one. */
  popup: SimNode | null
  legend: { entries: LegendEntry[]; w: number; h: number; f: number; ypad: number } | null
}

/** The subset of `CanvasRenderingContext2D` a frame uses (a recording mock implements it in tests). */
export type Ctx = Pick<
  CanvasRenderingContext2D,
  | 'clearRect' | 'fillRect' | 'strokeRect' | 'save' | 'restore' | 'translate' | 'scale' | 'rotate' | 'setTransform' | 'moveTo' | 'lineTo' | 'beginPath'
  | 'arc' | 'rect' | 'fill' | 'stroke' | 'fillText' | 'drawImage' | 'createLinearGradient' | 'measureText'
  | 'fillStyle' | 'strokeStyle' | 'lineWidth' | 'font' | 'textAlign' | 'textBaseline'
>

interface Title {
  name: string
  r: number
  counter: number
  fontSize: number
  font: string
  radius: number
  /** Legacy reverses the letters (main.js:5509). */
  chars: string[]
  half: number[]
  start: number
}

/** Per-canvas caches, so a frame allocates nothing. */
export class DrawCache {
  readonly titles = new Map<SimNode, Title>()
  readonly labelFonts = new Map<number, string>()
  readonly gradients = new Map<SimLink, { from: string; to: string; g: CanvasGradient | string }>()
  rootFont = ''
  rootFontK = NaN
  legendFont = ''
  legendFontF = NaN
  readonly labelTexts = new Map<SimNode, string>()
  labelOption = ''

  /** Forgets what depends on recipe data (names, values): after an edit or a new recipe. */
  reset(): void {
    this.titles.clear()
    this.labelTexts.clear()
    this.gradients.clear()
  }

  labelText(n: SimNode, option: string): string {
    if (option !== this.labelOption) {
      this.labelOption = option
      this.labelTexts.clear()
    }
    let text = this.labelTexts.get(n)
    if (text === undefined) this.labelTexts.set(n, (text = ingredientLabelText(n.node.data as IngredientData, option)))
    return text
  }

  title(ctx: Ctx, n: SimNode, counter: number): Title | null {
    const start = ROTATION_TEXT[counter]
    if (start === undefined) return null // §8.4: past 29 compartments legacy draws no title
    const name = n.node.data.name
    const t = this.titles.get(n)
    if (t && t.name === name && t.r === n.r && t.counter === counter) return t
    let fontSize = Math.round(n.r / 10)
    if (fontSize <= 4) fontSize = 10
    const font = `${fontSize}px ${TITLE_FONT}`
    const chars = Array.from(name.replace(/,? and /g, ' & ')).reverse()
    ctx.font = font
    const radius = n.r + 5
    const half = chars.map((c) => ctx.measureText(c).width / 2)
    let angle = (start * Math.PI) / 180
    for (const h of half) angle += h / radius // half the total, for centring (main.js:5513-5516)
    const title: Title = { name, r: n.r, counter, fontSize, font, radius, chars, half, start: angle }
    this.titles.set(n, title)
    return title
  }

  labelFont(fontSize: number): string {
    let f = this.labelFonts.get(fontSize)
    if (f === undefined) this.labelFonts.set(fontSize, (f = `${fontSize}px Georgia`))
    return f
  }

  /** Legacy's link gradient, fixed in world space (0,0)→(170,0) (§2.10, §8.6): it depends only on the two fills. */
  gradient(ctx: Ctx, link: SimLink, from: string, to: string): CanvasGradient | string {
    const c = this.gradients.get(link)
    if (c && c.from === from && c.to === to) return c.g
    const g = ctx.createLinearGradient(0, 0, 170, 0)
    g.addColorStop(0, from)
    g.addColorStop(1, to)
    this.gradients.set(link, { from, to, g })
    return g
  }
}

const isSelected = (scene: Scene, n: SimNode) => scene.selection.includes(n)

/** `Highlight` (main.js:3672-3724, §2.6): fills and strokes the current path for the node's state. */
function highlight(ctx: Ctx, scene: Scene, n: SimNode): void {
  const fill = scene.fill.get(n) ?? depthColor(n.depth)
  let f: string
  let s: string
  if (isSelected(scene, n)) {
    f = 'yellow'
    s = 'orange'
  } else if (n === scene.hovered && n !== scene.selected && n !== scene.dropTarget && n !== scene.dropSurface) {
    f = fill
    s = 'black'
  } else if (n === scene.selected) {
    f = 'yellow'
    s = 'orange'
  } else if (n === scene.dropSurface) {
    f = fill
    s = 'yellow'
  } else if (n === scene.dropTarget) {
    f = 'grey'
    s = 'black'
  } else if (n.depth === FLOAT_DEPTH) {
    f = 'rgba(55, 55, 255, 0.3)'
    s = depthColor(n.depth + 1)
  } else {
    f = fill
    s = depthColor(n.depth + 1)
  }
  ctx.fillStyle = f
  ctx.fill()
  ctx.strokeStyle = s
  ctx.lineWidth = scene.strokeWidth
  ctx.stroke()
}

/** `drawNode`'s path (main.js:5460-5482): nothing for the root, r+5 and r−5 in one path for a compartment. */
function nodePath(ctx: Ctx, n: SimNode): void {
  ctx.moveTo(n.x, n.y)
  ctx.beginPath()
  if (!n.parent) return
  if (n.leaf) {
    ctx.arc(n.x, n.y, n.r, 0, 10)
    return
  }
  ctx.arc(n.x, n.y, n.r + 5, 0, 10)
  ctx.strokeStyle = depthColor(n.depth + 1)
  ctx.stroke()
  ctx.arc(n.x, n.y, n.r - 5, 0, 10)
  ctx.strokeStyle = depthColor(n.depth + 1)
  ctx.stroke()
}

/** `getOffsetLink` + `drawLink` (main.js:5353-5366, 5382-5387): edge to edge. */
function linkPath(ctx: Ctx, a: SimNode, b: SimNode): void {
  ctx.beginPath()
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / d
  const uy = dy / d
  ctx.moveTo(a.x + a.r * ux, a.y + a.r * uy)
  ctx.lineTo(b.x - b.r * ux, b.y - b.r * uy)
}

/** Membrane marker lines in a surface ingredient's circle (§10.6): green centre, red and blue either side. */
function markers(ctx: Ctx, n: SimNode): void {
  const w = n.r * 0.6
  const off = n.r * 0.3
  ctx.lineWidth = 1
  for (let i = 0; i < 3; i++) {
    const y = n.y + (i === 0 ? 0 : i === 1 ? -off : off)
    ctx.beginPath()
    ctx.moveTo(n.x - w, y)
    ctx.lineTo(n.x + w, y)
    ctx.strokeStyle = i === 0 ? 'green' : i === 1 ? 'red' : 'blue'
    ctx.stroke()
  }
}

export function drawFrame(ctx: Ctx, scene: Scene, cache: DrawCache): void {
  const { transform: t, dpr } = scene
  if (!scene.nodes.length) return
  // §10.1: the bitmap is dpr times the CSS size; everything below is in CSS pixels.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, scene.width, scene.height)
  ctx.fillStyle = scene.background
  ctx.fillRect(0, 0, scene.width, scene.height)
  ctx.save()
  ctx.translate(t.x, t.y)
  ctx.scale(t.k, t.k)

  for (const n of scene.sorted) {
    if (n.leaf) continue
    nodePath(ctx, n)
    highlight(ctx, scene, n)
  }

  for (const l of scene.links) {
    linkPath(ctx, l.source, l.target)
    if (l === scene.hoveredLink) {
      // Link objects have no `r`: legacy's lineWidth assignments are no-ops (§2.10).
      ctx.strokeStyle = 'black'
      ctx.stroke()
      linkPath(ctx, l.source, l.target)
      ctx.strokeStyle = depthColor(l.source.depth + 1)
      ctx.stroke()
    } else {
      const g = cache.gradient(ctx, l, scene.fill.get(l.source) ?? 'black', scene.fill.get(l.target) ?? 'black')
      ctx.fillStyle = g
      ctx.strokeStyle = g
      ctx.stroke()
    }
    if (l === scene.selectedLink) {
      ctx.strokeStyle = 'orange'
      ctx.stroke()
      linkPath(ctx, l.source, l.target)
      ctx.strokeStyle = 'yellow'
      ctx.stroke()
    }
  }

  for (const n of scene.sorted) {
    if (!n.leaf) continue
    nodePath(ctx, n)
    highlight(ctx, scene, n)
    const img = scene.sprite(n)
    if (img) {
      // Letterboxed into the 2r box (main.js:3740-3751).
      const s = n.r * 2
      const ratio = img.naturalWidth / img.naturalHeight
      const w = img.naturalWidth < img.naturalHeight ? s * ratio : s
      const h = img.naturalWidth < img.naturalHeight ? s : s / ratio
      ctx.drawImage(img, n.x - w / 2, n.y - h / 2, w, h)
    }
    if (n.surface) markers(ctx, n)
  }

  const sel = scene.selection
  if (sel.length % 2 === 0) {
    for (let i = 0; i < sel.length - 1; i += 2) {
      // `getOffsetTwoNode` (main.js:5368-5380): from r/2 inside each.
      const a = sel[i]
      const b = sel[i + 1]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const d = Math.sqrt(dx * dx + dy * dy)
      ctx.beginPath()
      ctx.moveTo(a.x + ((a.r / 2) * dx) / d, a.y + ((a.r / 2) * dy) / d)
      ctx.lineTo(b.x - ((b.r / 2) * dx) / d, b.y - ((b.r / 2) * dy) / d)
      ctx.strokeStyle = 'yellow'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
  if (scene.editMode && scene.tempLink) {
    linkPath(ctx, scene.tempLink.source, scene.tempLink.target)
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // `DrawLabels` (main.js:3802-3846): breadth-first; titles, the root label, ingredient labels.
  let counter = 0
  for (const n of scene.nodes) {
    if (!n.leaf && n.parent) {
      const title = cache.title(ctx, n, counter)
      if (title) {
        ctx.textBaseline = 'alphabetic'
        ctx.textAlign = 'center' // leaks to the ingredient labels (§8.5)
        ctx.font = title.font
        ctx.fillStyle = 'rgba(0,0,0,1)'
        ctx.save()
        ctx.translate(n.x, n.y)
        ctx.rotate(title.start)
        for (let j = 0; j < title.chars.length; j++) {
          ctx.rotate(-title.half[j] / title.radius)
          ctx.fillText(title.chars[j], 0, -title.radius)
          ctx.rotate(-title.half[j] / title.radius)
        }
        ctx.restore()
      }
      counter++
    }
    if (!n.parent) {
      // Screen point (5, height−20) through the transform, font 20/k: constant on screen (§2.7).
      if (cache.rootFontK !== t.k) {
        cache.rootFontK = t.k
        cache.rootFont = `${20 / t.k}px Georgia`
      }
      ctx.font = cache.rootFont
      ctx.fillStyle = 'black'
      ctx.fillText(scene.rootLabel, (5 - t.x) / t.k, (scene.height - 20 - t.y) / t.k)
    }
    if (n.leaf && ingredientLabelVisible(n === scene.hovered, t.k, scene.labelOption)) {
      let fs = Math.round(n.r / 2)
      if (fs <= 4) fs = 5
      ctx.font = cache.labelFont(fs)
      ctx.fillText(cache.labelText(n, scene.labelOption), n.x - n.r, n.y + n.r + fs)
    }
  }

  const p = scene.popup
  const img = p ? scene.sprite(p) : null
  if (p && img) drawPopup(ctx, scene, p, img)

  if (scene.legend) {
    const { entries, w, h, f, ypad } = scene.legend
    if (cache.legendFontF !== f) {
      cache.legendFontF = f
      cache.legendFont = `${f}px Georgia`
    }
    let sy = 0
    for (const e of entries) {
      ctx.fillStyle = e.color
      ctx.fillRect(0, sy + ypad, w, h)
      ctx.strokeStyle = 'black'
      ctx.strokeRect(0, sy + ypad, w, h)
      ctx.textAlign = 'left'
      ctx.font = cache.legendFont
      ctx.fillText(e.label === '' ? 'unknown' : e.label, w + ypad + 5, sy + h + ypad - h / 2 + f / 2)
      sy += h
    }
  }
  ctx.restore()
}

/** The thumbnail popup (main.js:3970-4027, §2.8), in screen space: 150 wide at the bottom, x = width/2 − 160. */
function drawPopup(ctx: Ctx, scene: Scene, n: SimNode, img: HTMLImageElement): void {
  const data = n.node.data as IngredientData
  ctx.save()
  ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0)
  const w = 150
  const h = w / (img.naturalWidth / img.naturalHeight)
  const x = scene.width / 2 - w - 10
  const y = scene.height - h - 10
  ctx.rect(x, y, w, h)
  ctx.stroke()
  ctx.fillText(data.name.replace(/,? and /g, ' & '), x, y)
  const sc2d = (parseFloat(String(data.sprite?.scale2d)) || 0) * (w / img.naturalWidth)
  const fiber = data.ingtype === 'fiber'
  if (!fiber) ctx.drawImage(img, x, y, w, h)
  if (data.surface) {
    const offy = -(parseFloat(String(data.sprite?.offsety)) || 0) * sc2d
    const half = 21 // membrane half-thickness, Å
    for (let i = 0; i < 3; i++) {
      const yy = y + h / 2 - offy + (i === 0 ? 0 : i === 1 ? -half * sc2d : half * sc2d)
      ctx.beginPath()
      ctx.lineWidth = 2
      ctx.moveTo(x, yy)
      ctx.lineTo(x + w, yy)
      ctx.strokeStyle = i === 0 ? 'green' : i === 1 ? 'red' : 'blue'
      ctx.stroke()
    }
  }
  if (fiber) {
    const leny = -(parseFloat(String(data.sprite?.lengthy)) || 0) * sc2d
    ctx.drawImage(img, x - leny / 2, y, w, h)
    ctx.drawImage(img, x + leny / 2, y, w, h)
  }
  ctx.restore()
}
