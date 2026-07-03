/**
 * Small helpers for reading chain ids and atom coordinates out of a loaded
 * Mol-star `Structure` — used by `IngredientOptions.tsx` for chain
 * selection and LOD/clustering (`domain/recipe/clustering.ts`'s k-means runs
 * over the coordinates this extracts). There's no single "list the chains"
 * or "get all atom coordinates" convenience on `Structure` itself; both are
 * built from the standard per-element property/conformation access pattern
 * Mol-star's own color themes and representations use internally.
 */
import { StructureElement } from 'molstar/lib/mol-model/structure/structure/element.js'
import { StructureProperties } from 'molstar/lib/mol-model/structure/structure/properties.js'
import type { Structure } from 'molstar/lib/mol-model/structure/structure/structure.js'
import { Vec3 } from 'molstar/lib/mol-math/linear-algebra.js'

/** Chain ids (`label_asym_id`) in the structure, deduplicated, in encounter order. */
export function listChains(structure: Structure): string[] {
  const seen = new Set<string>()
  const loc = StructureElement.Location.create(structure)
  for (const unit of structure.units) {
    loc.unit = unit
    for (let i = 0, il = unit.elements.length; i < il; i++) {
      loc.element = unit.elements[i]
      seen.add(StructureProperties.chain.label_asym_id(loc))
    }
  }
  return [...seen]
}

/**
 * World-space (assembly/symmetry-transformed) coordinates of every atom,
 * optionally restricted to a set of chain ids. Returns plain tuples, not
 * `Vec3`s, so callers (e.g. `clustering.ts`) don't need a Mol-star import.
 */
export function getAtomPositions(structure: Structure, chainFilter?: Set<string>): [number, number, number][] {
  const positions: [number, number, number][] = []
  const loc = StructureElement.Location.create(structure)
  const v = Vec3()
  for (const unit of structure.units) {
    loc.unit = unit
    for (let i = 0, il = unit.elements.length; i < il; i++) {
      const element = unit.elements[i]
      if (chainFilter) {
        loc.element = element
        if (!chainFilter.has(StructureProperties.chain.label_asym_id(loc))) continue
      }
      unit.conformation.position(element, v)
      positions.push([v[0], v[1], v[2]])
    }
  }
  return positions
}
