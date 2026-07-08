/**
 * Node coloring — the modern equivalent of legacy's `ChangeCanvasColor`/`colorNode`
 * (js/main.js:3211-3388, wired to a real "Node color" dropdown, `js/layout_mg.js:162-163`, 16
 * modes in `canvas_color_options`, main.js:28-30). Confirmed live in the actual function body
 * (not the option list, which doesn't always match reality — `ChangeCanvasLabel` turned out to
 * be dead code despite being wired the same way) that all 16 modes are real and reachable.
 *
 * Three families of mode, all confirmed from source:
 * - **Validation/binary** (`pdb`, `geom`, `pcpalAxis`, `offset`, `Beads`, `count_molarity`): red
 *   if the referenced field is missing/empty/"None"/"null", else fall back to the depth-based
 *   ordinal color (returning `null` here signals "fall back to depth color", matching the
 *   existing `fillColor` in `RecipeCanvas.tsx`).
 * - **Continuous gradient** (`confidence`, `size`, `molecularweight` = linear scale; `count`,
 *   `molarity` = sqrt scale — legacy's own inconsistent choice, preserved exactly since this is
 *   a 1:1 parity port) — mapped between two configurable endpoint colors (legacy's `min_color`/
 *   `max_color` pickers, default red `#ff0000` → teal `#00ffbf`) via `property_mapping`'s
 *   min/max (`computePropertyMapping`).
 * - **Explicit/direct** (`color`, `default`, `interaction` — all three read `data._color` if
 *   present else `data.color`; `viewed` reads a visited flag; `automatic` has *two* real
 *   sub-modes, see below).
 * - **Generic fallback**: any property name not in the list above (e.g. a custom CSV column) —
 *   numeric values get the same linear-gradient treatment as `size`/`confidence`; string values
 *   get a categorical palette, one color per unique value.
 *
 * `automatic` is gated by a second real, wired control legacy calls "Use color linear mapping"
 * (`toggleColorMapping`/`use_color_mapping`, `js/layout_mg.js:286` — a checkbox, `checked` by
 * default) that a first read of `colorNode`'s `automatic` branch alone would miss entirely (the
 * branch reads a global set elsewhere): **checked (the default)** means a plain two-color
 * linear gradient indexed by each node's raw position in the flattened node list (`d3v4
 * .scaleLinear().domain([0, graph.nodes.length]).range([cmin, cmax])`, i.e. the exact same
 * gradient machinery as `confidence`/`size`/etc., just keyed by list position instead of a
 * data field) — **unchecked** means a discrete palette, one color per ingredient, grouped by
 * compartment. Only the *unchecked* behavior was built in an earlier pass (a real gap, found by
 * re-reading `js/layout_mg.js` for the checkbox this file's own code comments referenced but
 * hadn't traced to its default value) — `ctx.useColorMapping` (default `true`, matching
 * legacy's `checked`) now selects between them. The *unchecked* palette's exact algorithm
 * (`GenerateNColor`/`GenerateOneColorRangePalette`, main.js:3141-3178) uses two extra legacy
 * dependencies (`chroma.js`, a `paletteGenerator` force-vector color-distance library) not
 * present in this app — deliberately not added just for this: an HSL hue-rotation palette
 * (`hslPalette` below) produces the same qualitative outcome (N visually distinct colors,
 * grouped per compartment) without a new dependency, matching this project's established "same
 * visible behavior, simpler modern mechanism" tradeoff pattern.
 *
 * Root's own explicit color always wins regardless of mode (main.js:3378-3383, `d.parent ===
 * null` checked before any mode branch); non-root compartments only get their explicit color
 * under `"color"` mode specifically (every other mode's branches all guard on `!d.children`,
 * so compartments fall through to the depth-color `else`) — `resolveFillColor` below applies
 * both rules, so `RecipeCanvas.tsx` (rendering) and `RecipeCanvasToolbar.tsx`'s "Apply to
 * ingredient color" button (baking the *currently displayed* color into `data.color`) can't
 * silently drift out of sync by each reimplementing this differently.
 */
import { scaleOrdinal } from 'd3-scale'
import { schemeTableau10 } from 'd3-scale-chromatic'
import { isIngredientNode, type IngredientData, type RecipeNode } from './types'
import type { PropertyStats } from './propertyMapping'

/** All 16 legacy `canvas_color_options` entries, in their original order. Any other string is
 *  treated as a generic (possibly custom-column) property. */
export const BUILTIN_COLOR_MODES = [
  'default',
  'color',
  'interaction',
  'automatic',
  'viewed',
  'pdb',
  'geom',
  'pcpalAxis',
  'offset',
  'Beads',
  'count_molarity',
  'confidence',
  'count',
  'molarity',
  'molecularweight',
] as const

const SQRT_SCALE_MODES = new Set(['count', 'molarity'])

export interface ColorModeContext {
  mode: string
  /** Gradient endpoint colors (hex), legacy's `min_color`/`max_color` pickers. */
  minColor: string
  maxColor: string
  propertyMapping: Record<string, PropertyStats>
  /** Ingredient nodes considered visited (clicked/selected at least once) — legacy's
   *  `data.visited`, kept out of `IngredientData` itself so it never round-trips through
   *  save/export (a UI concern, not recipe data — same reasoning as `uiModeStore`'s other
   *  fields). */
  visitedNodes: ReadonlySet<RecipeNode>
  /** Precomputed once per render (not per node — building a categorical palette needs every
   *  ingredient's value for `mode`, not just the one node being colored) via
   *  `computeCategoricalPalette`, keyed by property name. Only needs an entry for the
   *  *current* mode when it's a generic string-valued property. */
  categoricalPalettes: ReadonlyMap<string, ReadonlyMap<string, string>>
  /** `automatic` mode's "Use color linear mapping" toggle (default `true`) — see this file's
   *  docstring. `nodeIndex` is each node's position in the flattened `graph.nodes` list,
   *  precomputed once per render (a `Map` lookup here instead of `graph.nodes.indexOf(node)`
   *  per node, since this runs inside a render loop). */
  useColorMapping: boolean
  nodeIndex: ReadonlyMap<RecipeNode, number>
  nodeCount: number
}

function isEmptyLike(value: unknown): boolean {
  if (value == null || value === 'None' || value === 'null' || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  return false
}

function rgbTriplet(color: number[] | null | undefined): string | null {
  if (!color || color.length < 3) return null
  const [r, g, b] = color
  return `rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`
}

/** N evenly-spaced hues — the modern stand-in for legacy's chroma.js/paletteGenerator palette. */
export function hslPalette(n: number): string[] {
  if (n <= 0) return []
  return Array.from({ length: n }, (_, i) => `hsl(${Math.round((360 * i) / n)}, 65%, 55%)`)
}

/** One color per unique string value of `property` among ingredient nodes — legacy's generic
 *  categorical-column palette (main.js:3299-3320's `unique_array`/`GenerateNColor` path). */
export function computeCategoricalPalette(nodes: RecipeNode[], property: string): Map<string, string> {
  const values = new Set<string>()
  for (const node of nodes) {
    if (!isIngredientNode(node)) continue
    const value = (node.data as IngredientData)[property]
    values.add(value == null ? '' : String(value))
  }
  const unique = [...values]
  const palette = hslPalette(unique.length)
  return new Map(unique.map((value, i) => [value, palette[i]]))
}

function gradientColor(value: number, stats: PropertyStats, mode: string, ctx: ColorModeContext): string {
  const t = stats.max === stats.min ? 0.5 : (value - stats.min) / (stats.max - stats.min)
  const eased = SQRT_SCALE_MODES.has(mode) ? Math.sqrt(Math.max(t, 0)) : t
  const clamped = Math.min(1, Math.max(0, eased))
  return d3InterpolateHex(ctx.minColor, ctx.maxColor, clamped)
}

/** Linear RGB interpolation between two hex colors — avoids pulling in `d3-interpolate` just
 *  for this one lerp (`d3.scaleLinear`'s color-range auto-interpolation is the alternative, but
 *  a plain function is simpler to unit-test deterministically). */
function d3InterpolateHex(fromHex: string, toHex: string, t: number): string {
  const from = hexToRgb(fromHex)
  const to = hexToRgb(toHex)
  const r = Math.round(from.r + (to.r - from.r) * t)
  const g = Math.round(from.g + (to.g - from.g) * t)
  const b = Math.round(from.b + (to.b - from.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return { r, g, b }
}

/**
 * Computes the display color for one ingredient leaf under the given mode, or `null` to signal
 * "fall back to the depth-based ordinal color" (every validation-mode's "else" branch, and any
 * mode whose referenced data is missing). Compartments are never colored by mode in legacy
 * (mode branches all guard on `!d.children`) except `"color"`, which also applies to
 * compartments — callers should only invoke this for ingredient leaves and handle compartments
 * (and the root special case) separately, matching `RecipeCanvas.tsx`'s existing structure.
 */
export function computeNodeColor(node: RecipeNode, ctx: ColorModeContext): string | null {
  const data = node.data as IngredientData
  const mode = ctx.mode

  switch (mode) {
    case 'pdb':
      return isEmptyLike(data.source?.pdb) ? 'red' : null
    case 'geom':
      return isEmptyLike(data.geom) ? 'red' : null
    case 'pcpalAxis':
      return isEmptyLike(data.pcpalAxis) ? 'red' : null
    case 'offset':
      return isEmptyLike(data.offset) ? 'red' : null
    case 'Beads':
      return isEmptyLike(data.pos) ? 'red' : null
    case 'count_molarity':
      return data.count === 0 && data.molarity === 0 ? 'red' : null
    case 'color':
      return rgbTriplet(data.color)
    case 'default':
    case 'interaction':
      return rgbTriplet(data._color ?? data.color)
    case 'viewed':
      return ctx.visitedNodes.has(node) ? 'yellow' : 'red'
    case 'confidence':
    case 'count':
    case 'size':
    case 'molarity':
    case 'molecularweight': {
      const value = data[mode]
      const stats = ctx.propertyMapping[mode]
      if (typeof value !== 'number' || value < 0 || !stats) return null
      return gradientColor(value, stats, mode, ctx)
    }
    case 'automatic': {
      if (ctx.useColorMapping) {
        const index = ctx.nodeIndex.get(node)
        if (index == null) return null
        return gradientColor(index, { min: 0, max: Math.max(ctx.nodeCount, 1) }, 'automatic', ctx)
      }
      const parent = node.parent
      if (!parent?.children) return null
      const index = parent.children.indexOf(node)
      const palette = hslPalette(parent.children.length)
      return palette[index] ?? null
    }
    default: {
      // Generic/custom-column fallback: numeric -> gradient, string -> categorical palette.
      const value = data[mode]
      if (value == null) return null
      if (typeof value === 'number') {
        const stats = ctx.propertyMapping[mode]
        return stats ? gradientColor(value, stats, mode, ctx) : null
      }
      return ctx.categoricalPalettes.get(mode)?.get(String(value)) ?? null
    }
  }
}

/** Shared depth→color ordinal scale — a module-level singleton so `RecipeCanvas.tsx` and
 *  `RecipeCanvasToolbar.tsx`'s "Apply to ingredient color" resolve the exact same fallback
 *  color for a given depth (an ordinal scale's color assignment depends on the order distinct
 *  domain values are first seen, so two separate scale instances could otherwise disagree). */
export const depthColorScale = scaleOrdinal<string, string>(schemeTableau10)

/**
 * The color actually shown for a node under the current mode — leaves via `computeNodeColor`,
 * compartments via the root-always/`"color"`-mode-only rules described in this file's
 * docstring, both falling back to `depthColorScale` when the mode has nothing to say. This is
 * the one function both the canvas (fill/stroke) and the toolbar's bake-in button should call,
 * so they can never silently compute two different colors for the same node.
 */
export function resolveFillColor(node: RecipeNode, depth: number, isLeaf: boolean, ctx: ColorModeContext): string {
  const explicitOrDepth = (color: number[] | null | undefined) => rgbTriplet(color) ?? depthColorScale(String(depth))
  if (depth === 0) return explicitOrDepth((node.data as { color?: number[] | null }).color)
  if (!isLeaf) {
    if (ctx.mode !== 'color') return depthColorScale(String(depth))
    return explicitOrDepth((node.data as { color?: number[] | null }).color)
  }
  return computeNodeColor(node, ctx) ?? depthColorScale(String(depth))
}
