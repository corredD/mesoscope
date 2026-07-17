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

  await page.getByLabel('Edit Mode').check()
  await page.getByRole('button', { name: 'Add compartment' }).click()
  await page.getByRole('button', { name: 'Add ingredient' }).click()
  await page.getByLabel('Edit Mode').uncheck()

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
