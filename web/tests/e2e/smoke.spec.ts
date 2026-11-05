import { expect, test, type Page } from '@playwright/test'

test('modern app shell loads with the four legacy menu groups', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Mesoscope (modern)')
  // exact: true — the Mol-* viewer (mounted in the default-active "Mol-*" tab) has its own
  // "Load ..." buttons in its toolbar once Mol-star actually renders (item 5's viewer mount).
  for (const label of ['Load', 'Save', 'Layout Options', 'Skills']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
  }
  await expect(page.getByText('Recipe View', { exact: true })).toBeVisible()
  await expect(page.getByText('Ingredient View', { exact: true })).toBeVisible()
})

test('default layout favors Ingredient View and dark mode reaches both rendering canvases', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const ingredientOptions = page.locator('[data-panel-content="ingredient-options"]')
  const ingredientView = page.locator('[data-panel-content="ingredient-view"]')
  await expect(ingredientOptions).toBeVisible()
  await expect(ingredientView).toBeVisible()
  const optionsBox = await ingredientOptions.boundingBox()
  const viewBox = await ingredientView.boundingBox()
  if (!optionsBox || !viewBox) throw new Error('Default Ingredient panels have no layout boxes')
  expect(optionsBox.width).toBeLessThanOrEqual(205)
  expect(viewBox.width).toBeGreaterThan(optionsBox.width)

  const proportions = await page.evaluate(() => {
    const workspace = document.querySelector('.workspace .dv-dockview')!.getBoundingClientRect()
    const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')]
    const groupElement = (label: string) => {
      const tab = tabs.find((element) => element.textContent?.trim() === label)
      const group = tab?.closest('.dv-groupview')
      if (!group) throw new Error(`No Dockview group for ${label}`)
      return group
    }
    const recipeOptions = groupElement('Recipe Options').getBoundingClientRect()
    const recipeView = groupElement('Recipe View').getBoundingClientRect()
    const ingredientOptions = groupElement('Ingredient Options').getBoundingClientRect()
    const ingredientViewGroup = groupElement('Ingredient View')
    const ingredientView = ingredientViewGroup.getBoundingClientRect()
    const recipeTable = groupElement('Recipe table').getBoundingClientRect()
    return {
      recipeOptions: recipeOptions.width / workspace.width,
      recipeView: recipeView.width / workspace.width,
      ingredientOptions: ingredientOptions.width / workspace.width,
      ingredientView: ingredientView.width / workspace.width,
      tableHeight: recipeTable.height / workspace.height,
      viewersShareGroup: ingredientViewGroup === groupElement('Mol-*'),
    }
  })
  expect(proportions.recipeOptions).toBeGreaterThan(0.07)
  expect(proportions.recipeOptions).toBeLessThan(0.13)
  expect(proportions.recipeView).toBeGreaterThan(0.29)
  expect(proportions.recipeView).toBeLessThan(0.39)
  expect(proportions.ingredientOptions).toBeGreaterThan(0.1)
  expect(proportions.ingredientOptions).toBeLessThan(0.16)
  expect(proportions.ingredientView).toBeGreaterThan(0.37)
  expect(proportions.ingredientView).toBeLessThan(0.49)
  expect(proportions.tableHeight).toBeGreaterThan(0.26)
  expect(proportions.tableHeight).toBeLessThan(0.34)
  expect(proportions.viewersShareGroup).toBe(true)

  await page.getByRole('button', { name: 'Load', exact: true }).click()
  await page.getByText('New Recipe', { exact: true }).click()
  await page.getByText('Empty Recipe', { exact: true }).click()
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()

  await expect(page.locator('.recipe-canvas-stage')).toHaveAttribute('data-canvas-theme', 'dark')
  await expect(page.locator('[data-molstar-viewer="ingredient"]')).toHaveAttribute('data-canvas-theme', 'dark')
  await expect(page.locator('[data-molstar-viewer="model"]')).toHaveAttribute('data-canvas-theme', 'dark')
})

test('app buttons share accessible target sizing, focus treatment, and theme variants', async ({ page }) => {
  await page.goto('/')

  const appButtons = page.locator('.app-button')
  await expect(appButtons.first()).toBeVisible()
  const targetSizes = await appButtons.evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }),
  )
  for (const target of targetSizes) {
    expect(target.width).toBeGreaterThanOrEqual(24)
    expect(target.height).toBeGreaterThanOrEqual(24)
  }

  await page.keyboard.press('Tab')
  const focused = page.getByRole('button', { name: 'Load', exact: true })
  await expect(focused).toBeFocused()
  const focusStyle = await focused.evaluate((button) => {
    const style = getComputedStyle(button)
    return { width: style.outlineWidth, style: style.outlineStyle }
  })
  expect(focusStyle.width).toBe('2px')
  expect(focusStyle.style).toBe('solid')

  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
})

test('Radix switches and scientific sliders remain usable in a narrow panel layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Load', exact: true }).click()
  await page.getByText('New Recipe', { exact: true }).click()
  await page.getByText('Empty Recipe', { exact: true }).click()

  const editMode = page.getByRole('switch', { name: 'Edit Mode' })
  await expect(editMode).toBeVisible()
  await editMode.click()
  await expect(editMode).toHaveAttribute('aria-checked', 'true')

  const surfaceForce = page.getByRole('slider', {
    name: 'SurfaceForce force',
    exact: true,
  })
  await expect(surfaceForce).toBeVisible()
  const before = Number(await surfaceForce.getAttribute('aria-valuenow'))
  await surfaceForce.focus()
  await page.keyboard.press('ArrowRight')
  await expect(surfaceForce).toHaveAttribute('aria-valuenow', String(Number((before + 0.01).toFixed(2))))

  const panelBounds = await surfaceForce.evaluate((control) => {
    const controlRect = control.getBoundingClientRect()
    const panelRect = control.closest('.panel-body')?.getBoundingClientRect()
    return {
      controlLeft: controlRect.left,
      controlRight: controlRect.right,
      panelLeft: panelRect?.left ?? 0,
      panelRight: panelRect?.right ?? window.innerWidth,
    }
  })
  expect(panelBounds.controlLeft).toBeGreaterThanOrEqual(panelBounds.panelLeft)
  expect(panelBounds.controlRight).toBeLessThanOrEqual(panelBounds.panelRight)
})

test('Layout Options toggles a workspace tab', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Interaction table')).toHaveCount(0)

  await page.getByRole('button', { name: 'Layout Options' }).click()
  await page.getByText('Show Interaction Table').click()

  await expect(page.getByText('Interaction table', { exact: true })).toBeVisible()
})

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
type Probe = {
  nodes: ProbeNode[]
  t: { x: number; y: number; k: number }
  hot: boolean
  box: { left: number; top: number; width: number; height: number }
  stage: { width: number; height: number }
}

/** The Recipe View is one canvas; its stage exposes a read-only probe of the simulation's nodes and the view transform. */
const probe = (page: Page): Promise<Probe> =>
  page.locator('.recipe-canvas-stage').evaluate((el) => {
    const p = (
      el as unknown as {
        __recipeView: {
          nodes: () => ProbeNode[]
          transform: () => Probe['t']
          hot: () => boolean
        }
      }
    ).__recipeView
    const c = el.querySelector('canvas.recipe-canvas')!.getBoundingClientRect()
    const st = el.getBoundingClientRect()
    return {
      nodes: p.nodes(),
      t: p.transform(),
      hot: p.hot(),
      box: { left: c.left, top: c.top, width: c.width, height: c.height },
      stage: { width: st.width, height: st.height },
    }
  })

test('Recipe View fills its panel and allows compartment dragging outside Edit Mode', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load', exact: true }).click()
  await page.getByText('New Recipe', { exact: true }).click()
  await page.getByText('Empty Recipe', { exact: true }).click()

  await page.getByRole('switch', { name: 'Edit Mode' }).click()
  await page.getByRole('button', { name: 'Add compartment' }).click()
  await page.getByRole('button', { name: 'Add ingredient' }).click()
  await page.getByRole('switch', { name: 'Edit Mode' }).click()

  const canvas = page.locator('canvas.recipe-canvas')
  await expect(canvas).toBeVisible()
  await expect.poll(async () => (await probe(page)).nodes.some((n) => n.name.startsWith('newCompartment'))).toBe(true)
  await expect.poll(async () => (await probe(page)).hot, { timeout: 30_000 }).toBe(false)
  // The canvas fills its stage (the panel).
  const geometry = await probe(page)
  expect(Math.abs(geometry.box.width - geometry.stage.width)).toBeLessThan(2)
  expect(Math.abs(geometry.box.height - geometry.stage.height)).toBeLessThan(2)

  const before = geometry.nodes.find((n) => n.name.startsWith('newCompartment'))!
  const { t, box } = geometry
  // Press on the compartment's disk, away from its ingredient (the deepest disk wins), and drag 24 px.
  const press = {
    x: box.left + (before.x - before.r * 0.8) * t.k + t.x,
    y: box.top + before.y * t.k + t.y,
  }
  await page.mouse.move(press.x, press.y)
  await page.mouse.down()
  await page.mouse.move(press.x + 24, press.y, { steps: 6 })
  await page.mouse.up()

  await expect
    .poll(async () => {
      const n = (await probe(page)).nodes.find((m) => m.name === before.name)!
      return Math.hypot(n.x - before.x, n.y - before.y) * t.k
    })
    .toBeGreaterThan(10)
})

test('Influenza renders one envelope compartment and membrane-centred surface proteins', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load', exact: true }).click()
  await page.getByText('New Recipe', { exact: true }).click()
  await page.getByText('From Examples', { exact: true }).click()
  await page.getByText('Influenza envelope', { exact: true }).click()

  await expect.poll(async () => (await probe(page)).nodes.length, { timeout: 30_000 }).toBeGreaterThan(1)
  await expect
    .poll(async () => (await probe(page)).hot, {
      timeout: 60_000,
      intervals: [200],
    })
    .toBe(false)
  const { nodes } = await probe(page)
  const compartments = nodes.filter((n) => !n.leaf && n.depth >= 1)
  expect(compartments.map((n) => n.name)).toEqual(['envelope'])
  const envelope = compartments[0]
  const proteins = nodes.filter((n) => n.leaf)
  expect(proteins.map((n) => n.name).sort()).toEqual(['Hemagglutinin', 'M2protein', 'Neuraminidase'])
  for (const p of proteins) {
    expect(p.surface).toBe(true)
    expect(p.parent).toBe('envelope')
    expect(Math.abs(Math.hypot(p.x - envelope.x, p.y - envelope.y) - envelope.r)).toBeLessThan(0.5)
  }
})
