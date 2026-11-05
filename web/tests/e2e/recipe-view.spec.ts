import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'

// The Recipe View's gestures, Edit Mode reparenting and a drag-frame budget (web/_spec/recipe-view.md §4, §10; How we work, step 0).
test.use({ viewport: { width: 1200, height: 800 } })

const dataFile = (name: string) => readFileSync(resolve(process.cwd(), '../data', name), 'utf-8')

/** The menu's examples are fetched from GitHub: serve the repo's own copies, so the tests run offline. `as` swaps in another file. */
async function serveExamples(page: Page, as?: { example: string; file: string }) {
  await page.route('**/data/*.json', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!
    const file = as && name === as.example ? as.file : name
    return route.fulfill({ contentType: 'application/json', body: dataFile(file) })
  })
}

async function loadExample(page: Page, label: string, base = '/') {
  await page.goto(base)
  await page.getByRole('button', { name: 'Load', exact: true }).click()
  await page.getByText('New Recipe', { exact: true }).click()
  await page.getByText('From Examples', { exact: true }).click()
  await page.getByText(label, { exact: true }).click()
  await expect(page.locator('.recipe-canvas-stage [data-node-id]').first()).toBeVisible()
}

const stageOf = (page: Page) => page.locator('.recipe-canvas-stage')

/** A layer's screen centre (its first circle's box) and its world centre (the node's own translate). */
async function screenCentre(layer: Locator) {
  const box = await layer.locator('circle').first().boundingBox()
  if (!box) throw new Error('layer has no box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function worldCentre(layer: Locator) {
  return layer.evaluate((el) => {
    const all = [...(el.getAttribute('transform') ?? '').matchAll(/translate\(\s*([-\d.e+]+)[ ,]+([-\d.e+]+)\s*\)/gi)]
    const m = all[all.length - 1]
    return { x: Number(m[1]), y: Number(m[2]) }
  })
}

async function viewTransform(page: Page) {
  return page.locator('.recipe-canvas-stage #view').evaluate((el) => {
    const t = el.getAttribute('transform') ?? ''
    const tr = /translate\(\s*([-\d.e+]+)[ ,]+([-\d.e+]+)\s*\)/i.exec(t)!
    const sc = /scale\(\s*([-\d.e+]+)/i.exec(t)!
    return { x: Number(tr[1]), y: Number(tr[2]), k: Number(sc[1]) }
  })
}

async function drag(page: Page, from: { x: number; y: number }, by: { x: number; y: number }, steps = 8) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + by.x, from.y + by.y, { steps })
  await page.mouse.up()
}

/**
 * An ingredient inside a compartment (depth >= 2) whose centre is on screen and is the topmost element there, so a
 * real mouse press reaches it. Returns its node id.
 */
async function pickNestedIngredient(page: Page): Promise<string> {
  const id = await stageOf(page).evaluate((stage) => {
    const rect = stage.getBoundingClientRect()
    for (const layer of stage.querySelectorAll('[data-kind="ingredient"]')) {
      if (Number(layer.getAttribute('data-depth')) < 2) continue
      const box = layer.querySelector('circle')!.getBoundingClientRect()
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      if (x < rect.left + 40 || x > rect.right - 40 || y < rect.top + 40 || y > rect.bottom - 40) continue
      if (document.elementFromPoint(x, y)?.closest('[data-node-id]') === layer) return layer.getAttribute('data-node-id')
    }
    return null
  })
  if (!id) throw new Error('no reachable nested ingredient')
  return id
}

test('modern renders of HIV and Influenza for the side-by-side with the legacy oracle', async ({ page }) => {
  await serveExamples(page)
  await loadExample(page, 'HIV mature')
  await page.waitForTimeout(500)
  await stageOf(page).screenshot({ path: 'test-results/recipe-view/modern-hiv.png' })

  await loadExample(page, 'Influenza envelope')
  await page.waitForTimeout(500)
  await stageOf(page).screenshot({ path: 'test-results/recipe-view/modern-influenza.png' })
})

test.describe('Influenza gestures with real mouse events', () => {
  test.beforeEach(async ({ page }) => {
    await serveExamples(page)
    await loadExample(page, 'Influenza envelope')
  })

  test('dragging a surface ingredient 60 px keeps it on the membrane (§4.3, §10.4)', async ({ page }) => {
    const stage = stageOf(page)
    const envelope = stage.locator('[data-kind="compartment"]')
    const ingredient = stage.locator('[data-kind="ingredient"]').first()
    const radius = Number(await envelope.getAttribute('data-r'))
    const before = await screenCentre(ingredient)
    await drag(page, before, { x: 60, y: 0 }, 10)
    const after = await screenCentre(ingredient)
    const e = await screenCentre(envelope)
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(5)
    expect(Math.abs(Math.hypot(after.x - e.x, after.y - e.y) - radius)).toBeLessThan(0.5)
  })

  test('dragging the envelope moves its ingredients by the same delta (§4.3)', async ({ page }) => {
    const stage = stageOf(page)
    const envelope = stage.locator('[data-kind="compartment"]')
    const ingredients = stage.locator('[data-kind="ingredient"]')
    const names = await ingredients.count()
    const centresBefore = await Promise.all(Array.from({ length: names }, (_, i) => screenCentre(ingredients.nth(i))))
    const e = await screenCentre(envelope)
    await drag(page, e, { x: 40, y: 30 }, 8)
    const envAfter = await screenCentre(envelope)
    expect(envAfter.x - e.x).toBeCloseTo(40, 0)
    expect(envAfter.y - e.y).toBeCloseTo(30, 0)
    for (let i = 0; i < names; i++) {
      const after = await screenCentre(ingredients.nth(i))
      expect(Math.abs(after.x - centresBefore[i].x - (envAfter.x - e.x))).toBeLessThan(1)
      expect(Math.abs(after.y - centresBefore[i].y - (envAfter.y - e.y))).toBeLessThan(1)
    }
  })

  test('the wheel over a node zooms the view (§4.1, rows 51-52)', async ({ page }) => {
    const before = await viewTransform(page)
    const c = await screenCentre(stageOf(page).locator('[data-kind="ingredient"]').first())
    await page.mouse.move(c.x, c.y)
    await page.mouse.wheel(0, -300)
    await expect.poll(async () => (await viewTransform(page)).k).toBeGreaterThan(before.k)
  })

  test('a middle-button drag pans and moves no node (§4.1, row 53)', async ({ page }) => {
    const stage = stageOf(page)
    const layers = stage.locator('[data-node-id]')
    const count = await layers.count()
    const worldBefore = await Promise.all(Array.from({ length: count }, (_, i) => worldCentre(layers.nth(i))))
    const before = await viewTransform(page)
    const e = await screenCentre(stage.locator('[data-kind="compartment"]'))
    await page.mouse.move(e.x, e.y)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(e.x + 50, e.y + 40, { steps: 6 })
    await page.mouse.up({ button: 'middle' })
    await expect.poll(async () => (await viewTransform(page)).x).toBeGreaterThan(before.x + 20)
    for (let i = 0; i < count; i++) expect(await worldCentre(layers.nth(i))).toEqual(worldBefore[i])
  })

  test('a click selects an ingredient: its circle turns yellow (§2.5, §4.5)', async ({ page }) => {
    const ingredient = stageOf(page).locator('[data-kind="ingredient"]').first()
    const c = await screenCentre(ingredient)
    await page.mouse.click(c.x, c.y)
    await expect(ingredient.locator('circle').first()).toHaveAttribute('fill', 'yellow')
  })

  test('a right click opens the context menu (§10.6)', async ({ page }) => {
    const c = await screenCentre(stageOf(page).locator('[data-kind="ingredient"]').first())
    await page.mouse.click(c.x, c.y, { button: 'right' })
    await expect(page.locator('.recipe-canvas-context-menu')).toBeVisible()
  })

  test('a right press and move on a node does not drag it (§4.2)', async ({ page }) => {
    const ingredient = stageOf(page).locator('[data-kind="ingredient"]').first()
    const c = await screenCentre(ingredient)
    const before = await worldCentre(ingredient)
    await page.mouse.move(c.x, c.y)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(c.x + 50, c.y + 10, { steps: 6 })
    await page.mouse.up({ button: 'right' })
    expect(await worldCentre(ingredient)).toEqual(before)
  })
})

test('Edit Mode: dropping a nested ingredient on empty space moves it to the root (§4.7, rows 66-68)', async ({ page }) => {
  await serveExamples(page)
  await loadExample(page, 'HIV mature')
  await page.getByRole('switch', { name: 'Edit Mode' }).click()
  const stage = stageOf(page)
  const id = await pickNestedIngredient(page)
  const layer = stage.locator(`[data-node-id="${id}"]`)
  await expect(layer).toHaveAttribute('data-depth', /^[2-9]/)

  // The empty point nearest a corner of the stage; zoom out first if the recipe covers the whole stage.
  const findEmpty = () =>
    stage.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const inset = 15
      for (let step = 0; step < 40; step++) {
        for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const x = rect.left + inset + (cx ? rect.width - 2 * inset - step * 5 : step * 5)
          const y = rect.top + inset + (cy ? rect.height - 2 * inset - step * 5 : step * 5)
          if (!document.elementFromPoint(x, y)?.closest('[data-node-id]') && el.contains(document.elementFromPoint(x, y))) return { x, y }
        }
      }
      return null
    })
  let corner = await findEmpty()
  if (!corner) {
    const box = (await stage.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, 400)
    await expect.poll(findEmpty).not.toBeNull()
    corner = await findEmpty()
  }
  if (!corner) throw new Error('no empty point on the stage')

  const from = await screenCentre(layer)
  await drag(page, from, { x: corner.x - from.x, y: corner.y - from.y }, 15)
  await expect(layer).toHaveAttribute('data-depth', '1')
  await expect(stage.locator('text[data-root-label]')).toHaveText(/\*$/)
})

// Mpn (Mycoplasma pneumoniae, 181 nodes) is served through the HIV menu entry: the menu offers it only under Append.
const perfCases = [
  { name: 'HIV', serve: undefined },
  { name: 'Mpn', serve: { example: 'HIV_serialized.json', file: 'Mpn_1.0_2.json' } },
]
for (const recipe of perfCases) {
  test(`${recipe.name}: 95% of rAF intervals during a 40-step drag stay within a frame of the median (How we work, step 0)`, async ({ page }, testInfo) => {
    // Against the production build: the development build's per-frame React cost is not the user's.
    await serveExamples(page, recipe.serve)
    await loadExample(page, 'HIV mature', `http://localhost:${Number(process.env.E2E_PORT ?? 5173) + 10}/`)
    const id = await pickNestedIngredient(page)
    const layer = stageOf(page).locator(`[data-node-id="${id}"]`)
    const from = await screenCentre(layer)

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
    const sorted = (frames: number[]) => frames.slice(1).map((t, i) => t - frames[i]).sort((a, b) => a - b)
    // Idle baseline on the same page: the environment's own frame noise (software GL, the Mol* viewers), for the annotations.
    const idle = sorted(await record(1000))

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
    const intervals = sorted(frames)
    expect(intervals.length).toBeGreaterThan(20)
    const at = (list: number[], q: number) => list[Math.min(list.length - 1, Math.floor(q * list.length))]
    const p50 = at(intervals, 0.5)
    const p95 = at(intervals, 0.95)
    testInfo.annotations.push({ type: 'rAF p50 (ms)', description: p50.toFixed(2) }, { type: 'rAF p95 (ms)', description: p95.toFixed(2) }, { type: 'frames', description: String(intervals.length) },
      { type: 'idle rAF p50/p95 (ms)', description: `${at(idle, 0.5).toFixed(2)} / ${at(idle, 0.95).toFixed(2)}` })
    expect(p95).toBeLessThanOrEqual(Math.max(p50, 16.7) + 1)
  })
}
