import { expect, test } from '@playwright/test'

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

  await expect(page.locator('.recipe-canvas-background')).toHaveAttribute('data-canvas-theme', 'dark')
  await expect(page.locator('.recipe-canvas-background')).toHaveAttribute('fill', 'var(--color-recipe-canvas-bg)')
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

  const surfaceForce = page.getByRole('slider', { name: 'Surface force' })
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

test('Recipe View fills its panel and allows compartment dragging outside Edit Mode', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load', exact: true }).click()
  await page.getByText('New Recipe', { exact: true }).click()
  await page.getByText('Empty Recipe', { exact: true }).click()

  await page.getByRole('switch', { name: 'Edit Mode' }).click()
  await page.getByRole('button', { name: 'Add compartment' }).click()
  await page.getByRole('button', { name: 'Add ingredient' }).click()
  await page.getByRole('switch', { name: 'Edit Mode' }).click()

  const svg = page.locator('svg.recipe-canvas')
  await expect(svg).toBeVisible()
  const geometry = await svg.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const viewBox = element.viewBox.baseVal
    return { renderedRatio: rect.width / rect.height, viewBoxRatio: viewBox.width / viewBox.height }
  })
  expect(Math.abs(geometry.renderedRatio - geometry.viewBoxRatio)).toBeLessThan(0.03)

  const compartmentCircle = svg.locator('title').filter({ hasText: 'newCompartment' }).first().locator('..')
  const group = compartmentCircle.locator('..')
  const before = await group.getAttribute('transform')
  const box = await compartmentCircle.boundingBox()
  if (!box) throw new Error('Compartment circle has no bounding box')
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 }

  await compartmentCircle.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: start.x, clientY: start.y })
  await svg.dispatchEvent('pointermove', { bubbles: true, pointerId: 1, clientX: start.x + 24, clientY: start.y })
  await svg.dispatchEvent('pointerup', { bubbles: true, pointerId: 1, clientX: start.x + 24, clientY: start.y })

  await expect(group).not.toHaveAttribute('transform', before ?? '')
})

test('Influenza renders a hidden root, two-edge envelope, and membrane-centred surface proteins', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Load', exact: true }).click()
  await page.getByText('New Recipe', { exact: true }).click()
  await page.getByText('From Examples', { exact: true }).click()
  await page.getByText('Influenza envelope', { exact: true }).click()

  const svg = page.locator('svg.recipe-canvas')
  await expect(svg.locator('[data-node-name="root"]')).toHaveCount(0)
  const envelope = svg.locator('[data-node-name="envelope"]')
  await expect(envelope).toBeVisible()
  await expect(envelope.locator('[data-membrane-edge]')).toHaveCount(2)

  const geometry = await svg.evaluate((element) => {
    const readPosition = (node: Element) => {
      const match = node.getAttribute('transform')?.match(/translate\(([-\d.e+]+),([-\d.e+]+)\)/i)
      if (!match) throw new Error(`Missing node transform for ${node.getAttribute('data-node-name')}`)
      return { x: Number(match[1]), y: Number(match[2]) }
    }
    const parent = element.querySelector('[data-node-name="envelope"]')!
    const parentPosition = readPosition(parent)
    const parentRadius = Number(parent.querySelector('[data-compartment-hit="true"]')!.getAttribute('r'))
    return ['Hemagglutinin', 'Neuraminidase', 'M2protein'].map((name) => {
      const node = element.querySelector(`[data-node-name="${name}"]`)!
      const position = readPosition(node)
      return Math.hypot(position.x - parentPosition.x, position.y - parentPosition.y) - parentRadius
    })
  })

  for (const radialError of geometry) expect(Math.abs(radialError)).toBeLessThan(0.01)
})
