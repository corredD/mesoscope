/**
 * Ports of js/cp_serialized.js: parseCellPackRecipe (classic) and
 * parseCellPackRecipeSerialized (serialized), plus their ingredient/link
 * helpers (OneIngredient, OneIngredientDeserialized, checkPartners,
 * checkProperties, OneIngredientDeserializedPartner, parseOneCompartment,
 * SetupOneCompartment, parseIngredientsGroups).
 *
 * Deliberately not ported: the fiber-description lookup enrichment
 * (`helper_getFiberIngredientDescription` in js/query_helper.js), which
 * depends on a server-fetched dictionary and fuzzy string matching — that's
 * a UI-layer enrichment step, not part of the recipe format itself.
 */
import {
  buildRecipeGraph,
  type CompartmentData,
  type IngredientData,
  type ParsedRecipeTree,
  type RawRecipeLink,
  type RecipeGraph,
  type RecipeSource,
  type RecipeTreeCompartmentNode,
  type RecipeTreeNode,
  type SpriteInfo,
} from './types'

export type RecipeFormat = 'classic' | 'serialized'

/** Legacy `isSerializedRecipePayload` structural half (js/main.js:1875), minus the URL/filename fallback. */
export function detectRecipeFormat(json: unknown): RecipeFormat {
  if (json && typeof json === 'object' && ('Compartments' in json || 'IngredientGroups' in json)) {
    return 'serialized'
  }
  return 'classic'
}

function normalizeVector(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value) || value.length <= 1) return fallback
  return value as number[]
}

function normalizeSprite(ingDic: Record<string, unknown>, fallbackName: string): SpriteInfo {
  const sprite: SpriteInfo = { image: '', offsety: 0, scale2d: 1, lengthy: 0 }
  const raw = ingDic.sprite as Record<string, unknown> | undefined
  if (raw) {
    sprite.image = (raw.image as string | null) ?? null
    sprite.offsety = (raw.offsety as number) ?? 0
    sprite.scale2d = (raw.scale2d as number) ?? 1
    sprite.lengthy = (raw.lengthy as number) ?? 0
  } else if ('image' in ingDic) {
    sprite.image = ingDic.image as string
  }
  if (!sprite.image) sprite.image = `${fallbackName}.png`
  return sprite
}

/** Positions/radii already in `{coords:[...]}, {radii:[...]}` form, or the older flat per-triplet form. */
function normalizePositions(
  positions: unknown,
  radii: unknown,
): { pos: IngredientData['pos']; radii: IngredientData['radii'] } {
  const p = positions as number[][][] | { coords: number[] }[] | null | undefined
  const r = radii as number[][] | { radii: number[] }[] | null | undefined
  if (!p || p.length === 0) return { pos: null, radii: null }
  if ('coords' in (p[0] as object)) {
    return { pos: p as IngredientData['pos'], radii: (r ?? null) as IngredientData['radii'] }
  }
  const pos: { coords: number[] }[] = []
  const rad: { radii: number[] }[] = []
  const flatP = p as number[][][]
  const flatR = r as number[][]
  for (let lod = 0; lod < flatP.length; lod++) {
    const coords: number[] = []
    const radiiOut: number[] = []
    for (let i = 0; i < flatP[lod].length; i++) {
      coords.push(flatP[lod][i][0], flatP[lod][i][1], flatP[lod][i][2])
      radiiOut.push(flatR[lod][i])
    }
    pos.push({ coords })
    rad.push({ radii: radiiOut })
  }
  return { pos, radii: rad }
}

function normalizeSource(ingDic: Record<string, unknown>): RecipeSource {
  const pdbFallback = (ingDic.pdb as string) ?? 'None'
  let source: RecipeSource = { pdb: pdbFallback, bu: 'BU1', model: '', selection: '' }
  if (ingDic.source && typeof ingDic.source === 'object') {
    source = { ...(ingDic.source as RecipeSource) }
    if (!source.pdb) source.pdb = 'None'
    if (!source.bu) source.bu = 'BU1'
    if (!source.model) source.model = ''
    if (!source.selection) source.selection = ''
    if (source.emdb) {
      source.pdb = `EMD-${source.emdb}.map`
    }
  }
  if (source.pdb && source.pdb.length !== 4) {
    const suffix = source.pdb.slice(-4)
    if (suffix !== '.cif' && suffix !== '.pdb' && !source.pdb.startsWith('EMD')) {
      source.pdb = `${source.pdb}.pdb`
    }
  }
  return source
}

function applyCustomData(target: Record<string, unknown>, ingDic: Record<string, unknown>) {
  const customData = ingDic.custom_data as string[] | undefined
  if (!customData) return
  for (const key of customData) target[key] = ingDic[key]
}

/* -------------------------------------------------------------------- */
/* Classic format (js/cp_serialized.js: OneIngredient, parseCellPackRecipe) */
/* -------------------------------------------------------------------- */

function ingredientTypeAndBuildType(ingDic: Record<string, unknown>): { type: string; build: string } {
  const type = (ingDic.Type as string) ?? ''
  const packingMode = (ingDic.packingMode as string) ?? ''
  return { type: type === 'Grow' ? 'fiber' : 'protein', build: packingMode }
}

function parseClassicIngredient(ingDic: Record<string, unknown>, surface: boolean): RecipeTreeNode {
  const name = ingDic.name as string
  const source = normalizeSource(ingDic)
  const btype = ingredientTypeAndBuildType(ingDic)
  const { pos, radii } = normalizePositions(ingDic.positions, ingDic.radii)
  const data: IngredientData = {
    nodetype: 'ingredient',
    name,
    label: (ingDic.label as string) ?? name,
    size: (ingDic.encapsulatingRadius as number) ?? 40,
    molecularweight: (ingDic.molecularweight as number) || 0,
    confidence: (ingDic.confidence as number) || 0,
    source,
    count: (ingDic.nbMol as number) || 0,
    molarity: (ingDic.molarity as number) || 0,
    surface,
    geom: typeof ingDic.meshFile === 'string' ? ingDic.meshFile.split('\\').pop()! : '',
    geom_type: (ingDic.meshType as string) ?? ((ingDic.meshFile ? 'file' : 'None')),
    comments: (ingDic.comments as string) ?? '',
    uniprot: (ingDic.uniprot as string) ?? '',
    pcpalAxis: normalizeVector(ingDic.principalVector, [0, 0, 1]),
    offset: normalizeVector(ingDic.offset, [0, 0, 0]),
    fiberAxis: (ingDic.fiberAxis as number[]) ?? [0, 0, 1, 50],
    fiberOffset: (ingDic.fiberOffset as number[]) ?? [0, 0, 0],
    pos,
    radii,
    ingtype: btype.type,
    buildtype: btype.build,
    color: (ingDic.color as number[]) ?? null,
    sprite: normalizeSprite(ingDic, name),
    results: ingDic.results ?? '',
  }
  applyCustomData(data as Record<string, unknown>, ingDic)
  return data as RecipeTreeNode
}

function classicPartnerLinks(ingDic: Record<string, unknown>, nextId: number): RawRecipeLink[] {
  const links: RawRecipeLink[] = []
  const partnersName = ingDic.partners_name as string[] | undefined
  if (!partnersName) return links
  const props = (ingDic.properties as Record<string, unknown>) ?? {}
  for (const target of partnersName) {
    links.push({
      id: nextId++,
      source: ingDic.name as string,
      target,
      name1: ingDic.name as string,
      name2: target,
      pdb1: (props.pdb1 as string) ?? '',
      sel1: (props.sel1 as string) ?? '',
      sel2: (props.sel2 as string) ?? '',
      coords1: [],
      coords2: [],
      beads1: (props.beads1 as unknown[]) ?? [],
      beads2: (props.beads2 as unknown[]) ?? [],
    })
  }
  return links
}

function classicPropertyLink(ingDic: Record<string, unknown>, id: number): RawRecipeLink | null {
  const props = ingDic.properties as Record<string, unknown> | undefined
  if (!props || !('st_ingr' in props)) return null
  return {
    id,
    source: ingDic.name as string,
    target: props.st_ingr as string,
    name1: ingDic.name as string,
    name2: props.st_ingr as string,
    pdb1: '',
    sel1: '',
    sel2: '',
    coords1: [],
    coords2: [],
    beads1: [],
    beads2: [],
  }
}

/** Port of js/cp_serialized.js:parseCellPackRecipe. */
export function parseClassicRecipe(jsondic: Record<string, unknown>): ParsedRecipeTree {
  const links: RawRecipeLink[] = []
  const recipe = jsondic.recipe as Record<string, unknown> | undefined
  const rootName = (recipe?.name as string) ?? 'root'
  const children: RecipeTreeNode[] = []

  const collectLinks = (ingDic: Record<string, unknown>) => {
    for (const link of classicPartnerLinks(ingDic, links.length)) links.push(link)
    const propertyLink = classicPropertyLink(ingDic, links.length)
    if (propertyLink) links.push(propertyLink)
  }

  const cytoplasme = jsondic.cytoplasme as { ingredients?: Record<string, Record<string, unknown>> } | undefined
  for (const ingDic of Object.values(cytoplasme?.ingredients ?? {})) {
    children.push(parseClassicIngredient(ingDic, false))
    collectLinks(ingDic)
  }

  const compartments = (jsondic.compartments as Record<string, Record<string, unknown>>) ?? {}
  for (const [cname, compDic] of Object.entries(compartments)) {
    const compChildren: RecipeTreeNode[] = []
    const surfaceIngredients = (compDic.surface as { ingredients?: Record<string, Record<string, unknown>> })
      ?.ingredients ?? {}
    for (const ingDic of Object.values(surfaceIngredients)) {
      compChildren.push(parseClassicIngredient(ingDic, true))
      collectLinks(ingDic)
    }
    const interiorIngredients = (compDic.interior as { ingredients?: Record<string, Record<string, unknown>> })
      ?.ingredients ?? {}
    for (const ingDic of Object.values(interiorIngredients)) {
      compChildren.push(parseClassicIngredient(ingDic, false))
      collectLinks(ingDic)
    }
    const comp: RecipeTreeCompartmentNode = {
      nodetype: 'compartment',
      name: cname,
      geom: (compDic.geom as CompartmentData['geom']) ?? '',
      geom_type: (compDic.geom_type as string) ?? 'None',
      thickness: (compDic.thickness as number) ?? 7.5,
      color: null,
      children: compChildren,
    }
    children.push(comp)
  }

  const tree: RecipeTreeCompartmentNode = {
    nodetype: 'compartment',
    name: rootName,
    geom: '',
    geom_type: 'None',
    thickness: 7.5,
    color: null,
    children,
  }
  return { tree, links }
}

/* -------------------------------------------------------------------- */
/* Serialized format (js/cp_serialized.js: OneIngredientDeserialized,    */
/* parseCellPackRecipeSerialized, parseOneCompartment)                   */
/* -------------------------------------------------------------------- */

function parseSerializedIngredient(
  ingDic: Record<string, unknown>,
  surface: boolean,
  idRef: { next: number },
): RecipeTreeNode {
  const name = ingDic.name as string
  const source = normalizeSource(ingDic)
  const { pos, radii } = normalizePositions(ingDic.positions, ingDic.radii_lod ?? ingDic.radii)
  const geomType = (ingDic.meshType as string) ?? 'None'
  const geom = geomType !== 'None' ? ((ingDic.meshFile as string | null) ?? '') : ''
  idRef.next += 1
  const data: IngredientData = {
    nodetype: 'ingredient',
    name,
    label: (ingDic.description as string) ?? '',
    size: (ingDic.encapsulatingRadius as number) ?? 40,
    molecularweight: (ingDic.molecularweight as number) || 0,
    confidence: (ingDic.confidence as number) ?? 0,
    source,
    count: (ingDic.nbMol as number) || 0,
    molarity: (ingDic.molarity as number) || 0,
    surface,
    geom,
    geom_type: geomType,
    comments: (ingDic.comments as string) ?? '',
    uniprot: (ingDic.uniprot as string) ?? '',
    pcpalAxis: (ingDic.principalVector as number[]) ?? [0, 0, 1],
    offset: (source.transform?.offset as number[]) ?? [0, 0, 0],
    fiberAxis: (ingDic.fiberAxis as number[]) ?? [0, 0, 1, 50],
    fiberOffset: (ingDic.fiberOffset as number[]) ?? [0, 0, 0],
    pos,
    radii,
    ingtype: (ingDic.ingtype as string) ?? 'protein',
    buildtype: (ingDic.buildtype as string) ?? 'random',
    color: (ingDic.color as number[]) ?? null,
    sprite: normalizeSprite(ingDic, name),
    center: source.transform?.center ?? true,
  }
  applyCustomData(data as Record<string, unknown>, ingDic)
  return data as RecipeTreeNode
}

/** Appends any new partner links for this ingredient to `links` in place. */
function addSerializedPartnerLinks(ingDic: Record<string, unknown>, links: RawRecipeLink[]): void {
  const partners = (ingDic.partners_properties as {
    partner_name: string
    binding_site_lod: { binding_site: unknown[]; coords: number[] }[]
  }[]) ?? []
  const name = ingDic.name as string
  for (const partner of partners) {
    const already = links.find(
      (l) => (l.name1 === partner.partner_name && l.name2 === name) ||
        (l.name2 === partner.partner_name && l.name1 === name),
    )
    if (already) continue
    const [lod0, lod1] = partner.binding_site_lod
    links.push({
      id: links.length,
      source: name,
      target: partner.partner_name,
      name1: name,
      name2: partner.partner_name,
      pdb1: '',
      sel1: '',
      sel2: '',
      coords1: lod0?.coords ?? [],
      coords2: lod1?.coords ?? [],
      beads1: (lod0?.binding_site as unknown[]) ?? [],
      beads2: (lod1?.binding_site as unknown[]) ?? [],
    })
  }
}

interface SCompartmentDic {
  name: string
  geom_type?: string
  mesh?: unknown
  filename?: string
  radius?: number
  mb?: { positions: number[]; radii: number[]; types: string[] }
  thickness?: number
  color?: number[] | null
  IngredientGroups: { Ingredients: Record<string, unknown>[] }[]
  Compartments: SCompartmentDic[]
}

function setupCompartmentData(compDic: SCompartmentDic): CompartmentData {
  const geomType = compDic.geom_type ?? 'None'
  let geom: CompartmentData['geom'] = 'None'
  let pos: PositionLodList | undefined
  let radii: RadiiLodList | undefined
  let types: { types: string[] }[] | undefined
  if (geomType === 'raw') geom = compDic.mesh as string
  else if (geomType === 'file') geom = compDic.filename ?? ''
  else if (geomType === 'sphere') geom = { name: compDic.name, radius: compDic.radius ?? 500 }
  else if (geomType === 'mb' && compDic.mb) {
    geom = compDic.mb as Record<string, unknown>
    pos = [{ coords: compDic.mb.positions }]
    radii = [{ radii: compDic.mb.radii }]
    types = [{ types: compDic.mb.types }]
  }
  return {
    nodetype: 'compartment',
    name: compDic.name,
    geom,
    geom_type: geomType,
    thickness: compDic.thickness ?? 7.5,
    color: compDic.color ?? null,
    pos,
    radii,
    types,
  }
}
type PositionLodList = { coords: number[] }[]
type RadiiLodList = { radii: number[] }[]

/**
 * Port of parseOneCompartment/parseIngredientsGroups. `surface`/`interior`/
 * `cytoplasme` pseudo-compartments don't create a tree node of their own —
 * their ingredients attach directly to the real parent compartment, exactly
 * like the legacy implementation.
 */
function parseSerializedCompartment(
  compDic: SCompartmentDic,
  links: RawRecipeLink[],
  idRef: { next: number },
): RecipeTreeCompartmentNode {
  const isPseudo = compDic.name === 'surface' || compDic.name === 'interior' || compDic.name === 'cytoplasme'
  const node: RecipeTreeCompartmentNode = isPseudo
    ? ({ nodetype: 'compartment', name: '', geom: '', geom_type: 'None', thickness: 7.5, color: null, children: [] } as RecipeTreeCompartmentNode)
    : { ...setupCompartmentData(compDic), children: [] }

  for (const group of compDic.IngredientGroups) {
    for (const ingDic of group.Ingredients) {
      const surface = compDic.name === 'surface'
      const elem = parseSerializedIngredient(ingDic, surface, idRef)
      node.children.push(elem)
      addSerializedPartnerLinks(ingDic, links)
    }
  }
  return node
}

function mergeCompartmentTree(
  compDic: SCompartmentDic,
  links: RawRecipeLink[],
  idRef: { next: number },
): RecipeTreeCompartmentNode {
  const self = parseSerializedCompartment(compDic, links, idRef)
  for (const childDic of compDic.Compartments) {
    const childIsPseudo = childDic.name === 'surface' || childDic.name === 'interior' || childDic.name === 'cytoplasme'
    const childNode = mergeCompartmentTree(childDic, links, idRef)
    if (childIsPseudo) {
      // pseudo compartments contribute their ingredients to *this* node, not a nested one
      self.children.push(...childNode.children)
    } else {
      self.children.push(childNode)
    }
  }
  return self
}

/** Port of js/cp_serialized.js:parseCellPackRecipeSerialized. */
export function parseSerializedRecipe(jsondic: SCompartmentDic): ParsedRecipeTree {
  const links: RawRecipeLink[] = []
  const idRef = { next: 0 }
  const tree = mergeCompartmentTree(jsondic, links, idRef)
  return { tree, links }
}

/* -------------------------------------------------------------------- */
/* Entry point                                                           */
/* -------------------------------------------------------------------- */

export function parseLegacyRecipe(
  json: unknown,
  format: RecipeFormat | 'auto' = 'auto',
): RecipeGraph {
  const resolvedFormat = format === 'auto' ? detectRecipeFormat(json) : format
  const parsed =
    resolvedFormat === 'serialized'
      ? parseSerializedRecipe(json as SCompartmentDic)
      : parseClassicRecipe(json as Record<string, unknown>)
  return buildRecipeGraph(parsed)
}
