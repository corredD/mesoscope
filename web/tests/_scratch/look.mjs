import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
const [,, base, label, out, file] = process.argv
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
const errs = []
page.on('pageerror', (e) => errs.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await page.route('**/data/*.json', (route) => {
  const name = new URL(route.request().url()).pathname.split('/').pop()
  const f = file && name === 'HIV_serialized.json' ? file : name
  return route.fulfill({ contentType: 'application/json', body: readFileSync('/Users/ludovicautin/Developments/mesoscope-lanes/recipe-view-canvas/data/' + f, 'utf-8') })
})
await page.goto(base)
await page.getByRole('button', { name: 'Load', exact: true }).click()
await page.getByText('New Recipe', { exact: true }).click()
await page.getByText('From Examples', { exact: true }).click()
await page.getByText(label, { exact: true }).click()
await page.waitForTimeout(6000)
const info = await page.locator('.recipe-canvas-stage').evaluate((el) => ({ hot: el.__recipeView.hot(), frames: el.__recipeView.frames(), n: el.__recipeView.nodes().length, t: el.__recipeView.transform(), box: el.getBoundingClientRect().toJSON(), sample: el.__recipeView.nodes().slice(0, 4) }))
console.log(JSON.stringify(info))
await page.locator('.recipe-canvas-stage').screenshot({ path: out })
console.log('errors', errs.slice(0, 5))
await browser.close()
