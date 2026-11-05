// Step-0 spike measurement (recipe-view-port). Run with the Vite dev server on 5181:
//   node tests/spike/measure.mjs
// Per-frame cost during a drag = Dragology's behaviour (pointer -> state, timed inside the spec)
// + the React commit of the DraggableRenderer subtree (React Profiler actualDuration). Each
// rAF during a drag runs the behaviour once and commits once, so the sum is the main-thread
// cost of one pointer move (browser style/layout/paint excluded; frameMs below includes it).
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const BASE = process.env.BASE ?? 'http://localhost:5181'
const pct = (a, p) => {
  if (!a.length) return NaN
  const s = [...a].sort((x, y) => x - y)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}
const fmt = (a) => `p50 ${pct(a, 50).toFixed(2)} p95 ${pct(a, 95).toFixed(2)} max ${Math.max(...a).toFixed(2)} (n=${a.length})`

const browser = await chromium.launch()
console.log('chromium', browser.version())
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
await page.addInitScript(() => {
  window.__frames = []
  let last = 0
  const loop = (t) => {
    if (last) window.__frames.push(t - last)
    last = t
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
})
await page.goto(`${BASE}/spike.html`)
await page.waitForFunction(() => !!window.__spike)

const results = []
const center = async (name) =>
  page.evaluate((name) => {
    const el = document.querySelector(`[data-node="${name}"]`)
    const r = el.querySelector('circle').getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, name)

async function load(file) {
  const json = JSON.parse(readFileSync(new URL(`../../../data/${file}`, import.meta.url), 'utf-8'))
  await page.evaluate((json) => window.__spike.load(json), json)
  await page.waitForTimeout(400)
}

async function drag(label, name, path, { checkGrab = false } = {}) {
  const c = await center(name)
  await page.mouse.move(c.x, c.y)
  await page.mouse.down()
  await page.evaluate(() => {
    window.__evals = 0
    window.__beh.length = 0
    window.__prof.length = 0
    window.__frames.length = 0
  })
  const grabErr = []
  for (const [dx, dy] of path) {
    await page.mouse.move(c.x + dx, c.y + dy)
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    if (checkGrab) {
      const now = await center(name)
      grabErr.push(Math.hypot(now.x - (c.x + dx), now.y - (c.y + dy)))
    }
  }
  const t = await page.evaluate(() => ({ evals: window.__evals, beh: [...window.__beh], prof: [...window.__prof], frames: [...window.__frames] }))
  await page.mouse.up()
  await page.waitForTimeout(300)
  const n = Math.min(t.beh.length, t.prof.length)
  const sum = []
  for (let i = 0; i < n; i++) sum.push(t.beh[i] + t.prof[i])
  const row = { label, beh: fmt(t.beh), commit: fmt(t.prof), sum: fmt(sum), frameMs: fmt(t.frames), evalsPerFrame: (t.evals / Math.max(t.beh.length, 1)).toFixed(1), sumMax: Math.max(...sum) }
  if (checkGrab) row.grabErrPx = `max ${Math.max(...grabErr).toFixed(2)}`
  results.push(row)
  console.log(JSON.stringify(row))
}

const circlePath = (r, steps = 40) => Array.from({ length: steps }, (_, i) => [r * Math.sin((i / steps) * 2 * Math.PI), r * (1 - Math.cos((i / steps) * 2 * Math.PI))])
const line = (dx, dy, steps = 40) => Array.from({ length: steps }, (_, i) => [(dx * (i + 1)) / steps, (dy * (i + 1)) / steps])

async function nodeNames() {
  return page.evaluate(() => {
    const s = window.__spike.get().state
    const pick = (f) => s.order.map((id) => s.nodes[id]).filter(f)
    const interior = pick((n) => n.leaf && !n.surface && n.parent && s.nodes[n.parent].parent)
    const surface = pick((n) => n.leaf && n.surface && s.nodes[n.parent].parent)
    const comps = pick((n) => !n.leaf && n.parent)
    return {
      interior: interior[Math.floor(interior.length / 2)]?.name,
      surface: surface[0]?.name,
      comp: comps.sort((a, b) => b.children.length - a.children.length)[0]?.name,
      count: s.order.length,
    }
  })
}

for (const file of ['HIV_serialized.json', 'Mpn_1.0_2.json']) {
  for (const constraintMode of [false, true]) {
    await load(file)
    await page.evaluate((f) => window.__spike.setConstraintMode(f), constraintMode)
    await page.evaluate(() => window.__spike.fit())
    await page.waitForTimeout(300)
    const names = await nodeNames()
    const tag = `${file.split('_')[0]} n=${names.count} containment=${constraintMode ? 'COBYLA constraint' : 'clamp parametrization'}`
    await drag(`${tag} interior ingredient`, names.interior, circlePath(25))
    await drag(`${tag} surface ingredient`, names.surface, line(80, 40))
    await drag(`${tag} compartment`, names.comp, line(60, 30))
    await page.evaluate(() => window.__spike.setEditMode(true))
    await page.waitForTimeout(100)
    await drag(`${tag} edit-mode reparent`, names.interior, line(-500, 0, 40))
    await page.evaluate(() => window.__spike.setEditMode(false))
    await page.waitForTimeout(100)
  }
}

// Zoomed and panned: the grab point must stay under the pointer (free move, root-level parent not needed:
// small moves inside the compartment keep the containment inactive).
await load('Mpn_1.0_2.json')
for (const k of [0.5, 3]) {
  await page.evaluate(() => window.__spike.fit())
  await page.evaluate(() => window.__spike.setPush(false))
  await page.waitForTimeout(200)
  const names = await nodeNames()
  const c0 = await center(names.interior)
  // put that node at (700, 300) on screen at zoom k (a pan and a zoom)
  await page.evaluate(([cx, cy, k]) => {
    const v = window.__spike.get().view
    const wx = (cx - v.x) / v.k
    const wy = (cy - v.y) / v.k
    window.__spike.setView(700 - k * wx, 300 - k * wy, k)
  }, [c0.x, c0.y, k])
  await page.waitForTimeout(200)
  await drag(`Mpn k=${k} panned, interior ingredient, no push`, names.interior, line(6, 4, 10), { checkGrab: true })
  await page.evaluate(() => window.__spike.setPush(true))
}

// Events beside dragologyOnDrag
await load('Mpn_1.0_2.json')
await page.evaluate(() => window.__spike.fit())
await page.waitForTimeout(200)
const names = await nodeNames()
const ev = {}
const a = await center(names.interior)
await page.mouse.click(a.x, a.y)
await page.waitForTimeout(100)
ev.click = await page.evaluate(() => window.__spike.get().selected.map((id) => window.__spike.get().state.nodes[id].name))
const others = await page.evaluate((exclude) => {
  const s = window.__spike.get().state
  return s.order.map((id) => s.nodes[id]).filter((n) => n.leaf && n.name !== exclude && !n.surface).slice(0, 1).map((n) => n.name)
}, names.interior)
const b = await center(others[0])
await page.keyboard.down('Control')
await page.mouse.click(b.x, b.y)
await page.keyboard.up('Control')
await page.waitForTimeout(100)
ev.ctrlClick = await page.evaluate(() => window.__spike.get().selected.length)
const comp = await center(names.comp)
// a point inside the compartment, away from ingredients is hard to find; click its centre and report what the hit-test chose
await page.mouse.move(b.x + 1, b.y + 1)
await page.waitForTimeout(100)
ev.hover = await page.evaluate(() => {
  const g = window.__spike.get()
  return g.hover && g.state.nodes[g.hover].name
})
const before = await page.evaluate(() => window.__spike.get().view.k)
await page.mouse.move(comp.x, comp.y)
await page.mouse.wheel(0, -200)
await page.waitForTimeout(200)
ev.wheel = { before, after: await page.evaluate(() => window.__spike.get().view.k) }
await page.mouse.click(b.x, b.y, { button: 'right' })
await page.waitForTimeout(100)
ev.contextMenu = await page.evaluate(() => !!document.getElementById('spike-menu'))
const vx = await page.evaluate(() => window.__spike.get().view.x)
const posBefore = await page.evaluate((n) => {
  const s = window.__spike.get().state
  const id = s.order.find((id) => s.nodes[id].name === n)
  return [s.nodes[id].x, s.nodes[id].y]
}, others[0])
const b2 = await center(others[0])
await page.mouse.move(b2.x, b2.y)
await page.mouse.down({ button: 'middle' })
await page.mouse.move(b2.x + 60, b2.y + 20, { steps: 8 })
await page.mouse.up({ button: 'middle' })
await page.waitForTimeout(200)
const posAfter = await page.evaluate((n) => {
  const s = window.__spike.get().state
  const id = s.order.find((id) => s.nodes[id].name === n)
  return [s.nodes[id].x, s.nodes[id].y]
}, others[0])
ev.middleDragPan = { viewDx: (await page.evaluate(() => window.__spike.get().view.x)) - vx, nodeMoved: posAfter[0] !== posBefore[0] || posAfter[1] !== posBefore[1] }
// group-by switch animates (controlled state change -> DraggableRenderer spring)
await page.evaluate(() => {
  window.__frames.length = 0
  window.__prof.length = 0
  window.__spike.groupBy('surface')
})
await page.waitForTimeout(600)
ev.groupBy = await page.evaluate(() => ({ commits: window.__prof.length, commitMs: Math.max(...window.__prof).toFixed(2), frames: window.__frames.length }))
console.log('events', JSON.stringify(ev, null, 1))
await browser.close()
