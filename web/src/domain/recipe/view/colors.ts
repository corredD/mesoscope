/**
 * Node colours as legacy computes them (recipe-view.md §6, rows 81-90): `prepareColors` is `ChangeCanvasColor`
 * (main.js:3211-3334), run once per mode change; `colorNode` is `colorNode` (main.js:3378-3515); `nodeStyle` is the
 * state precedence of `Highlight` (main.js:3672-3724, §2.6). Legacy's iwanthue palettes (`GenerateNColor`) are random
 * per session, so the categorical and automatic-unmapped palettes are evenly spaced hues instead (§8.20).
 */
import { interpolateHcl } from 'd3-interpolate'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { color as d3color, hcl } from 'd3-color'
import type { IngredientData, RecipeNode } from '../types'

/** The "Node color" options, in legacy order (main.js:28-30). */
export const COLOR_MODES = ['pdb', 'pcpalAxis', 'offset', 'count_molarity', 'Beads', 'geom', 'interaction', 'confidence', 'color', 'viewed', 'size', 'count', 'molarity', 'molecularweight', 'default', 'automatic'] as const

/** Keys of legacy's `property_mapping` (main.js:36-45): the modes `ChangeCanvasColor` prepares, and "Node size"/"group by" options. */
export const PROPERTY_MAPPING_KEYS = ['default', 'size', 'molecularweight', 'radius_molecularweight', 'molarity', 'count', 'confidence', 'interaction', 'automatic']

/**
 * The depth ramp, white at depth −1 to slate at 6 in HCL (main.js:156-159, row 28). d3 v4 gave white a hue (about
 * 148°, chroma about 2) where d3 v7 gives none, so the ramp passes through teal; this start reproduces the oracle's
 * colours within 1 per channel.
 */
const depthRamp = interpolateHcl(hcl(148, 2, 100), 'hsl(228,30%,40%)')
const depthCache = new Map<number, string>()
/** Cached per depth: it is read for every node on every drawn frame. */
export const depthColor = (depth: number): string => {
  let c = depthCache.get(depth)
  if (c === undefined) depthCache.set(depth, (c = depthRamp((depth + 1) / 7)))
  return c
}

export interface ColorNodeInfo {
  node: RecipeNode
  /** Index in legacy `graph.nodes` (breadth-first). */
  index: number
  depth: number
  leaf: boolean
}

export interface ColorPrep {
  mode: string
  useColorMapping: boolean
  mapping: ((value: number) => string) | null
  /** Categorical modes: the unique values, "" last (main.js:3304-3306). */
  uniqueValues: string[] | null
  /** Categorical modes: one colour per unique value. */
  categoryColors: string[] | null
  /** `automatic` with mapping off: one colour per compartment, a palette per compartment's children. */
  compartmentColors: Map<RecipeNode, string> | null
  visited: ReadonlySet<RecipeNode>
}

const rgbList = (c: number[]) => `rgb(${Math.floor(c[0] * 255)},${Math.floor(c[1] * 255)},${Math.floor(c[2] * 255)})`

/** N evenly spaced hues: the stand-in for legacy's random iwanthue `GenerateNColor`. */
export function hueColors(n: number, offset = 0, span = 360): string[] {
  return Array.from({ length: n }, (_, i) => d3color(`hsl(${offset + (span * i) / Math.max(n, 1)},65%,55%)`)!.formatRgb())
}

function scores(nodes: readonly ColorNodeInfo[], f: (d: IngredientData & Record<string, unknown>, n: ColorNodeInfo) => unknown): unknown[] {
  return nodes.map((n) => f(n.node.data as IngredientData, n)).filter((v) => v !== null && v !== undefined)
}

const extent = (values: number[]) => [Math.min(...values), Math.max(...values)]

/**
 * `ChangeCanvasColor`: the scale (and palette) a mode needs, from every node. `categoryOverrides` are the colours the
 * context menu set for a category (row 72), by mode then value.
 */
export function prepareColors(nodes: readonly ColorNodeInfo[], mode: string, minColor: string, maxColor: string, useColorMapping: boolean, visited: ReadonlySet<RecipeNode>, categoryOverrides: Readonly<Record<string, Readonly<Record<string, string>>>> = {}): ColorPrep {
  const prep: ColorPrep = { mode, useColorMapping, mapping: null, uniqueValues: null, categoryColors: null, compartmentColors: null, visited }
  const range = [minColor, maxColor]
  // d3 v4 maps a one-value domain to the range start; v7 to its middle (the oracle has every leaf red, §6.1).
  const start = d3color(minColor)!.formatRgb()
  const linear = (domain: number[]) => (domain[0] === domain[1] ? () => start : scaleLinear<string>().domain(domain).range(range))
  const sqrt = (domain: number[]) => (domain[0] === domain[1] ? () => start : scaleSqrt<string>().domain(domain).range(range))
  if (mode === 'automatic') {
    const compartments = nodes.filter((n) => n.node.parent && !n.leaf)
    const hues = hueColors(compartments.length)
    prep.compartmentColors = new Map(compartments.map((c, i) => [c.node, hues[i]]))
    prep.mapping = linear([0, nodes.length])
    return prep
  }
  if (mode === 'confidence') prep.mapping = linear(extent(scores(nodes, (d) => (d.confidence != null && d.confidence !== -1 ? d.confidence : null)) as number[]))
  else if (mode === 'count') prep.mapping = sqrt(extent(nodes.map((n) => { const v = (n.node.data as IngredientData).count; return v != null && v !== -1 ? v : 0 })))
  else if (mode === 'size') prep.mapping = linear(extent(scores(nodes, (d) => (d.size != null && d.size !== -1 ? d.size : null)) as number[]))
  else if (mode === 'molarity') prep.mapping = sqrt(extent(scores(nodes, (d) => (d.molarity != null && d.molarity !== -1 ? d.molarity : null)) as number[]))
  else if (mode === 'molecularweight') prep.mapping = linear(extent(scores(nodes, (d) => (d.molecularweight != null && d.molecularweight !== -1 ? d.molecularweight : null)) as number[]))
  else if (!(COLOR_MODES as readonly string[]).includes(mode) || mode === 'default' || mode === 'interaction') {
    // Any other key: categorical when its first value is not a number (main.js:3299-3332).
    const leafValues = scores(nodes, (d, n) => (n.leaf && d[mode] != null && d[mode] !== -1 ? d[mode] : null))
    if (Number.isNaN(parseFloat(String(leafValues[0])))) {
      const unique = [...new Set(leafValues.map(String))]
      if (!unique.includes('')) unique.push('')
      const overrides = categoryOverrides[mode] ?? {}
      const hues = hueColors(unique.length)
      prep.uniqueValues = unique
      prep.categoryColors = unique.map((v, i) => overrides[v] ?? hues[i])
      const indices = nodes.map((n) => {
        const v = (n.node.data as Record<string, unknown>)[mode]
        return unique.indexOf(v != null && v !== -1 ? String(v) : '')
      })
      prep.mapping = linear(extent(indices))
    } else {
      prep.mapping = linear(extent(leafValues.map(Number)))
    }
  }
  return prep
}

const emptyLike = (v: unknown) => !v || v === 'None' || v === 'null' || v === '' || (Array.isArray(v) && v.length === 0)

/** `colorNode` for one node (main.js:3378-3515). */
export function colorNode(info: ColorNodeInfo, prep: ColorPrep): string {
  const { node, depth, leaf } = info
  const d = node.data as IngredientData & Record<string, unknown>
  const fallback = depthColor(depth)
  if (!node.parent) return d.color ? rgbList(d.color) : fallback
  const mode = prep.mode
  const mapped = (v: unknown) => (prep.mapping ? prep.mapping(Number(v)) : fallback)
  switch (mode) {
    case 'pdb':
      return leaf && emptyLike(d.source?.pdb) ? 'red' : fallback
    case 'geom':
      return leaf && emptyLike(d.geom) ? 'red' : fallback
    case 'pcpalAxis':
    case 'offset':
      return leaf && emptyLike(d[mode]) ? 'red' : fallback
    case 'Beads':
      return leaf && emptyLike(d.pos) ? 'red' : fallback
    case 'count_molarity':
      return leaf && d.count === 0 && d.molarity === 0 ? 'red' : fallback
    case 'color':
      return d.color ? rgbList(d.color) : fallback // compartments too
    case 'viewed':
      return leaf ? (prep.visited.has(node) ? 'yellow' : 'red') : fallback
    case 'confidence':
    case 'count':
    case 'size':
    case 'molarity':
    case 'molecularweight':
      return leaf && d[mode] != null && Number(d[mode]) >= 0 ? mapped(d[mode]) : fallback
    case 'automatic': {
      if (prep.useColorMapping) return mapped(info.index)
      if (!leaf) return prep.compartmentColors?.get(node) ?? fallback
      const parent = node.parent
      const base = d3color(prep.compartmentColors?.get(parent) ?? fallback)!.formatHsl()
      const hue = Number(/hsl\(([-\d.]+)/.exec(base)?.[1] ?? 0)
      const siblings = parent.children ?? []
      return hueColors(siblings.length, hue - 30, 60)[siblings.indexOf(node)] ?? fallback
    }
    case 'default':
    case 'interaction': {
      if (!leaf) return fallback
      // `_color` (kept by "Apply to ingredient color") wins. Our parser always sets `color`, so a recipe without
      // colours gets the depth colour, as the oracle shows on HIV (legacy blackens only a missing key, §8.3).
      const c = '_color' in d ? d._color : d.color
      return c ? rgbList(c) : fallback
    }
    default: {
      if (!prep.uniqueValues) return leaf && d[mode] != null ? mapped(d[mode]) : fallback
      const value = leaf && d[mode] != null ? String(d[mode]) : ''
      if (prep.useColorMapping) return leaf && d[mode] != null ? mapped(prep.uniqueValues.indexOf(value)) : fallback
      return prep.categoryColors![prep.uniqueValues.indexOf(value)] ?? fallback
    }
  }
}

export interface NodeStyleState {
  selected: boolean
  inSelection: boolean
  hovered: boolean
  dropTarget: boolean
  dropTargetSurface: boolean
  dragged: boolean
}

/** `Highlight`'s precedence (§2.6): fill and stroke for a node in its interaction state. */
export function nodeStyle(fill: string, depth: number, s: NodeStyleState): { fill: string; stroke: string } {
  if (s.inSelection) return { fill: 'yellow', stroke: 'orange' }
  if (s.hovered && !s.selected && !s.dropTarget && !s.dropTargetSurface) return { fill, stroke: 'black' }
  if (s.selected) return { fill: 'yellow', stroke: 'orange' }
  if (s.dropTargetSurface) return { fill, stroke: 'yellow' }
  if (s.dropTarget) return { fill: 'grey', stroke: 'black' }
  if (s.dragged) return { fill: 'rgba(55, 55, 255, 0.3)', stroke: depthColor(depth + 1) }
  return { fill, stroke: depthColor(depth + 1) }
}

/** Legacy `graph.nodes` with depth and index, breadth-first from the root (§1.3). */
export function colorNodeInfos(root: RecipeNode): ColorNodeInfo[] {
  const out: ColorNodeInfo[] = [{ node: root, index: 0, depth: 0, leaf: !root.children }]
  for (let i = 0; i < out.length; i++) {
    for (const child of out[i].node.children ?? []) out.push({ node: child, index: out.length, depth: out[i].depth + 1, leaf: !child.children })
  }
  return out
}
