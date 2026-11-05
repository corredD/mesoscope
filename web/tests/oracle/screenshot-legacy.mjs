// Screenshot the legacy Recipe View panel (#d3canvas's parent) for the side-by-side with the modern canvas.
//
// Run from web/ with the legacy server up (python3 web/tests/oracle/legacy_server.py 8092):
//   node tests/oracle/screenshot-legacy.mjs
//
// Writes test-results/recipe-view/legacy-hiv.png and legacy-influenza.png at 1200x800. Env LEGACY_URL overrides the server.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../../test-results/recipe-view');
const BASE = process.env.LEGACY_URL ?? 'http://localhost:8092';
const RECIPES = [
  { name: 'hiv', recipe: 'data/HIV_serialized.json' },
  { name: 'influenza', recipe: 'data/InfluenzaA.json' },
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const { name, recipe } of RECIPES) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(`${BASE}/index.html?recipe=${recipe}`);
  await page.waitForFunction(() => window.graph && graph.nodes && graph.nodes.length > 1, null, { timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.locator('#d3canvas').locator('xpath=..').screenshot({ path: resolve(outDir, `legacy-${name}.png`) });
  await page.close();
}
await browser.close();
