import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLegacyRecipe } from '../src/domain/recipe/parseLegacyRecipe'
import {
  exportMolarityCount,
  importMolarityCount,
  serializeRecipeClassic,
  serializeRecipeSerialized,
} from '../src/domain/recipe/serializeRecipe'
import { buildIngredientNamePath, isIngredientNode } from '../src/domain/recipe/types'
import { exportColorPalette, importColorPalette } from '../src/domain/colors/colorPalette'
import { exportRecipeCsv } from '../src/domain/files/csv'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

describe('serialize -> reparse round trip: serialized fixture', () => {
  const original = parseLegacyRecipe(loadFixture('HIV_serialized.json'), 'serialized')

  it('preserves ingredient count and a broad set of key fields through a full round trip', () => {
    // Note: HIV1_IN_1ex4_0_1_0 legitimately appears twice in this recipe (once
    // free in the envelope interior, once packaged under capsid interior), so
    // ingredient names aren't unique — compare on fingerprint tuples rather
    // than a name-keyed map.
    const exported = serializeRecipeSerialized(original)
    const reparsed = parseLegacyRecipe(exported, 'serialized')

    const originalIngredients = original.nodes.filter(isIngredientNode)
    const reparsedIngredients = reparsed.nodes.filter(isIngredientNode)
    expect(reparsedIngredients).toHaveLength(originalIngredients.length)

    const fingerprint = (n: (typeof originalIngredients)[number]) =>
      JSON.stringify([
        n.data.name, n.parent?.data.name, n.data.surface, n.data.source.pdb, n.data.count, n.data.molarity,
        n.data.size, n.data.molecularweight, n.data.confidence, n.data.pcpalAxis, n.data.uniprot,
        n.data.color, n.data.geom_type, n.data.pos, n.data.radii,
      ])

    expect(reparsedIngredients.map(fingerprint).sort()).toEqual(originalIngredients.map(fingerprint).sort())
  })

  it('preserves the compartment hierarchy, including nesting depth, through a full round trip', () => {
    const exported = serializeRecipeSerialized(original)
    const reparsed = parseLegacyRecipe(exported, 'serialized')
    const originalNames = original.nodes.map((n) => n.data.name).sort()
    const reparsedNames = reparsed.nodes.map((n) => n.data.name).sort()
    expect(reparsedNames).toEqual(originalNames)

    // A sorted-name-set match alone wouldn't catch capsidInner being re-parented
    // onto envelope instead of capsidOuter — assert the nesting explicitly.
    const byName = new Map(reparsed.nodes.map((n) => [n.data.name, n]))
    const capsidOuter = byName.get('HIV1_capsid_3j3q_PackOuter_0_1_1')!
    const capsidInner = byName.get('HIV1_capsid_3j3q_PackInner_0_1_0')!
    const envelope = byName.get('HIV1_envelope_Pack_145_0_2_0')!
    expect(capsidInner.parent).toBe(capsidOuter)
    expect(capsidOuter.parent).toBe(envelope)
    expect(envelope.parent?.data.name).toBe('HIV')
  })

  it('parses and re-exports bead positions/radii identically to the source fixture (oracle check)', () => {
    // The fixture was produced by the legacy serializer, so it's the ground
    // truth for "faithful port", not just "internally consistent".
    const fixture = loadFixture('HIV_serialized.json') as {
      Compartments: { IngredientGroups: { Ingredients: { name: string; positions: unknown; radii_lod: unknown }[] }[] }[]
    }
    const fixtureIngredient = fixture.Compartments[0].Compartments[0].IngredientGroups[0].Ingredients.find(
      (i) => i.name === 'HIV1_MA_Hyb_0_1_0',
    )!

    const parsedMa = original.nodes.filter(isIngredientNode).find((n) => n.data.name === 'HIV1_MA_Hyb_0_1_0')!
    expect(parsedMa.data.pos).toEqual(fixtureIngredient.positions)
    expect(parsedMa.data.radii).toEqual(fixtureIngredient.radii_lod)

    const exported = serializeRecipeSerialized(original)
    const exportedMa = exported.Compartments[0].Compartments[0].IngredientGroups[0].Ingredients.find(
      (i) => i.name === 'HIV1_MA_Hyb_0_1_0',
    )!
    expect(exportedMa.positions).toEqual(fixtureIngredient.positions)
    expect(exportedMa.radii_lod).toEqual(fixtureIngredient.radii_lod)
  })
})

describe('serialize -> reparse round trip: synthetic partner links', () => {
  // HIV/InfluenzaA both have empty partners_properties, so this exercises the
  // link-resolution and partner-export path (resolveRecipeLinks, addPartnersOut)
  // that the two real fixtures never touch.
  const serializedWithPartner = {
    name: 'root',
    IngredientGroups: [],
    Compartments: [
      {
        name: 'cyto',
        geom_type: 'None',
        IngredientGroups: [
          {
            Ingredients: [
              {
                name: 'A',
                encapsulatingRadius: 10,
                source: { pdb: '1abc', bu: 'BU1', model: '', selection: '' },
                nbMol: 1,
                molarity: 0,
                partners_properties: [
                  { partner_name: 'B', binding_site_lod: [{ binding_site: [1], coords: [0, 0, 0] }, { binding_site: [2], coords: [1, 1, 1] }] },
                ],
              },
              {
                name: 'B',
                encapsulatingRadius: 10,
                source: { pdb: '2abc', bu: 'BU1', model: '', selection: '' },
                nbMol: 1,
                molarity: 0,
                partners_properties: [],
              },
            ],
          },
        ],
        Compartments: [],
      },
    ],
  }

  it('resolves the partner link and re-exports it as partners_properties on both parse and reserialize', () => {
    const graph = parseLegacyRecipe(serializedWithPartner, 'serialized')
    expect(graph.links).toHaveLength(1)
    expect(graph.links[0].source.data.name).toBe('A')
    expect(graph.links[0].target.data.name).toBe('B')

    const exported = serializeRecipeSerialized(graph)
    // ingredients with surface:false land in a synthetic "interior" sub-compartment,
    // exactly like the real HIV fixture (see the oracle test above) — not in
    // "cyto"'s own IngredientGroups.
    const ingredients = exported.Compartments[0].Compartments[0].IngredientGroups[0].Ingredients
    const a = ingredients.find((i) => i.name === 'A')!
    const b = ingredients.find((i) => i.name === 'B')!
    expect(a.partners_properties.map((p) => p.partner_name)).toEqual(['B'])
    expect(b.partners_properties.map((p) => p.partner_name)).toEqual(['A'])
  })
})

describe('serialize -> reparse round trip: classic fixture', () => {
  const original = parseLegacyRecipe(loadFixture('InfluenzaA.json'), 'classic')

  it('preserves a broad set of key fields through a full round trip', () => {
    const exported = serializeRecipeClassic(original)
    const reparsed = parseLegacyRecipe(exported, 'classic')
    const originalIngredients = original.nodes.filter(isIngredientNode)
    const reparsedIngredients = reparsed.nodes.filter(isIngredientNode)
    expect(reparsedIngredients).toHaveLength(originalIngredients.length)

    const fingerprint = (n: (typeof originalIngredients)[number]) =>
      JSON.stringify([
        n.data.name, n.parent?.data.name, n.data.surface, n.data.source.pdb, n.data.count, n.data.molarity,
        n.data.size, n.data.molecularweight, n.data.confidence, n.data.color, n.data.ingtype, n.data.label,
      ])

    expect(reparsedIngredients.map(fingerprint).sort()).toEqual(originalIngredients.map(fingerprint).sort())
  })

  it('re-exports Hemagglutinin identically to the source fixture (oracle check)', () => {
    // The fixture was produced by the legacy exporter, so it's ground truth
    // for "faithful port", the same discipline as the serialized oracle above.
    const fixture = loadFixture('InfluenzaA.json') as {
      compartments: { envelope: { surface: { ingredients: Record<string, { source: { pdb: string }; color: number[]; label: string; Type: string }> } } }
    }
    const fixtureHa = fixture.compartments.envelope.surface.ingredients.Hemagglutinin

    const exported = serializeRecipeClassic(original)
    const exportedHa = exported.compartments.envelope.surface.ingredients.Hemagglutinin
    expect(exportedHa.source.pdb).toBe(fixtureHa.source.pdb)
    expect(exportedHa.color).toEqual(fixtureHa.color)
    expect(exportedHa.label).toBe(fixtureHa.label)
    expect(exportedHa.Type).toBe(fixtureHa.Type)
  })
})

describe('classic format: cytoplasme (root-level) ingredients and partner links', () => {
  // InfluenzaA.json's cytoplasme is empty, so this exercises the root-level
  // ingredient path and the classic AddPartner link path with synthetic data.
  const classicWithCytoplasme = {
    recipe: { name: 'synthetic', version: '1.0' },
    cytoplasme: {
      ingredients: {
        Free: {
          name: 'Free', encapsulatingRadius: 10, source: { pdb: '1abc' }, nbMol: 2, molarity: 0,
          partners_name: ['Anchor'],
        },
      },
    },
    compartments: {
      shell: {
        geom_type: 'None',
        surface: { ingredients: { Anchor: { name: 'Anchor', encapsulatingRadius: 10, source: { pdb: '2abc' }, nbMol: 1, molarity: 0 } } },
        interior: { ingredients: {} },
      },
    },
  }

  it('parses cytoplasme ingredients as direct children of the root', () => {
    const graph = parseLegacyRecipe(classicWithCytoplasme, 'classic')
    const free = graph.nodes.filter(isIngredientNode).find((n) => n.data.name === 'Free')!
    expect(free.parent?.data.name).toBe('synthetic')
    expect(free.data.surface).toBe(false)
  })

  it('resolves and re-exports the partner link back into cytoplasme', () => {
    const graph = parseLegacyRecipe(classicWithCytoplasme, 'classic')
    expect(graph.links).toHaveLength(1)

    const exported = serializeRecipeClassic(graph)
    expect(exported.cytoplasme.ingredients.Free.partners_name).toEqual(['Anchor'])

    const reparsed = parseLegacyRecipe(exported, 'classic')
    const free = reparsed.nodes.filter(isIngredientNode).find((n) => n.data.name === 'Free')!
    expect(free.parent?.data.name).toBe('synthetic')
  })
})

describe('classic format: fiber/genome ingredients (data/Mpn_1.0_2.json)', () => {
  it('parses Type:"Grow" ingredients as fiber, preserving source and packing fields', () => {
    // Known gap (documented in parseLegacyRecipe.ts): Mpn's DNA/mRNA/peptide
    // ingredients carry ~30 extra cellPACK-gpu packing fields (uLength,
    // partners_position, walkingMode, ...) with no `custom_data` list, so —
    // matching legacy `OneIngredient`'s identical limitation — those extra
    // fields are dropped on parse, not just on export. Only the fields our
    // IngredientData models are asserted here.
    const graph = parseLegacyRecipe(loadFixture('Mpn_1.0_2.json'), 'classic')
    const dna = graph.nodes.filter(isIngredientNode).find((n) => n.data.name === 'DNA')!
    expect(dna.data.ingtype).toBe('fiber')
    expect(dna.data.buildtype).toBe('random')
    expect(dna.data.source.pdb).toBe('dna_single_base.pdb')
    expect(dna.data.count).toBe(1)
  })
})

describe('color palette round trip', () => {
  it('exported colors re-import onto the same ingredients unchanged', () => {
    const graph = parseLegacyRecipe(loadFixture('HIV_serialized.json'), 'serialized')
    const palette = exportColorPalette(graph)
    const before = graph.nodes.filter(isIngredientNode).map((n) => [n.data.name, n.data.color])

    // scramble, then re-import the exported palette and check it restores the originals
    for (const node of graph.nodes.filter(isIngredientNode)) node.data.color = [0, 0, 0]
    importColorPalette(graph, palette)

    const after = graph.nodes.filter(isIngredientNode).map((n) => [n.data.name, n.data.color])
    expect(after).toEqual(before)
  })
})

describe('molarity/count round trip', () => {
  it('exported molarity/count re-imports onto the same ingredients unchanged', () => {
    const graph = parseLegacyRecipe(loadFixture('HIV_serialized.json'), 'serialized')
    const snapshot = exportMolarityCount(graph)

    for (const node of graph.nodes.filter(isIngredientNode)) {
      node.data.molarity = -1
      node.data.count = -1
    }
    importMolarityCount(graph, snapshot)

    for (const node of graph.nodes.filter(isIngredientNode)) {
      const expected = snapshot[buildIngredientNamePath(node)]
      expect(expected).toBeDefined()
      expect(node.data.molarity).toBe(expected.molarity)
      expect(node.data.count).toBe(expected.count)
    }
  })
})

describe('CSV export', () => {
  it('emits one header row plus one row per ingredient, with pdb/compartment columns populated', () => {
    const graph = parseLegacyRecipe(loadFixture('InfluenzaA.json'), 'classic')
    const csv = exportRecipeCsv(graph)
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(1 + graph.nodes.filter(isIngredientNode).length)
    expect(lines[0].split(',')).toContain('pdb')
    expect(lines[0].split(',')).toContain('compartment')
    expect(lines[1]).toContain('envelope')
  })
})
