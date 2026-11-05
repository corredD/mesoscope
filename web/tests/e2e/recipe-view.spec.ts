import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

// The Recipe View canvas: gestures, Edit Mode reparenting and a drag-frame budget (web/_spec/recipe-view.md §4, §10).
// The panel is one <canvas>; the tests read the stage's read-only probe (`stage.__recipeView`) for node geometry.
test.use({ viewport: { width: 1200, height: 800 } })

const dataFile = (name: string) => readFileSync(resolve(process.cwd(), '../data', name), 'utf-8')

type ProbeNode = {
  name: string
  depth: number
  r: number
  x: number
  y: number
  leaf: boolean
  surface: boolean
  parent: string | null
}
type Snap = {
  nodes: ProbeNode[]
  t: { x: number; y: number; k: number }
  box: { left: number; top: number; width: number; height: number }
  hot: boolean
}

/** The menu's examples are fetched from GitHub: serve the repo's own copies, so the tests run offline. `as` swaps in another file. */
async function serveExamples(page: Page, as?: { example: string; file: string }) {
  await page.route('**/data/*.json', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!
    const file = as && name === as.example ? as.file : name
    return route.fulfill({
      contentType: 'application/json',
      body: dataFile(file),
    })
  })
}

async function snap(page: Page): Promise<Snap> {
  return page.locator('.recipe-canvas-stage').evaluate((el) => {
    const p = (
      el as unknown as {
        __recipeView: {
          nodes: () => ProbeNode[]
          transform: () => Snap['t']
          hot: () => boolean
        }
      }
    ).__recipeView
    const c = el.querySelector('canvas.recipe-canvas')!.getBoundingClientRect()
    return {
      nodes: p.nodes(),
      t: p.transform(),
      box: { left: c.left, top: c.top, width: c.width, height: c.height },
      hot: p.hot(),
    }
  })
}

async function loadExample(page: Page, label: string, base = '/') {
  await page.goto(base)
  await page.getByRole('button', { name: 'Load', exact: true }).click()
  await page.getByText('New Recipe', { exact: true }).click()
  await page.getByText('From Examples', { exact: true }).click()
  await page.getByText(label, { exact: true }).click()
  await expect.poll(async () => (await snap(page)).nodes.length, { timeout: 30_000 }).toBeGreaterThan(1)
}

/** Wait until the force simulation has cooled (the `hot()` probe is false). */
async function rest(page: Page, timeout = 60_000) {
  await expect.poll(async () => (await snap(page)).hot, { timeout, intervals: [200] }).toBe(false)
}

const toScreen = (s: Snap, n: { x: number; y: number }) => ({
  x: s.box.left + n.x * s.t.k + s.t.x,
  y: s.box.top + n.y * s.t.k + s.t.y,
})
const toWorld = (s: Snap, p: { x: number; y: number }) => ({
  x: (p.x - s.box.left - s.t.x) / s.t.k,
  y: (p.y - s.box.top - s.t.y) / s.t.k,
})

const nodeNamed = (s: Snap, name: string) => {
  const n = s.nodes.find((x) => x.name === name)
  if (!n) throw new Error(`no node ${name}`)
  return n
}

/** Legacy picking: the deepest disk containing the world point (the root when none). */
const deepestAt = (s: Snap, x: number, y: number) => {
  let best = s.nodes[0]
  for (const n of s.nodes) if (n.depth > best.depth && (x - n.x) ** 2 + (y - n.y) ** 2 < n.r * n.r) best = n
  return best
}

const onScreen = (s: Snap, p: { x: number; y: number }, margin = 30) =>
  p.x > s.box.left + margin &&
  p.x < s.box.left + s.box.width - margin &&
  p.y > s.box.top + margin &&
  p.y < s.box.top + s.box.height - margin

/** A press point (screen) that picks exactly `n`: its centre if it is the deepest disk there, else a point inside its disk that is. */
function pressPoint(s: Snap, n: ProbeNode): { x: number; y: number } | null {
  const tries: [number, number][] = [[0, 0]]
  for (let ring = 1; ring <= 8; ring++)
    for (let a = 0; a < 16; a++) tries.push([Math.cos((a * Math.PI) / 8) * ring * 0.1, Math.sin((a * Math.PI) / 8) * ring * 0.1])
  for (const [dx, dy] of tries) {
    const wx = n.x + dx * n.r
    const wy = n.y + dy * n.r
    if (deepestAt(s, wx, wy) !== n) continue
    const p = toScreen(s, { x: wx, y: wy })
    if (onScreen(s, p)) return p
  }
  return null
}

/** Reachable nodes by kind, biggest first. */
function reachable(s: Snap, filter: (n: ProbeNode) => boolean) {
  return s.nodes
    .filter(filter)
    .sort((a, b) => b.r - a.r)
    .map((n) => ({ n, at: pressPoint(s, n) }))
    .filter((c): c is { n: ProbeNode; at: { x: number; y: number } } => c.at !== null && c.n.r * s.t.k >= 3)
}

async function drag(
  page: Page,
  from: { x: number; y: number },
  by: { x: number; y: number },
  steps = 8,
  button: 'left' | 'middle' | 'right' = 'left',
) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down({ button })
  await page.mouse.move(from.x + by.x, from.y + by.y, { steps })
  await page.mouse.up({ button })
}

const stageOf = (page: Page) => page.locator('.recipe-canvas-stage')

test('modern renders of HIV and Influenza for the side-by-side with the legacy oracle', async ({ page }) => {
  await serveExamples(page)
  await loadExample(page, 'HIV mature')
  await rest(page)
  await stageOf(page).screenshot({
    path: 'test-results/recipe-view/modern-hiv.png',
  })

  await loadExample(page, 'Influenza envelope')
  await rest(page)
  await stageOf(page).screenshot({
    path: 'test-results/recipe-view/modern-influenza.png',
  })
})

test.describe('Influenza gestures with real mouse events', () => {
  test.beforeEach(async ({ page }) => {
    await serveExamples(page)
    await loadExample(page, 'Influenza envelope')
    await rest(page)
  })

  const envelopeOf = (s: Snap) => {
    const e = s.nodes.find((n) => !n.leaf && n.depth >= 1)
    if (!e) throw new Error('no compartment')
    return e
  }
  const proteinsOf = (s: Snap) => s.nodes.filter((n) => n.leaf && n.surface)

  test('dragging a surface protein 60 px keeps it on the membrane (§4.3, §10.4)', async ({ page }) => {
    const s = await snap(page)
    const candidates = reachable(s, (n) => n.leaf && n.surface)
    expect(candidates.length).toBeGreaterThan(0)
    const { n, at } = candidates[0]
    await drag(page, at, { x: 60, y: 0 }, 10)
    await rest(page)
    const after = await snap(page)
    const e = envelopeOf(after)
    const p = nodeNamed(after, n.name)
    expect(Math.hypot(p.x - n.x, p.y - n.y) * after.t.k).toBeGreaterThan(5)
    expect(Math.abs(Math.hypot(p.x - e.x, p.y - e.y) - e.r)).toBeLessThan(0.5)
  })

  test('dragging the envelope moves its proteins by the same delta (§4.3, §10.5)', async ({ page }) => {
    const s = await snap(page)
    const env = envelopeOf(s)
    const at = pressPoint(s, env)
    if (!at) throw new Error('envelope not pressable')
    await drag(page, at, { x: 40, y: 30 }, 8)
    await rest(page)
    const after = await snap(page)
    const envAfter = nodeNamed(after, env.name)
    const dx = (envAfter.x - env.x) * after.t.k
    const dy = (envAfter.y - env.y) * after.t.k
    expect(Math.hypot(dx, dy)).toBeGreaterThan(30)
    for (const p of proteinsOf(s)) {
      const q = nodeNamed(after, p.name)
      expect(Math.abs((q.x - p.x) * after.t.k - dx)).toBeLessThan(2)
      expect(Math.abs((q.y - p.y) * after.t.k - dy)).toBeLessThan(2)
    }
  })

  test('the wheel over a node zooms the view (§4.1, rows 51-52)', async ({ page }) => {
    const s = await snap(page)
    const { at } = reachable(s, (n) => n.leaf)[0]
    await page.mouse.move(at.x, at.y)
    await page.mouse.wheel(0, -300)
    await expect.poll(async () => (await snap(page)).t.k).toBeGreaterThan(s.t.k)
  })

  test('a middle-button drag pans and moves no node (§4.1, row 53)', async ({ page }) => {
    const before = await snap(page)
    const e = toScreen(before, envelopeOf(before))
    await drag(page, e, { x: 50, y: 40 }, 6, 'middle')
    await expect.poll(async () => (await snap(page)).t.x).toBeGreaterThan(before.t.x + 20)
    await rest(page)
    const after = await snap(page)
    for (const n of before.nodes) {
      const m = nodeNamed(after, n.name)
      expect(Math.hypot(m.x - n.x, m.y - n.y)).toBeLessThan(1)
    }
  })

  test('a click selects an ingredient: its Recipe table row is selected (§2.5, §4.5)', async ({ page }) => {
    const { n, at } = reachable(await snap(page), (x) => x.leaf)[0]
    await page.mouse.click(at.x, at.y)
    const row = page.locator('[data-panel-content="recipe-table"] tr.selected')
    await expect(row).toHaveCount(1)
    await expect(row.locator('input').first()).toHaveValue(n.name)
  })

  test('Ctrl-click adds a second selection: Add interaction becomes enabled (§4.5, §7.3)', async ({ page }) => {
    const [a, b] = reachable(await snap(page), (x) => x.leaf)
    const add = page.getByRole('button', { name: 'Add interaction' })
    await page.mouse.click(a.at.x, a.at.y)
    await expect(add).toBeDisabled()
    await page.keyboard.down('Control')
    await page.mouse.click(b.at.x, b.at.y)
    await page.keyboard.up('Control')
    await expect(add).toBeEnabled()
  })

  test('a right click opens the context menu (§10.6)', async ({ page }) => {
    const { at } = reachable(await snap(page), (n) => n.leaf)[0]
    await page.mouse.click(at.x, at.y, { button: 'right' })
    await expect(page.locator('.recipe-canvas-context-menu')).toBeVisible()
  })

  test('a right press and move on a node does not drag it (§4.2)', async ({ page }) => {
    const before = await snap(page)
    const { n, at } = reachable(before, (x) => x.leaf)[0]
    await drag(page, at, { x: 50, y: 10 }, 6, 'right')
    await page.waitForTimeout(300)
    const m = nodeNamed(await snap(page), n.name)
    expect(Math.hypot(m.x - n.x, m.y - n.y)).toBeLessThan(0.5)
  })
})

test('Edit Mode: dropping a nested ingredient on empty space moves it to the root (§4.7, rows 66-68)', async ({ page }) => {
  await serveExamples(page)
  await loadExample(page, 'HIV mature')
  await rest(page)
  await page.getByRole('switch', { name: 'Edit Mode' }).click()

  let s = await snap(page)
  const unique = (n: ProbeNode) => s.nodes.filter((x) => x.name === n.name).length === 1
  let picks = reachable(s, (n) => n.leaf && n.depth >= 2 && unique(n))
  expect(picks.length).toBeGreaterThan(0)
  const { n: subject, at: from } = picks[0]
  const root = s.nodes.find((n) => n.depth === 0)!

  // An empty point: clear of every non-root node by the subject's radius. Zoom out (wheel on the pick) when the recipe fills the stage.
  const findEmpty = (sn: Snap) => {
    const inset = 25
    for (let step = 0; step < 60; step++) {
      for (const [cx, cy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]) {
        const p = {
          x: sn.box.left + inset + (cx ? sn.box.width - 2 * inset - step * 8 : step * 8),
          y: sn.box.top + inset + (cy ? sn.box.height - 2 * inset - step * 8 : step * 8),
        }
        const w = toWorld(sn, p)
        const clear = sn.nodes.every(
          (m) => m.depth === 0 || m.name === subject.name || Math.hypot(m.x - w.x, m.y - w.y) > m.r + subject.r + 2,
        )
        if (clear) return p
      }
    }
    return null
  }
  let target = findEmpty(s)
  for (let i = 0; i < 6 && !target; i++) {
    await page.mouse.move(from.x, from.y)
    await page.mouse.wheel(0, 300)
    await expect.poll(async () => (await snap(page)).t.k).toBeLessThan(s.t.k)
    await rest(page)
    s = await snap(page)
    target = findEmpty(s)
  }
  if (!target) throw new Error('no empty point on the stage')
  const start = toScreen(s, nodeNamed(s, subject.name))
  picks = reachable(s, (n) => n.name === subject.name)
  const press = picks[0]?.at ?? start
  await drag(page, press, { x: target.x - press.x, y: target.y - press.y }, 15)
  await expect.poll(async () => nodeNamed(await snap(page), subject.name).depth).toBe(1)
  expect(nodeNamed(await snap(page), subject.name).parent).toBe(root.name)
})

// Mpn (Mycoplasma pneumoniae, 181 nodes) is served through the HIV menu entry: the menu offers it only under Append.
const perfCases = [
  { name: 'HIV', serve: undefined },
  {
    name: 'Mpn',
    serve: { example: 'HIV_serialized.json', file: 'Mpn_1.0_2.json' },
  },
]
// Frame timing relies on the config's --disable-accelerated-2d-canvas (see playwright.config.ts).
for (const recipe of perfCases) {
  test(`${recipe.name}: 95% of rAF intervals during a 40-step drag stay within a frame of the idle page (How we work, step 0)`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000)
    // Against the production build: the development build's per-frame React cost is not the user's.
    await serveExamples(page, recipe.serve)
    await loadExample(page, 'HIV mature', `http://localhost:${Number(process.env.E2E_PORT ?? 5173) + 10}/`)
    await rest(page, 120_000)

    const record = (ms: number) =>
      page.evaluate(
        (duration) =>
          new Promise<number[]>((done) => {
            const frames: number[] = []
            const tick = (t: number) => {
              frames.push(t)
              if (t - frames[0] < duration) requestAnimationFrame(tick)
              else done(frames)
            }
            requestAnimationFrame(tick)
          }),
        ms,
      )
    const sorted = (frames: number[]) =>
      frames
        .slice(1)
        .map((t, i) => t - frames[i])
        .sort((a, b) => a - b)
    const at = (list: number[], q: number) => list[Math.min(list.length - 1, Math.floor(q * list.length))]
    // Idle baseline on the same page: the environment's own frame noise (software GL, the Mol* viewers).
    const idle = sorted(await record(1000))
    const idleP95 = at(idle, 0.95)

    const kinds: {
      label: string
      filter: (n: ProbeNode, s: Snap) => boolean
    }[] = [
      {
        label: 'interior ingredient',
        filter: (n) => n.leaf && !n.surface && n.depth >= 2,
      },
      { label: 'surface protein', filter: (n) => n.leaf && n.surface },
      { label: 'compartment', filter: (n) => !n.leaf && n.depth >= 1 },
    ]
    for (const kind of kinds) {
      await rest(page, 120_000)
      const s = await snap(page)
      const pick = reachable(s, (n) => kind.filter(n, s))[0]
      if (!pick) {
        // Mpn has no surface protein big enough to press on screen at the initial zoom: say so, and move on.
        testInfo.annotations.push({
          type: `${recipe.name} ${kind.label}`,
          description: 'none reachable on screen',
        })
        expect(kind.label, 'only the surface protein may be missing').toBe('surface protein')
        continue
      }
      const from = pick.at
      await page.evaluate(() => {
        const w = window as unknown as { __frames: number[]; __run: boolean }
        w.__frames = []
        w.__run = true
        const tick = (t: number) => {
          if (!w.__run) return
          w.__frames.push(t)
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      for (let i = 1; i <= 40; i++) {
        await page.mouse.move(from.x + i * 1.5, from.y + i, { steps: 1 })
        await page.waitForTimeout(16)
      }
      await page.mouse.up()
      const frames = await page.evaluate(() => {
        const w = window as unknown as { __frames: number[]; __run: boolean }
        w.__run = false
        return w.__frames
      })
      const raw = frames.slice(1).map((t, i) => t - frames[i])
      const intervals = [...raw].sort((a, b) => a - b)
      expect(intervals.length).toBeGreaterThan(20)
      const p50 = at(intervals, 0.5)
      const p95 = at(intervals, 0.95)
      const max = intervals[intervals.length - 1]
      testInfo.annotations.push({
        type: `${recipe.name} ${kind.label}`,
        description: `rAF p50 ${p50.toFixed(2)} / p95 ${p95.toFixed(2)} / max ${max.toFixed(2)} ms; frames ${intervals.length}; max at ${raw.indexOf(max)}; idle p50 ${at(idle, 0.5).toFixed(2)} / p95 ${idleP95.toFixed(2)}`,
      })
      // Step-0 bound: 95% of frames within one frame of the idle page, and the drag did move the node.
      expect.soft(p95, `${kind.label} p95`).toBeLessThanOrEqual(Math.max(idleP95, 16.7) + 1)
      const after = nodeNamed(await snap(page), pick.n.name)
      expect.soft(Math.hypot(after.x - pick.n.x, after.y - pick.n.y), `${kind.label} moved`).toBeGreaterThan(1)
    }
  })
}
