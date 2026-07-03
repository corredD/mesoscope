import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLegacyRecipe } from '../src/domain/recipe/parseLegacyRecipe'
import { isCompartmentNode, isIngredientNode } from '../src/domain/recipe/types'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

describe('parseLegacyRecipe: serialized fixture (data/HIV_serialized.json)', () => {
  const graph = parseLegacyRecipe(loadFixture('HIV_serialized.json'), 'serialized')
  const ingredients = graph.nodes.filter(isIngredientNode)
  const compartments = graph.nodes.filter(isCompartmentNode)

  it('parses every ingredient across nested surface/interior groups', () => {
    // 5 envelope surface + 15 envelope interior + 1 capsid-outer surface + 5 capsid-inner interior
    expect(ingredients).toHaveLength(26)
  })

  it('keeps the real (non-surface/interior) compartment hierarchy, flattening pseudo groups', () => {
    const names = compartments.map((n) => n.data.name).sort()
    expect(names).toEqual(
      [
        'HIV',
        'HIV1_envelope_Pack_145_0_2_0',
        'HIV1_capsid_3j3q_PackOuter_0_1_1',
        'HIV1_capsid_3j3q_PackInner_0_1_0',
      ].sort(),
    )
  })

  it('normalizes a surface ingredient with source/count/surface flag intact', () => {
    const ma = ingredients.find((n) => n.data.name === 'HIV1_MA_Hyb_0_1_0')
    expect(ma).toBeDefined()
    expect(ma!.data.source.pdb).toBe('MA_matrix_G1.pdb')
    expect(ma!.data.source.bu).toBe('BU1')
    expect(ma!.data.count).toBe(0)
    expect(ma!.data.surface).toBe(true)
    expect(ma!.parent?.data.name).toBe('HIV1_envelope_Pack_145_0_2_0')
  })

  it('attaches nested-compartment ingredients to their real parent, not a pseudo node', () => {
    const ca = ingredients.find((n) => n.data.name === 'HIV1_CA_mono_0_1_0')
    expect(ca).toBeDefined()
    expect(ca!.data.surface).toBe(true)
    expect(ca!.parent?.data.name).toBe('HIV1_capsid_3j3q_PackOuter_0_1_1')
  })
})

describe('parseLegacyRecipe: classic fixture (data/InfluenzaA.json)', () => {
  const graph = parseLegacyRecipe(loadFixture('InfluenzaA.json'), 'classic')
  const ingredients = graph.nodes.filter(isIngredientNode)
  const compartments = graph.nodes.filter(isCompartmentNode)

  it('parses the envelope surface ingredients', () => {
    const names = ingredients.map((n) => n.data.name).sort()
    expect(names).toEqual(['Hemagglutinin', 'M2protein', 'Neuraminidase'].sort())
  })

  it('creates the envelope compartment under the recipe root', () => {
    const envelope = compartments.find((n) => n.data.name === 'envelope')
    expect(envelope).toBeDefined()
    expect(envelope!.parent?.data.name).toBe('InfluenzaA')
  })

  it('marks every envelope ingredient as surface', () => {
    for (const ingredient of ingredients) expect(ingredient.data.surface).toBe(true)
  })

  it('auto-detects the format from the JSON shape', () => {
    const auto = parseLegacyRecipe(loadFixture('InfluenzaA.json'), 'auto')
    expect(auto.nodes.filter(isIngredientNode)).toHaveLength(3)
  })
})
