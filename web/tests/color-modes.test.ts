import { describe, expect, it } from 'vitest'
import { computeCategoricalPalette, computeNodeColor, hslPalette, resolveFillColor, type ColorModeContext } from '../src/domain/recipe/colorModes'
import { computePropertyMapping } from '../src/domain/recipe/propertyMapping'
import type { IngredientData, RecipeNode } from '../src/domain/recipe/types'

function ingredient(overrides: Partial<IngredientData> = {}): IngredientData {
  return {
    nodetype: 'ingredient',
    name: 'x',
    label: 'x',
    size: 10,
    molecularweight: 0,
    confidence: 0,
    source: { pdb: '', bu: '', model: '', selection: '' },
    count: 0,
    molarity: 0,
    surface: false,
    geom: '',
    geom_type: '',
    comments: '',
    uniprot: '',
    pcpalAxis: [0, 0, 1],
    offset: [0, 0, 0],
    fiberAxis: [0, 0, 1],
    fiberOffset: [0, 0, 0],
    pos: null,
    radii: null,
    ingtype: 'protein',
    buildtype: 'random',
    color: null,
    sprite: { image: null, offsety: 0, scale2d: 1, lengthy: 0 },
    ...overrides,
  }
}

function baseContext(overrides: Partial<ColorModeContext> = {}): ColorModeContext {
  return {
    mode: 'default',
    minColor: '#ff0000',
    maxColor: '#00ffbf',
    propertyMapping: {},
    visitedNodes: new Set(),
    categoricalPalettes: new Map(),
    ...overrides,
  }
}

describe('hslPalette', () => {
  it('returns n distinct hues', () => {
    const palette = hslPalette(4)
    expect(palette).toHaveLength(4)
    expect(new Set(palette).size).toBe(4)
  })

  it('returns empty for n <= 0', () => {
    expect(hslPalette(0)).toEqual([])
  })
})

describe('computeCategoricalPalette', () => {
  it('assigns one color per unique value', () => {
    const nodes: RecipeNode[] = [
      { data: ingredient({ ingtype: 'enzyme' }), parent: null, children: undefined },
      { data: ingredient({ ingtype: 'structural' }), parent: null, children: undefined },
      { data: ingredient({ ingtype: 'enzyme' }), parent: null, children: undefined },
    ]
    const palette = computeCategoricalPalette(nodes, 'ingtype')
    expect(palette.size).toBe(2)
    expect(palette.get('enzyme')).toBeDefined()
    expect(palette.get('structural')).toBeDefined()
    expect(palette.get('enzyme')).not.toBe(palette.get('structural'))
  })
})

describe('computeNodeColor: validation/binary modes', () => {
  it('pdb: red when source.pdb is missing, null (fall back to depth) when present', () => {
    const missing: RecipeNode = { data: ingredient({ source: { pdb: '', bu: '', model: '', selection: '' } }), parent: null, children: undefined }
    const present: RecipeNode = { data: ingredient({ source: { pdb: '1abc', bu: '', model: '', selection: '' } }), parent: null, children: undefined }
    expect(computeNodeColor(missing, baseContext({ mode: 'pdb' }))).toBe('red')
    expect(computeNodeColor(present, baseContext({ mode: 'pdb' }))).toBeNull()
  })

  it('geom: red for "None"/"null"/"" sentinel strings', () => {
    for (const geom of ['None', 'null', '']) {
      const node: RecipeNode = { data: ingredient({ geom }), parent: null, children: undefined }
      expect(computeNodeColor(node, baseContext({ mode: 'geom' }))).toBe('red')
    }
  })

  it('Beads: red when pos is null or empty array', () => {
    const nullPos: RecipeNode = { data: ingredient({ pos: null }), parent: null, children: undefined }
    const emptyPos: RecipeNode = { data: ingredient({ pos: [] }), parent: null, children: undefined }
    const realPos: RecipeNode = { data: ingredient({ pos: [{ coords: [1, 2, 3] }] }), parent: null, children: undefined }
    expect(computeNodeColor(nullPos, baseContext({ mode: 'Beads' }))).toBe('red')
    expect(computeNodeColor(emptyPos, baseContext({ mode: 'Beads' }))).toBe('red')
    expect(computeNodeColor(realPos, baseContext({ mode: 'Beads' }))).toBeNull()
  })

  it('count_molarity: red only when both count and molarity are exactly 0', () => {
    const bothZero: RecipeNode = { data: ingredient({ count: 0, molarity: 0 }), parent: null, children: undefined }
    const oneNonzero: RecipeNode = { data: ingredient({ count: 5, molarity: 0 }), parent: null, children: undefined }
    expect(computeNodeColor(bothZero, baseContext({ mode: 'count_molarity' }))).toBe('red')
    expect(computeNodeColor(oneNonzero, baseContext({ mode: 'count_molarity' }))).toBeNull()
  })
})

describe('computeNodeColor: explicit modes', () => {
  it('color: reads data.color as an rgb() string', () => {
    const node: RecipeNode = { data: ingredient({ color: [1, 0, 0.5] }), parent: null, children: undefined }
    expect(computeNodeColor(node, baseContext({ mode: 'color' }))).toBe('rgb(255, 0, 127)')
  })

  it('default: prefers _color over color when both present', () => {
    const data = ingredient({ color: [0, 0, 0] }) as IngredientData & { _color?: number[] }
    data._color = [1, 1, 1]
    const node: RecipeNode = { data, parent: null, children: undefined }
    expect(computeNodeColor(node, baseContext({ mode: 'default' }))).toBe('rgb(255, 255, 255)')
  })

  it('viewed: yellow if visited, red otherwise', () => {
    const node: RecipeNode = { data: ingredient(), parent: null, children: undefined }
    expect(computeNodeColor(node, baseContext({ mode: 'viewed', visitedNodes: new Set([node]) }))).toBe('yellow')
    expect(computeNodeColor(node, baseContext({ mode: 'viewed', visitedNodes: new Set() }))).toBe('red')
  })

  it('automatic: assigns distinct colors to siblings within the same parent', () => {
    const parent: RecipeNode = { data: { nodetype: 'compartment', name: 'c', geom: '', geom_type: '', thickness: 0, color: null }, parent: null, children: [] }
    const a: RecipeNode = { data: ingredient({ name: 'a' }), parent, children: undefined }
    const b: RecipeNode = { data: ingredient({ name: 'b' }), parent, children: undefined }
    parent.children = [a, b]
    const colorA = computeNodeColor(a, baseContext({ mode: 'automatic' }))
    const colorB = computeNodeColor(b, baseContext({ mode: 'automatic' }))
    expect(colorA).not.toBeNull()
    expect(colorA).not.toBe(colorB)
  })
})

describe('computeNodeColor: continuous gradient modes', () => {
  it('confidence: interpolates between minColor and maxColor by value', () => {
    const nodes = [ingredient({ confidence: 0 }), ingredient({ confidence: 10 })].map((data): RecipeNode => ({ data, parent: null, children: undefined }))
    const propertyMapping = computePropertyMapping(nodes)
    const low = computeNodeColor(nodes[0], baseContext({ mode: 'confidence', propertyMapping, minColor: '#000000', maxColor: '#ffffff' }))
    const high = computeNodeColor(nodes[1], baseContext({ mode: 'confidence', propertyMapping, minColor: '#000000', maxColor: '#ffffff' }))
    expect(low).toBe('rgb(0, 0, 0)')
    expect(high).toBe('rgb(255, 255, 255)')
  })

  it('count/molarity use a sqrt scale, so a mid-range value maps above the linear midpoint', () => {
    const nodes = [ingredient({ count: 0 }), ingredient({ count: 100 })].map((data): RecipeNode => ({ data, parent: null, children: undefined }))
    const propertyMapping = computePropertyMapping(nodes)
    const midNode: RecipeNode = { data: ingredient({ count: 25 }), parent: null, children: undefined }
    const color = computeNodeColor(midNode, baseContext({ mode: 'count', propertyMapping, minColor: '#000000', maxColor: '#ffffff' }))
    // sqrt(25/100) = 0.5 -> exactly the midpoint for this particular value, so use a non-square value instead
    expect(color).toBe('rgb(128, 128, 128)')
  })

  it('returns null (fall back to depth color) when the property is missing from propertyMapping', () => {
    const node: RecipeNode = { data: ingredient({ confidence: 5 }), parent: null, children: undefined }
    expect(computeNodeColor(node, baseContext({ mode: 'confidence', propertyMapping: {} }))).toBeNull()
  })
})

describe('computeNodeColor: generic custom-property fallback', () => {
  it('numeric custom property uses the gradient', () => {
    const nodes = [ingredient({ myProp: 0 }), ingredient({ myProp: 10 })].map((data): RecipeNode => ({ data, parent: null, children: undefined }))
    const propertyMapping = computePropertyMapping(nodes)
    const color = computeNodeColor(nodes[1], baseContext({ mode: 'myProp', propertyMapping, minColor: '#000000', maxColor: '#ffffff' }))
    expect(color).toBe('rgb(255, 255, 255)')
  })

  it('string custom property uses the precomputed categorical palette', () => {
    const node: RecipeNode = { data: ingredient({ myCategory: 'alpha' }), parent: null, children: undefined }
    const palette = new Map([['alpha', 'hsl(10, 65%, 55%)']])
    const categoricalPalettes = new Map([['myCategory', palette]])
    expect(computeNodeColor(node, baseContext({ mode: 'myCategory', categoricalPalettes }))).toBe('hsl(10, 65%, 55%)')
  })
})

describe('resolveFillColor', () => {
  it('root always uses its own explicit color regardless of mode', () => {
    const root: RecipeNode = { data: { nodetype: 'compartment', name: 'root', geom: '', geom_type: '', thickness: 0, color: [0, 1, 0] }, parent: null, children: [] }
    expect(resolveFillColor(root, 0, false, baseContext({ mode: 'pdb' }))).toBe('rgb(0, 255, 0)')
  })

  it('non-root compartments use depth color for any mode except "color"', () => {
    const root: RecipeNode = { data: { nodetype: 'compartment', name: 'root', geom: '', geom_type: '', thickness: 0, color: null }, parent: null, children: [] }
    const compartment: RecipeNode = { data: { nodetype: 'compartment', name: 'c', geom: '', geom_type: '', thickness: 0, color: [1, 1, 0] }, parent: root, children: [] }
    expect(resolveFillColor(compartment, 1, false, baseContext({ mode: 'pdb' }))).not.toBe('rgb(255, 255, 0)')
    expect(resolveFillColor(compartment, 1, false, baseContext({ mode: 'color' }))).toBe('rgb(255, 255, 0)')
  })

  it('leaves fall back to depth color when the mode has nothing to say', () => {
    const node: RecipeNode = { data: ingredient({ geom: 'sphere' }), parent: null, children: undefined }
    const color = resolveFillColor(node, 2, true, baseContext({ mode: 'geom' }))
    expect(color).not.toBe('red')
  })
})
