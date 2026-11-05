// Builds ../sample-data.js from the real recipes in the repo's data/ (HIV_serialized.json, Mpn_1.0_2.json).
// The mockups open from file://, where fetch() of local JSON is blocked, so the data ships as a script.
// Run from web/: node design/mockups/tools/make-sample-data.mjs
// The layout is a d3 circle pack (interior ingredients and child compartments packed inside a compartment;
// surface ingredients spread on its membrane, as recipe-view.md §10.5 pins them). It approximates the legacy
// Recipe view (recipe-view.md §1-2) for a static picture; it is not the legacy algorithm.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { hierarchy, pack } from 'd3-hierarchy'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '../../../../data')
let nextId = 0

function ing(raw, side, compPath) {
  const src = raw.source ?? {}
  const beads = raw.positions?.[0]?.coords ? raw.positions[0].coords.length / 3 : 0
  return {
    id: `i${nextId++}`, kind: 'ingredient', name: raw.name, side, path: compPath,
    label: raw.description && raw.description !== raw.name ? raw.description : raw.label ?? '',
    pdb: src.pdb ?? raw.pdb ?? '', bu: src.bu ?? '', selection: src.selection ?? '',
    uniprot: raw.uniprot ?? '', count: raw.nbMol ?? 0, molarity: raw.molarity ?? 0,
    mw: raw.molecularweight ?? 0, size: raw.encapsulatingRadius ?? 40,
    ingtype: raw.ingtype ?? (raw.Type === 'Grow' ? 'fiber' : 'protein'),
    color: raw.color ?? null, beads, lods: (raw.radii_lod ?? raw.radii ?? []).length,
    pcpalAxis: raw.principalVector ?? [0, 0, 1], offset: src.transform?.offset ?? raw.offset ?? [0, 0, 0],
    partners: (raw.partners_properties ?? []).length + (raw.partners_name ?? []).length,
    // Level-0 beads (xyz and radius), for the Ingredient view's bead drawing; serialized recipes only (Mpn's are
    // large and not drawn).
    beadsXYZ: raw.radii_lod && raw.positions?.[0]?.coords
      ? raw.positions[0].coords.map((v) => +v.toFixed(1)) : undefined,
    beadsR: raw.radii_lod?.[0]?.radii?.map((v) => +v.toFixed(1)),
  }
}

function fromSerialized(c, path) {
  const node = { id: `c${nextId++}`, kind: 'compartment', name: c.name, geom_type: c.geom_type ?? 'None', children: [] }
  const here = path ? `${path}.${c.name}` : c.name
  for (const g of c.IngredientGroups ?? []) for (const i of g.Ingredients ?? []) node.children.push(ing(i, 'interior', here))
  for (const sub of c.Compartments ?? []) {
    if (sub.name === 'surface' || sub.name === 'interior') {
      for (const g of sub.IngredientGroups ?? []) for (const i of g.Ingredients ?? []) node.children.push(ing(i, sub.name, here))
    } else node.children.push(fromSerialized(sub, here))
  }
  return node
}

function fromClassic(d) {
  const root = { id: `c${nextId++}`, kind: 'compartment', name: d.recipe?.name ?? 'root', geom_type: 'None', children: [] }
  for (const i of Object.values(d.cytoplasme?.ingredients ?? {})) root.children.push(ing(i, 'interior', root.name))
  for (const [name, c] of Object.entries(d.compartments ?? {})) {
    const comp = { id: `c${nextId++}`, kind: 'compartment', name, geom_type: c.geom_type ?? 'file', children: [] }
    for (const side of ['surface', 'interior'])
      for (const i of Object.values(c[side]?.ingredients ?? {})) comp.children.push(ing(i, side, `${root.name}.${name}`))
    root.children.push(comp)
  }
  return root
}

function layout(tree, w, h) {
  // Pack interior ingredients and compartments; surface ingredients are placed on the membrane afterwards.
  const h0 = hierarchy(tree, (n) => n.children?.filter((c) => c.kind === 'compartment' || c.side === 'interior'))
    .sum((n) => (n.kind === 'ingredient' ? n.size * n.size : 0))
    .sort((a, b) => b.value - a.value)
  pack().size([w, h]).padding((n) => (n.depth === 0 ? 30 : 22))(h0)
  const out = []
  h0.each((n) => out.push({ id: n.data.id, x: +n.x.toFixed(1), y: +n.y.toFixed(1), r: +n.r.toFixed(1), depth: n.depth }))
  const byId = Object.fromEntries(out.map((o) => [o.id, o]))
  const scale = h0.leaves()[0] ? h0.leaves()[0].r / h0.leaves()[0].data.size : 1
  h0.each((n) => {
    const surf = (n.data.children ?? []).filter((c) => c.side === 'surface')
    surf.forEach((s, k) => {
      const a = -Math.PI / 2 + ((k + 0.5) / surf.length) * 2 * Math.PI
      const r = Math.max(6, Math.min(s.size * scale, n.r * 0.18))
      out.push({ id: s.id, x: +(n.x + n.r * Math.cos(a)).toFixed(1), y: +(n.y + n.r * Math.sin(a)).toFixed(1), r: +r.toFixed(1), depth: n.depth + 1, angle: +a.toFixed(3) })
    })
  })
  return out
}

function flat(tree) {
  const rows = []
  const walk = (n, parent, depth) => {
    const { children, ...rest } = n
    rows.push({ ...rest, parent, depth, nChildren: children?.length ?? 0 })
    for (const c of children ?? []) walk(c, n.id, depth + 1)
  }
  walk(tree, null, 0)
  return rows
}

function build(file, parse, w, h) {
  const raw = JSON.parse(readFileSync(join(dataDir, file), 'utf8'))
  const tree = parse(raw)
  return { file, name: tree.name, nodes: flat(tree), layout: layout(tree, w, h), size: [w, h] }
}

const hiv = build('HIV_serialized.json', (d) => fromSerialized(d, ''), 760, 620)
const mpn = build('Mpn_1.0_2.json', fromClassic, 760, 620)
const js = `// Generated by tools/make-sample-data.mjs from data/${hiv.file} and data/${mpn.file}. Do not edit.\n` +
  `window.MESO_SAMPLE = ${JSON.stringify({ hiv, mpn })};\n`
writeFileSync(join(here, '../sample-data.js'), js)
const count = (s) => s.nodes.filter((n) => n.kind === 'ingredient').length
console.log(`sample-data.js: HIV ${count(hiv)} ingredients, Mpn ${count(mpn)} ingredients, ${(js.length / 1024).toFixed(0)} kB`)
