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
  await expect(page.getByText('Interaction table')).toBeVisible()

  await page.getByRole('button', { name: 'Layout Options' }).click()
  await page.getByText('Hide Interaction Table').click()

  await expect(page.getByText('Interaction table')).toHaveCount(0)
})
