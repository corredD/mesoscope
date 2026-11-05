// Mockup checker. Run from anywhere: `node design/mockups/check.mjs [--no-shots]`
// For every *.html in this folder, in light and dark (?theme=dark), at 1440x900:
//   - fails on console errors, page errors, any non-file:/data:/about: request,
//     or a wrong <html data-theme>;
//   - saves a viewport screenshot to screenshots/<page>-<theme>.png (unless --no-shots);
// Probes the prism-me screens (11 Place follows the Focus: a reason, an empty state, Inside; 10's Scene tab keeps it).
// Then checks that every menu path (menuConfig.ts, e.g. "Load › New Recipe › Examples › Exosome")
// and panel ("Panel › <title>" from Workspace.tsx) equals the first cell of a table row in the
// "Coverage" section of _spec/design/README.md (`--list` prints the extracted paths), and
// that the contrast pairs in tokens.css (`/* contrast-pairs [[fg,bg,min],...] */`) meet WCAG.
// Exit code 1 on any failure.
import { chromium } from 'playwright'
import { readdirSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const web = join(here, '..', '..')
const shotsDir = join(here, 'screenshots')
const noShots = process.argv.includes('--no-shots')
let failures = 0
const SEP = ' › '
const fail = (msg) => { failures++; console.log(`  FAIL ${msg}`) }

// Page rendering: render every page in both themes.
const listOnly = process.argv.includes('--list')
const pages = listOnly ? [] : readdirSync(here).filter((f) => f.endsWith('.html')).sort()
console.log(`Pages found: ${pages.length}`)
if (!noShots) mkdirSync(shotsDir, { recursive: true })
const browser = await chromium.launch()
const strip = (t) => t.replace(/(^|\s)\/\/.*$/gm, '$1')
for (const page of pages) {
  for (const theme of ['light', 'dark']) {
    const problems = []
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    p.on('console', (m) => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`) })
    p.on('pageerror', (e) => problems.push(`page error: ${e.message}`))
    p.on('request', (r) => {
      const u = r.url()
      if (!u.startsWith('file://') && !u.startsWith('data:') && !u.startsWith('about:')) problems.push(`network request: ${u}`)
    })
    const url = pathToFileURL(join(here, page)).href + (theme === 'dark' ? '?theme=dark' : '')
    await p.goto(url, { waitUntil: 'load' })
    await p.waitForTimeout(200)
    const actual = await p.evaluate(() => document.documentElement.dataset.theme)
    if (actual !== theme) problems.push(`data-theme is ${JSON.stringify(actual)}, expected "${theme}"`)
    if (!noShots) await p.screenshot({ path: join(shotsDir, `${page.replace(/\.html$/, '')}-${theme}.png`) })
    await ctx.close()
    if (problems.length === 0) console.log(`OK   ${page} [${theme}]`)
    else { console.log(`${page} [${theme}]`); problems.forEach(fail) }
  }
}
// Probes of the prism-me screens (README §5.7): the stage follows the Focus, and the Scene tab keeps the stage.
if (!listOnly) {
  console.log('Scene probes')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  const probe = async (file, cfg, expr, label) => {
    await p.goto(pathToFileURL(join(here, file)).href, { waitUntil: 'load' })
    if (cfg) await p.evaluate((c) => window.Mock.render(c), cfg)
    const got = await p.evaluate(expr)
    if (got === true) console.log(`  OK   ${label}`); else fail(`${label}: ${got}`)
  }
  const place = (focus) => ({ recipe: 'hiv', views: ['place'], focus, scene: { mode: 'place' } })
  const panel = `(document.querySelector('.scene-panel')?.textContent ?? 'no panel')`
  await probe('11-place.html', place(['HIV1_CA_mono_0_1_0']), `/no geometry/.test(${panel}) && !document.querySelector('[data-ghost]') || ${panel}`, 'place, a capsid ingredient: the reason, no ghost')
  await probe('11-place.html', place([]), `/Point at an ingredient to place it/.test(${panel}) || ${panel}`, 'place, an empty Focus: the empty state')
  await probe('11-place.html', place(['HIV1_PR_7hvp_0_1_0']), `((b) => b?.textContent === 'Inside' || (b?.textContent ?? 'none pressed'))(document.querySelector('[aria-label="Where to place"] [aria-pressed="true"]'))`, 'place, an interior ingredient: Inside is pressed')
  await probe('10-paint.html', null, `(() => { [...document.querySelectorAll('[aria-label="Stage views"] [role=tab]')].find((b) => b.textContent === 'Scene').click(); return !!document.querySelector('[aria-label^="prism-me stage"]') || 'the Scene tab left the prism-me stage' })()`, 'paint, the Scene tab keeps the prism-me stage')
  await ctx.close()
}
await browser.close()


// Coverage: extract menu paths with a bracket-aware walk over the MENU literal.
const read = (rel) => readFileSync(join(web, rel), 'utf8')
const str = `'((?:[^'\\\\]|\\\\.)*)'`
const unq = (s) => s.replace(/\\(.)/g, '$1')
const menuSrc = strip(read('src/components/layout/menuConfig.ts'))
const body = menuSrc.slice(menuSrc.indexOf('export const MENU'))
const tok = new RegExp([
  `\\bbranch\\(\\s*${str}\\s*,\\s*\\[`,            // 1: branch open
  `\\bpresetLeaf\\(\\s*[^,]+,\\s*${str}`,          // 2: preset leaf
  `\\btoggleLeaf\\(\\s*[^,]+,\\s*${str}`,          // 3: toggle leaf (shown label)
  `\\bleaf\\(\\s*${str}`,                          // 4: leaf
  `\\blabel:\\s*${str}`,                           // 5: group label
  `\\bitems:\\s*\\[`,                              // 6: group items open
  `\\]`,                                           // 7: close
].join('|'), 'g')
const paths = []
const stack = []
let group = null
for (const m of body.matchAll(tok)) {
  if (m[1] !== undefined) stack.push(unq(m[1]))
  else if (m[2] ?? m[3] ?? m[4]) paths.push([...stack, unq(m[2] ?? m[3] ?? m[4])].join(SEP))
  else if (m[5] !== undefined) group = unq(m[5])
  else if (m[0].startsWith('items')) stack.push(group)
  else stack.pop()
}
const titles = new Set()
for (const m of strip(read('src/components/layout/Workspace.tsx')).matchAll(new RegExp(`title:\\s*${str}`, 'g'))) titles.add(unq(m[1]))
const all = [...new Set([...paths, ...[...titles].map((t) => `Panel${SEP}${t}`)])]
if (listOnly) { console.log(all.join('\n')); process.exit(0) }

console.log('Coverage check')
const readmePath = join(web, '_spec/design/README.md')
if (!existsSync(readmePath)) fail('_spec/design/README.md does not exist')
else {
  const lines = readFileSync(readmePath, 'utf8').split('\n')
  const start = lines.findIndex((l) => l.startsWith('## ') && l.includes('Coverage'))
  if (start < 0) fail('README.md has no "## ... Coverage" section')
  else {
    let end = lines.findIndex((l, i) => i > start && l.startsWith('## '))
    if (end < 0) end = lines.length
    const cells = new Set(lines.slice(start, end).filter((l) => l.startsWith('|'))
      .map((l) => l.split('|')[1].replace(/`/g, '').trim()))
    const missing = all.filter((p) => !cells.has(p))
    console.log(`  ${all.length} paths checked, ${missing.length} missing`)
    missing.forEach((p) => fail(`missing from Coverage: ${p}`))
  }
}

// Contrast: resolve token pairs from tokens.css per theme and compute WCAG ratios.
console.log('Contrast check')
const tokensPath = join(here, 'tokens.css')
if (!existsSync(tokensPath)) console.log('  tokens.css not found, skipped')
else {
  const css = readFileSync(tokensPath, 'utf8')
  const block = css.match(/\/\* contrast-pairs([\s\S]*?)\*\//)
  if (!block) console.log('  no "/* contrast-pairs" block in tokens.css, skipped')
  else {
    const body = block[1].replace(/^\s*\*/gm, '')
    const pairs = JSON.parse(body.slice(body.indexOf('[')))
    const b = await chromium.launch()
    for (const theme of ['light', 'dark']) {
      const p = await b.newPage()
      await p.setContent(`<!doctype html><html data-theme="${theme}"><head><style>${css}</style></head><body></body></html>`)
      // Resolve each var to sRGB bytes by painting its computed color on a 1x1 canvas.
      const rgb = (v) => p.evaluate((name) => {
        const d = document.createElement('div'); d.style.color = `var(${name})`; document.body.append(d)
        const c = getComputedStyle(d).color
        const x = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
        x.fillStyle = '#000'; x.fillStyle = c; x.fillRect(0, 0, 1, 1)
        return [...x.getImageData(0, 0, 1, 1).data.slice(0, 3)]
      }, v)
      const lum = ([r, g, bl]) => [r, g, bl].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
        .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0)
      const defined = (name) => p.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() !== '', name)
      for (const [fg, bg, min] of pairs) {
        // An undefined token would resolve to the inherited text colour and pass: fail it instead.
        const missing = [fg, bg].filter((n) => n)
        let undef = false
        for (const n of missing) if (!(await defined(n))) { fail(`contrast ${n} is not defined [${theme}]`); undef = true }
        if (undef) continue
        const [l1, l2] = [lum(await rgb(fg)), lum(await rgb(bg))]
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
        const line = `${fg} on ${bg} [${theme}] ${ratio.toFixed(2)} (min ${min})`
        if (ratio >= min) console.log(`  OK   ${line}`); else fail(`contrast ${line}`)
      }
      await p.close()
    }
    await b.close()
  }
}

console.log(failures ? `\n${failures} failure(s)` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
