/**
 * Ports of the two legacy exporters:
 *  - js/query_helper.js: getCurrentNodesAsCP_JSON + OneCPIngredient + AddPartner (classic)
 *  - js/cp_serialized.js: serializedRecipe + oneIngredientSerialized + oneCompartment
 *    + AddPartnerSerialized (serialized)
 *
 * "cellPACK-gpu recipe" (menu: Save > cellPACK-gpu recipe, handler
 * SaveRecipeCellPACK_serialized in js/query_helper.js:2039) calls the same
 * `serializedRecipe()` used for the plain "_serialized.json" save — verified
 * by reading the handler. There is only one serialized format, so this
 * module exposes exactly two serializers, not three.
 *
 * Two deliberate deviations from the legacy source, both no-ops on real
 * recipes and noted inline where they occur:
 *  - `custom_data` is computed per-ingredient (see `customIngredientFields`
 *    in ./types) instead of from a single global list shared across the
 *    whole export, so one ingredient's extra column can't leak an
 *    `undefined` field onto every other ingredient.
 *  - the partner de-dup check in the serialized exporter's "target" branch
 *    compares against the new partner's actual name instead of the
 *    ingredient's own name (a copy/paste bug in the legacy
 *    `AddPartnerSerialized`), so re-exporting a recipe with reciprocal
 *    partner links repeatedly can't accumulate duplicate entries.
 */
import {
  buildIngredientNamePath,
  customIngredientFields,
  isCompartmentNode,
  isIngredientNode,
  type CompartmentData,
  type IngredientData,
  type PositionLod,
  type RadiiLod,
  type RecipeGraph,
  type RecipeLink,
  type RecipeNode,
  type RecipeSource,
  type SpriteInfo,
} from './types'

export type RecipeExportFormat = 'classic' | 'serialized'

/* -------------------------------------------------------------------- */
/* Classic format                                                        */
/* -------------------------------------------------------------------- */

export interface ClassicIngredientJson {
  encapsulatingRadius: number
  name: string
  source: RecipeSource
  nbMol: number
  molarity: number
  molecularweight: number
  meshFile: string
  meshType: string
  principalVector: number[]
  offset: number[]
  fiberAxis: number[]
  fiberOffset: number[]
  uniprot: string
  label: string
  Type: string
  packingMode: string
  comments: string
  ingtype: string
  confidence: number
  sprite: SpriteInfo
  custom_data: string[]
  positions?: PositionLod[]
  radii?: RadiiLod[]
  color?: number[] | null
  partners_name?: string[]
  properties?: Record<string, unknown>
  [key: string]: unknown
}

export interface ClassicCompartmentJson {
  geom_type: string
  geom: unknown
  name: string
  thickness: number
  mb?: { positions: number[]; radii: number[] }
  surface: { ingredients: Record<string, ClassicIngredientJson> }
  interior: { ingredients: Record<string, ClassicIngredientJson> }
}

export interface ClassicRecipeJson {
  recipe: { paths: [string, string][]; name: string; version: string }
  options: Record<string, unknown>
  cytoplasme: { ingredients: Record<string, ClassicIngredientJson> }
  compartments: Record<string, ClassicCompartmentJson>
}

const CLASSIC_DEFAULT_OPTIONS = {
  cancelDialog: false,
  _hackFreepts: false,
  windowsSize: 50,
  use_gradient: false,
  placeMethod: 'jitter',
  saveResult: false,
  runTimeDisplay: false,
  overwritePlaceMethod: true,
  innerGridMethod: 'jordan',
  gradients: [] as unknown[],
  smallestProteinSize: 0,
  computeGridParams: true,
  freePtsUpdateThrehod: 0.0,
  pickWeightedIngr: true,
  _timer: false,
  ingrLookForNeighbours: false,
  pickRandPt: true,
  largestProteinSize: 0,
  resultfile: '',
  use_periodicity: false,
  EnviroOnly: false,
}

/** boundingBox is normally computed from canvas/compartment geometry (drawCompRec in
 *  js/main.js); that's a wrapped canvas concern, not domain data, so we default it
 *  here when the parsed recipe didn't carry one. */
function classicOptions(rootNode: RecipeNode): Record<string, unknown> {
  const bb = (rootNode.data as CompartmentData).boundingBox
  const boundingBox = bb
    ? [[bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.max.y, bb.max.z]]
    : [[0, 0, 0], [0, 0, 0]]
  return { ...CLASSIC_DEFAULT_OPTIONS, boundingBox }
}

function emptyClassicCompartment(node: RecipeNode): ClassicCompartmentJson {
  const data = node.data as CompartmentData
  const gtype = data.geom_type || 'None'
  const name = data.name === 'cytoplasm' ? 'cytoplasme' : data.name
  const out: ClassicCompartmentJson = {
    geom_type: gtype,
    geom: data.geom || '',
    name,
    thickness: data.thickness ?? 7.5,
    surface: { ingredients: {} },
    interior: { ingredients: {} },
  }
  if (gtype === 'mb' && data.pos && data.radii) {
    out.mb = { positions: data.pos[0].coords, radii: data.radii[0].radii }
  }
  return out
}

function buildClassicIngredient(node: RecipeNode): ClassicIngredientJson {
  const data = node.data as IngredientData
  const source: RecipeSource = { ...data.source }
  if (data.uniprot) source.uniprot = data.uniprot
  if (!source.selection) source.selection = ''
  if (!source.bu) source.bu = ''
  if (!source.model) source.model = ''
  const out: ClassicIngredientJson = {
    encapsulatingRadius: data.size,
    name: data.name,
    source,
    nbMol: data.count || 0,
    molarity: data.molarity,
    molecularweight: data.molecularweight,
    meshFile: data.geom,
    meshType: data.geom_type,
    principalVector: data.pcpalAxis,
    offset: data.offset,
    fiberAxis: data.fiberAxis,
    fiberOffset: data.fiberOffset,
    uniprot: data.uniprot,
    label: data.label,
    Type: data.ingtype === 'fiber' ? 'Grow' : 'MultiSphere',
    packingMode: data.buildtype,
    comments: data.comments,
    ingtype: data.ingtype,
    confidence: data.confidence,
    sprite: data.sprite,
    custom_data: [],
  }
  if (data.pos && data.radii) {
    out.positions = data.pos
    out.radii = data.radii
  }
  if (data.color) out.color = data.color
  for (const key of customIngredientFields(data)) {
    out[key] = data[key]
    out.custom_data.push(key)
  }
  return out
}

/** Port of js/query_helper.js:AddPartner (bug-for-bug: the target branch writes
 *  bead arrays into sel1/sel2, matching the legacy `properties` shape). */
function addClassicPartners(ingdic: ClassicIngredientJson, node: RecipeNode, links: RecipeLink[]) {
  ingdic.partners_name = []
  for (const link of links) {
    if (link.source === node && !ingdic.partners_name.includes(link.target.data.name)) {
      ingdic.partners_name.push(link.target.data.name)
      ingdic.properties = { beads1: link.beads1, beads2: link.beads2, sel1: link.sel1, sel2: link.sel2, pdb1: link.pdb1 }
    }
    if (link.target === node && !ingdic.partners_name.includes(link.source.data.name)) {
      ingdic.partners_name.push(link.source.data.name)
      ingdic.properties = { beads1: link.beads2, beads2: link.beads1, sel1: link.beads2, sel2: link.beads1, pdb1: link.pdb1 }
    }
  }
}

/** Port of js/query_helper.js:getCurrentNodesAsCP_JSON. */
export function serializeRecipeClassic(graph: RecipeGraph): ClassicRecipeJson {
  const rootNode = graph.nodes[0]
  const json: ClassicRecipeJson = {
    recipe: {
      paths: [['autoPACKserver', 'https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/']],
      name: rootNode.data.name,
      version: '1.0',
    },
    options: classicOptions(rootNode),
    cytoplasme: { ingredients: {} },
    compartments: {},
  }

  for (const node of graph.nodes) {
    if (!node.parent) continue // root, already used above
    if (isCompartmentNode(node)) {
      const cname = node.data.name === 'cytoplasm' ? 'cytoplasme' : node.data.name
      if (!(cname in json.compartments)) json.compartments[cname] = emptyClassicCompartment(node)
      continue
    }
    if (isIngredientNode(node)) {
      if (node.data.include === false) continue
      let cname = node.parent.data.name === 'cytoplasm' ? 'cytoplasme' : node.parent.data.name
      if (!(cname in json.compartments) && node.parent !== rootNode) {
        json.compartments[cname] = emptyClassicCompartment(node.parent)
      }
      const ingdic = buildClassicIngredient(node)
      if (graph.links.length) addClassicPartners(ingdic, node, graph.links)
      if (node.parent === rootNode || cname === 'cytoplasme') {
        json.cytoplasme.ingredients[node.data.name] = ingdic
      } else if (node.data.surface) {
        json.compartments[cname].surface.ingredients[node.data.name] = ingdic
      } else {
        json.compartments[cname].interior.ingredients[node.data.name] = ingdic
      }
    }
  }
  return json
}

/* -------------------------------------------------------------------- */
/* Serialized format                                                     */
/* -------------------------------------------------------------------- */

export interface SerializedPartnerJson {
  partner_id: number
  partner_name: string
  binding_site_lod: { binding_proba: number; binding_occupied: string; binding_max: number; binding_site: unknown[]; coords: number[] }[]
}

export interface SerializedIngredientJson {
  ingredient_id: number
  name: string
  path: string
  partners_properties: SerializedPartnerJson[]
  encapsulatingRadius: number
  source: RecipeSource
  nbMol: number
  molarity: number
  principalVector: number[]
  fiberAxis: number[]
  fiberOffset: number[]
  description: string
  meshFile: string
  meshType: string
  ingtype: string
  buildtype: string
  comments: string
  color: number[] | null
  uniprot: string
  confidence: number
  molecularweight: number
  sprite: SpriteInfo
  custom_data: string[]
  positions?: PositionLod[]
  radii_lod?: RadiiLod[]
  [key: string]: unknown
}

export interface SerializedIngredientGroupJson {
  local_id: number
  unique_id: number
  name: string
  Ingredients: SerializedIngredientJson[]
  groupType: number
}

export interface SerializedCompartmentJson {
  local_id: number
  unique_id: number
  name: string
  Compartments: SerializedCompartmentJson[]
  IngredientGroups: SerializedIngredientGroupJson[]
  geom_type?: string
  thickness?: number
  color?: number[] | null
  mesh?: unknown
  filename?: string
  radius?: number
  mb?: { positions: number[]; radii: number[]; types: string[] }
}

function newCompartment(name: string, id: number): SerializedCompartmentJson {
  return { local_id: 0, unique_id: id, name, Compartments: [], IngredientGroups: [] }
}

function addCompartment(parent: SerializedCompartmentJson, child: SerializedCompartmentJson) {
  if (child.name === 'surface' && parent.Compartments.length !== 0) {
    parent.Compartments.splice(0, 0, child)
  } else {
    parent.Compartments.push(child)
  }
  child.local_id = parent.Compartments.length - 1
}

function newIngredientGroup(name: string, groupType: number, id: number): SerializedIngredientGroupJson {
  return { local_id: 0, unique_id: id, name, Ingredients: [], groupType }
}

function addIngredientGroup(parent: SerializedCompartmentJson, group: SerializedIngredientGroupJson) {
  parent.IngredientGroups.push(group)
  group.local_id = parent.IngredientGroups.length - 1
}

/** Port of js/cp_serialized.js:oneCompartment. */
function oneCompartmentOut(scomp: SerializedCompartmentJson, node: RecipeNode): SerializedCompartmentJson {
  const data = node.data as CompartmentData
  const gtype = data.geom_type || 'None'
  const geom = data.geom || ''
  scomp.geom_type = gtype
  if (gtype === 'raw') {
    scomp.mesh = geom
  } else if (gtype === 'file') {
    scomp.filename = typeof geom === 'string' ? geom : (geom as { name: string }).name
  } else if (gtype === 'sphere') {
    scomp.radius = (geom as { radius?: number }).radius ?? 500
  } else if (gtype === 'mb') {
    scomp.mb = { positions: [], radii: [], types: [] }
    if (data.pos && data.radii) {
      scomp.mb.positions = data.pos[0].coords
      scomp.mb.radii = data.radii[0].radii
      scomp.mb.types = data.types?.[0]?.types ?? []
    }
  }
  scomp.thickness = data.thickness ?? 7.5
  scomp.color = data.color ?? null
  return scomp
}

/** Port of js/cp_serialized.js:oneIngredientSerialized. */
function buildIngredientOut(node: RecipeNode, idRef: { next: number }): SerializedIngredientJson {
  const data = node.data as IngredientData
  const source: RecipeSource = { ...data.source }
  if (!source.transform) source.transform = { offset: data.offset }
  source.transform.center = data.center
  if (!source.selection) source.selection = ''
  if (!source.bu) source.bu = ''
  if (!source.model) source.model = ''

  const out: SerializedIngredientJson = {
    ingredient_id: idRef.next++,
    name: data.name,
    path: '',
    partners_properties: [],
    encapsulatingRadius: data.size,
    source,
    nbMol: data.count,
    molarity: data.molarity,
    principalVector: data.pcpalAxis,
    fiberAxis: data.fiberAxis,
    fiberOffset: data.fiberOffset,
    description: data.label,
    meshFile: data.geom,
    meshType: data.geom_type,
    ingtype: data.ingtype,
    buildtype: data.buildtype,
    comments: data.comments,
    color: data.color,
    uniprot: data.uniprot,
    confidence: data.confidence,
    molecularweight: data.molecularweight,
    sprite: data.sprite,
    custom_data: [],
  }
  if (data.pos && data.radii) {
    out.positions = data.pos
    out.radii_lod = data.radii.filter((r): r is RadiiLod => !!r && Array.isArray(r.radii))
  }
  for (const key of customIngredientFields(data)) {
    out[key] = data[key]
    out.custom_data.push(key)
  }
  return out
}

function newBindingSite(beads: unknown[], coords: number[]) {
  return { binding_proba: 1, binding_occupied: 'uniform_start', binding_max: 1, binding_site: beads, coords }
}

/** Port of js/cp_serialized.js:AddPartnerSerialized (with the dedup-key fix noted at the top of this file). */
function addPartnersOut(singr: SerializedIngredientJson, node: RecipeNode, links: RecipeLink[]) {
  for (const link of links) {
    if (link.source === node) {
      const newName = link.target.data.name
      if (!singr.partners_properties.some((p) => p.partner_name === newName)) {
        singr.partners_properties.push({
          partner_id: -1,
          partner_name: newName,
          binding_site_lod: [newBindingSite(link.beads1, link.coords1), newBindingSite(link.beads2, link.coords2)],
        })
      }
    }
    if (link.target === node) {
      const newName = link.source.data.name
      if (!singr.partners_properties.some((p) => p.partner_name === newName)) {
        singr.partners_properties.push({
          partner_id: -1,
          partner_name: newName,
          binding_site_lod: [newBindingSite(link.beads2, link.coords2), newBindingSite(link.beads1, link.coords1)],
        })
      }
    }
  }
}

/** Port of js/cp_serialized.js:serializedRecipe. */
export function serializeRecipeSerialized(graph: RecipeGraph): SerializedCompartmentJson {
  const listComp = new Map<string, SerializedCompartmentJson>()
  const compartmentId = { next: 0 }
  const groupId = { next: 0 }
  const ingredientId = { next: 0 }
  let root: SerializedCompartmentJson | undefined
  let aroot: RecipeNode | undefined

  const addCompartmentToList = (node: RecipeNode, cname: string): SerializedCompartmentJson => {
    const comp = oneCompartmentOut(newCompartment(cname, compartmentId.next++), node)
    listComp.set(cname, comp)
    const parentName = node.parent!.data.name
    if (!listComp.has(parentName)) {
      listComp.set(parentName, oneCompartmentOut(newCompartment(parentName, compartmentId.next++), node.parent!))
    }
    addCompartment(listComp.get(parentName)!, comp)
    return comp
  }

  const proteinGroupOf = (comp: SerializedCompartmentJson): SerializedIngredientGroupJson => {
    if (comp.IngredientGroups.length === 0) {
      addIngredientGroup(comp, newIngredientGroup('proteins', 0, groupId.next++))
    }
    return comp.IngredientGroups[0]
  }

  for (const node of graph.nodes) {
    if (!node.parent) {
      root = newCompartment(node.data.name, compartmentId.next++)
      listComp.set(node.data.name, root)
      aroot = node
      continue
    }
    if (isCompartmentNode(node)) {
      const cname = node.data.name
      if (!listComp.has(cname)) addCompartmentToList(node, cname)
      continue
    }
    if (isIngredientNode(node)) {
      if (node.data.include === false) continue
      const cname = node.parent.data.name
      const singr = buildIngredientOut(node, ingredientId)
      if (graph.links.length) addPartnersOut(singr, node, graph.links)

      if (node.parent === aroot) {
        proteinGroupOf(root!).Ingredients.push(singr)
      } else if (node.data.surface) {
        const key = `${cname}_surface`
        if (!listComp.has(key)) {
          if (!listComp.has(cname)) addCompartmentToList(node.parent, cname)
          const acomp = newCompartment('surface', compartmentId.next++)
          listComp.set(key, acomp)
          addCompartment(listComp.get(cname)!, acomp)
        }
        proteinGroupOf(listComp.get(key)!).Ingredients.push(singr)
      } else {
        const key = `${cname}_interior`
        if (!listComp.has(key)) {
          if (!listComp.has(cname)) addCompartmentToList(node.parent, cname)
          const acomp = newCompartment('interior', compartmentId.next++)
          listComp.set(key, acomp)
          addCompartment(listComp.get(cname)!, acomp)
        }
        proteinGroupOf(listComp.get(key)!).Ingredients.push(singr)
      }
    }
  }
  return root!
}

/* -------------------------------------------------------------------- */
/* Dispatcher + molarity/count (Load/Save > Molarity/Count)              */
/* -------------------------------------------------------------------- */

export function serializeRecipe(
  graph: RecipeGraph,
  format: RecipeExportFormat,
): ClassicRecipeJson | SerializedCompartmentJson {
  return format === 'serialized' ? serializeRecipeSerialized(graph) : serializeRecipeClassic(graph)
}

export interface MolarityCountEntry {
  molarity: number
  count: number
}

/** Port of js/cp_serialized.js:cp_SerializedMolarity. */
export function exportMolarityCount(graph: RecipeGraph): Record<string, MolarityCountEntry> {
  const out: Record<string, MolarityCountEntry> = {}
  for (const node of graph.nodes) {
    if (!isIngredientNode(node)) continue
    out[buildIngredientNamePath(node)] = {
      molarity: Number(node.data.molarity),
      count: Math.trunc(Number(node.data.count)),
    }
  }
  return out
}

/** Port of js/cp_serialized.js:cp_DeserializedMolarity. Mutates ingredient nodes in place. */
export function importMolarityCount(graph: RecipeGraph, data: Record<string, MolarityCountEntry>): void {
  for (const node of graph.nodes) {
    if (!isIngredientNode(node)) continue
    const entry = data[buildIngredientNamePath(node)]
    if (!entry) continue
    node.data.molarity = entry.molarity
    node.data.count = entry.count
  }
}
