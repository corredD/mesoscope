import { describe, expect, it } from 'vitest'
import { computePropertyMapping, listGroupableProperties } from '../src/domain/recipe/propertyMapping'
import type { IngredientData, RecipeNode } from '../src/domain/recipe/types'

function ingredient(overrides: Partial<IngredientData>): RecipeNode {
  const data: IngredientData = {
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
  return { data, parent: null, children: undefined }
}

describe('computePropertyMapping', () => {
  it('computes min/max for numeric properties only', () => {
    const nodes = [ingredient({ size: 5, molecularweight: 100 }), ingredient({ size: 15, molecularweight: 50 })]
    const stats = computePropertyMapping(nodes)
    expect(stats.size).toEqual({ min: 5, max: 15 })
    expect(stats.molecularweight).toEqual({ min: 50, max: 100 })
    expect(stats.name).toBeUndefined() // string field, excluded
  })

  it('ignores compartment nodes', () => {
    const compartment: RecipeNode = { data: { nodetype: 'compartment', name: 'c', geom: '', geom_type: '', thickness: 0, color: null }, parent: null, children: [] }
    const stats = computePropertyMapping([compartment])
    expect(stats).toEqual({})
  })
})

describe('listGroupableProperties', () => {
  it('includes a categorical property with 2+ distinct values', () => {
    const nodes = [ingredient({ ingtype: 'enzyme' }), ingredient({ ingtype: 'structural' })]
    expect(listGroupableProperties(nodes)).toContain('ingtype')
  })

  it('excludes a property every ingredient shares the same value for', () => {
    const nodes = [ingredient({ ingtype: 'enzyme' }), ingredient({ ingtype: 'enzyme' })]
    expect(listGroupableProperties(nodes)).not.toContain('ingtype')
  })

  it('excludes per-ingredient identifier fields even if they vary', () => {
    const nodes = [ingredient({ name: 'a' }), ingredient({ name: 'b' })]
    expect(listGroupableProperties(nodes)).not.toContain('name')
    expect(listGroupableProperties(nodes)).not.toContain('label')
  })

  it('includes numeric properties with 2+ distinct values too', () => {
    const nodes = [ingredient({ size: 5 }), ingredient({ size: 15 })]
    expect(listGroupableProperties(nodes)).toContain('size')
  })
})
