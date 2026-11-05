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

  await expect(page.locator('.recipe-canvas-stage')).toHaveAttribute('data-canvas-theme', 'dark')
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

  const scaleRadius = page.getByRole('slider', { name: 'Scale Radius by' })
  await expect(scaleRadius).toBeVisible()
  const before = Number(await scaleRadius.getAttribute('aria-valuenow'))
  await scaleRadius.focus()
  await page.keyboard.press('ArrowRight')
  await expect(scaleRadius).toHaveAttribute('aria-valuenow', String(Number((before + 0.01).toFixed(2))))
})

test('Scale Radius slider stays inside a narrow Recipe Options panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Load', exact: true }).click()
  await page.getByText('New Recipe', { exact: true }).click()
  await page.getByText('Empty Recipe', { exact: true }).click()
  const scaleRadius = page.getByRole('slider', { name: 'Scale Radius by' })
  await expect(scaleRadius).toBeVisible()

  const panelBounds = await scaleRadius.evaluate((control) => {
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

