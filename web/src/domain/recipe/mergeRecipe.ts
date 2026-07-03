/**
 * Port of the "Append From" merge feature: js/modal_merge.js:merge_getModal +
 * js/main.js:merge_graph/merge_node/merge_one_node (main.js:5630-5773).
 *
 * The field checkboxes legacy exposes in the merge modal reuse `allfield`'s
 * 21 keys verbatim (`modal_merge.js:66-69` loops `for (var k in allfield)`),
 * but most of them are dead in practice: `merge_node` only copies a field
 * when `allfield_key[k] in newnode.data` is true (main.js:5637), and for
 * several keys the declared target name doesn't match the ingredient data's
 * real field name, so the condition never holds. Confirmed empirically
 * against a real fixture (`data/Mpn_1.0_2.json`, loaded in the actual legacy
 * app, merged against a hand-perturbed copy of itself via
 * `#jsfile_input_merge`, output diffed field-by-field — not just read from
 * source, since "the code says so" isn't the same as "legacy's own output
 * agrees"):
 *  - LIVE (checkbox visibly changes the merged value): count, molarity,
 *    uniprot, confidence, color, label, molecularweight, include, offset,
 *    pcpalAxis, location(->surface), and source as a *whole object*
 *    (bu/selection/model only change as a side effect of the whole `source`
 *    object being replaced — their own individual checkboxes are dead, see
 *    below, so this port folds them into one "source" control instead of
 *    three inert ones).
 *  - DEAD (checkbox has zero effect — verified: a perturbed "comments" cell
 *    did not survive a merge): compartment (structural, not a data field),
 *    bu/selection/model individually (target is `data.bu`/`.selection`/
 *    `.model`, but the real field is nested under `data.source.*`), comment
 *    (target is `data.comment`, but the real field is `data.comments`),
 *    image/offsety/scale2d (target fields live under `data.sprite.*`, not
 *    top-level). `name` is excluded too: it's always a same-value overwrite
 *    since name equality is the match key, so its checkbox is inert by
 *    construction. Per the project's own review of this port: an inert
 *    checkbox is a UI that lies, so the dead ones aren't rendered — this
 *    isn't "fixing" legacy's behavior, only its dialog.
 *
 * Also confirmed from the same oracle output: link merging only *updates* an
 * existing link matched by name pair (main.js:5730-5741); it never adds a
 * new link for a newly-merged-in ingredient pair.
 *
 * Deliberate simplification vs. legacy's actual mechanism (same end
 * result): legacy clones a whole new subtree at once
 * (`JSON.parse(JSON.stringify(new_node.data))` in `merge_one_node`), which
 * only avoids duplicating that subtree's descendants because they're
 * revisited individually later in the same pre-order loop and by then find
 * their already-cloned parent. Since this port also walks the incoming
 * graph in pre-order (matching `flattenRecipeTree`) and creates each node
 * individually, a freshly-created compartment is empty (no cloned nested
 * children) and its own descendants attach to it on their own turn — same
 * final tree, no cloning trick needed.
 */
import type { MappableField } from '../files/columnMapping'
import {
  type CompartmentData,
  type RecipeGraph,
  type RecipeLink,
  type RecipeNode,
  type RecipeTreeNode,
} from './types'

/** Subset of MappableField whose merge checkbox actually changes anything (see docstring). */
export const MERGEABLE_FIELDS: MappableField[] = [
  'source', 'count', 'molarity', 'uniprot', 'molecularweight', 'confidence',
  'include', 'color', 'label', 'location', 'offset', 'pcpalAxis',
]

export type MergeFieldFlags = Record<MappableField, boolean>

export function defaultMergeFieldFlags(): MergeFieldFlags {
  const flags = {} as MergeFieldFlags
  for (const field of MERGEABLE_FIELDS) flags[field] = true
  return flags
}

export interface MergeOptions {
  fieldFlags: MergeFieldFlags
  /** Port of legacy's `create_when_merge` global (default true): whether an
   *  incoming node with no name match becomes a new node, or is dropped. */
  createWhenMerge: boolean
}

function applyMergeField(cnodeData: Record<string, unknown>, incomingData: Record<string, unknown>, field: MappableField) {
  if (field === 'source') {
    if ('source' in incomingData) cnodeData.source = { ...(incomingData.source as object) }
    return
  }
  const key = field === 'location' ? 'surface' : field
  if (key in incomingData) cnodeData[key] = incomingData[key]
}

/** Port of js/main.js:merge_node (main.js:5630-5652). */
function mergeNode(cnode: RecipeNode, incoming: RecipeNode, fieldFlags: MergeFieldFlags) {
  for (const field of MERGEABLE_FIELDS) {
    if (fieldFlags[field]) applyMergeField(cnode.data as Record<string, unknown>, incoming.data as Record<string, unknown>, field)
  }
}

/** Port of js/main.js:merge_one_node (main.js:5654-5678), minus the dead
 *  `id`/`opm` bookkeeping fields (not modeled on IngredientData, not read
 *  by any exporter). */
function mergeOneNode(nodes: RecipeNode[], incoming: RecipeNode, parentInCurrent: RecipeNode): RecipeNode {
  const clonedData = structuredClone(incoming.data) as RecipeTreeNode
  if (clonedData.nodetype === 'compartment') (clonedData as CompartmentData & { children: RecipeTreeNode[] }).children = []
  const newNode: RecipeNode = {
    data: clonedData,
    parent: parentInCurrent,
    children: clonedData.nodetype === 'compartment' ? [] : undefined,
  }
  parentInCurrent.children = parentInCurrent.children ?? []
  parentInCurrent.children.push(newNode)
  nodes.push(newNode)
  return newNode
}

/**
 * Port of js/main.js:merge_graph (main.js:5680-5773), minus the D3
 * simulation/canvas bookkeeping (`pack`, `simulation.restart`, etc — that's
 * the wrapped canvas's concern, not the graph model's).
 */
export function mergeRecipeGraphs(current: RecipeGraph, incoming: RecipeGraph, options: MergeOptions): RecipeGraph {
  const nodes = [...current.nodes]
  const findByName = (name: string) => nodes.find((n) => n.data.name === name)

  for (const incomingNode of incoming.nodes) {
    if (!incomingNode.parent) continue // the incoming graph's own root is never merged in (matches `n !== new_root`)
    const existing = findByName(incomingNode.data.name)
    if (existing) {
      mergeNode(existing, incomingNode, options.fieldFlags)
    } else if (options.createWhenMerge) {
      const parent = findByName(incomingNode.parent.data.name) ?? nodes[0]
      mergeOneNode(nodes, incomingNode, parent)
    }
  }

  const links: RecipeLink[] = current.links.map((l) => ({ ...l }))
  for (const incomingLink of incoming.links) {
    for (const existingLink of links) {
      const sameOrder = incomingLink.name1 === existingLink.name1 && incomingLink.name2 === existingLink.name2
      const swapped = incomingLink.name1 === existingLink.name2 && incomingLink.name2 === existingLink.name1
      if (sameOrder || swapped) {
        existingLink.pdb1 = incomingLink.pdb1
        existingLink.sel1 = incomingLink.sel1
        existingLink.sel2 = incomingLink.sel2
        existingLink.coords1 = incomingLink.coords1
        existingLink.coords2 = incomingLink.coords2
        existingLink.beads1 = incomingLink.beads1
        existingLink.beads2 = incomingLink.beads2
      }
    }
  }

  return { nodes, links }
}
