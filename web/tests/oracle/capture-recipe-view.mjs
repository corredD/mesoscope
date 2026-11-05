// Capture the legacy Recipe View oracle (D3 v4 canvas in js/main.js) for the lane recipe-view-port.
//
// Run from web/ with the legacy server up (python3 web/tests/oracle/legacy_server.py 8091):
//   node tests/oracle/capture-recipe-view.mjs
//
// For each recipe it writes tests/fixtures/recipe-view-oracle/<name>.json and legacy-<name>.png:
//   nodes       per-node hierarchy data, radii per size mode, fill per colour mode, stroke colours
//   frame       draw-order recording of one ticked() call (identity transform, sprites off)
//   frameZoomed the same at zoom scale 2 (ingredient labels are drawn)
//   gestures    real-mouse click / ctrl-click / click inside compartment / click on empty space
// See web/_spec/recipe-view.md for the behaviour being captured. Env LEGACY_URL overrides the server.
import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const outDir = resolve(here, '../fixtures/recipe-view-oracle');
const BASE = process.env.LEGACY_URL ?? 'http://localhost:8091';
const VIEWPORT = { width: 1200, height: 800 };
const RECIPES = [
  { name: 'hiv', recipe: 'data/HIV_serialized.json' },
  { name: 'influenza', recipe: 'data/InfluenzaA.json' },
];
const R_SIZE_MODES = ['size', 'default', 'molecularweight', 'radius_molecularweight'];

// Wraps d3v4.pack before d3 loads, so each node keeps the pack radius (`__packR`) that
// mapRadiusToProperty_cb later overwrites (spec 1.7).
const PACK_HOOK = () => {
  const o = {};
  let wrapped;
  const wrapPack = (p) => {
    const w = (root) => { const res = p(root); res.each((n) => { n.__packR = n.r; }); return res; };
    for (const k of ['size', 'padding', 'radius']) {
      if (typeof p[k] !== 'function') continue;
      w[k] = (...a) => { const x = p[k](...a); return a.length ? w : x; };
    }
    return w;
  };
  Object.defineProperty(o, 'pack', { configurable: true, enumerable: true,
    get: () => wrapped, set: (v) => { wrapped = () => wrapPack(v()); } });
  window.d3v4 = o;
};

const r3 = (x) => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : x);

async function openRecipe(browser, recipe) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(PACK_HOOK);
  await page.goto(`${BASE}/index.html?recipe=${recipe}`);
  await page.waitForFunction(() => window.graph && graph.nodes && graph.nodes.length > 1, null, { timeout: 60000 });
  // the load-time simulation (alpha 1) stops itself once alpha < alphaMin
  await page.waitForFunction(() => simulation.alpha() < simulation.alphaMin(), null, { timeout: 120000 });
  await page.evaluate(() => { simulation.stop(); ticked(null); });
  return { page, errors };
}

// ---- static data: hierarchy, radii per size mode, colour per colour mode ----
async function captureNodes(page) {
  return page.evaluate(({ rModes }) => {
    const r3 = (x) => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : x);
    const norm = (c) => { const x = d3v4.color(c); return x ? x.toString() : null; };
    const readR = () => graph.nodes.map((d) => r3(d.r));
    const modes = canvas_color_options.slice();
    const initialColor = canvas_color.value;
    const rBy = {};
    for (const m of rModes) { mapRadiusToProperty_cb(m); rBy[m] = readR(); }
    radius_scale = 2; mapRadiusToProperty_cb('size'); rBy['size@radius_scale=2'] = readR();
    radius_scale = 1.0; mapRadiusToProperty_cb('size');
    const sizeAfterRestore = readR();
    // the select #canvas_color drives ChangeCanvasColor(this) then colorNode(d)
    const fills = graph.nodes.map(() => ({}));
    const fillErrors = graph.nodes.map(() => ({}));
    for (const m of modes) {
      canvas_color.value = m;
      try { ChangeCanvasColor(canvas_color); } catch (e) { graph.nodes.forEach((_, i) => { fillErrors[i][m] = 'ChangeCanvasColor: ' + e.message; }); }
      graph.nodes.forEach((d, i) => {
        try { fills[i][m] = norm(colorNode(d)); } catch (e) { fills[i][m] = null; fillErrors[i][m] = String(e.message); }
      });
    }
    canvas_color.value = initialColor; ChangeCanvasColor(canvas_color);
    const nodes = graph.nodes.map((d, i) => {
      const o = {
        index: i, name: d.data.name, depth: d.depth, parent: d.parent ? d.parent.data.name : null,
        nodetype: d.data.nodetype, surface: d.data.surface ?? null, childCount: (d.children || []).length,
        packR: d.__packR === undefined ? null : r3(d.__packR),
        r: {}, fill: fills[i],
        stroke: norm(color(d.depth + 1)), depthColor: norm(color(d.depth)),
      };
      for (const k of Object.keys(rBy)) o.r[k] = rBy[k][i];
      if (Object.keys(fillErrors[i]).length) o.fillError = fillErrors[i];
      return o;
    });
    return { nodes, modes, sizeRestored: JSON.stringify(sizeAfterRestore) === JSON.stringify(rBy.size) };
  }, { rModes: R_SIZE_MODES });
}

// ---- draw-order recording of one ticked() call ----
async function captureFrame(page, scale) {
  return page.evaluate((k) => {
    const r3 = (x) => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : x);
    // rotate/transform/curves are added to the requested list: drawCircularText relies on rotate
    const OPS = ['beginPath', 'arc', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'fillRect', 'clearRect',
      'rect', 'fillText', 'strokeText', 'drawImage', 'save', 'restore', 'translate', 'scale', 'setTransform',
      'resetTransform', 'rotate', 'transform', 'quadraticCurveTo', 'bezierCurveTo', 'ellipse'];
    const style = (v) => (typeof v === 'string' ? v : typeof v === 'number' ? r3(v) : 'gradient');
    const proto = Object.getPrototypeOf(context);
    const rec = [];
    const sprites = document.getElementById('sprites');
    const spritesWas = sprites.checked;
    const transformWas = transform;
    sprites.checked = false;
    simulation.stop();
    transform = k === 1 ? d3v4.zoomIdentity : d3v4.zoomIdentity.scale(k);
    for (const op of OPS) {
      const orig = proto[op];
      if (typeof orig !== 'function') continue;
      context[op] = function (...a) {
        rec.push({
          op, args: op === 'drawImage' ? ['image'] : a.map((x) => (typeof x === 'number' ? r3(x) : typeof x === 'string' ? x : String(x))),
          fillStyle: style(context.fillStyle), strokeStyle: style(context.strokeStyle),
          lineWidth: r3(context.lineWidth), font: context.font, textAlign: context.textAlign,
        });
        return orig.apply(context, a);
      };
    }
    try { ticked(null); } finally {
      for (const op of OPS) delete context[op];
      sprites.checked = spritesWas;
      transform = transformWas;
    }
    return rec;
  }, scale);
}

async function frameState(page) {
  return page.evaluate(() => `mousein=${mousein}; node_over=${node_over?.data?.name ?? null}; node_selected=${node_selected?.data?.name ?? null}; ` +
    `canvas_color=${canvas_color.value}; canvas_label=${canvas_label.value}; canvas_map_r=${document.getElementById('canvas_map_r').value}; ` +
    `radius_scale=${radius_scale}; simulation stopped before the call and the pointer was never over the canvas; ` +
    `rotate/transform/quadraticCurveTo/bezierCurveTo/ellipse are recorded in addition to the requested ops`);
}

// ---- gestures with real mouse events ----
// Positions are re-read right before each gesture, with the simulation stopped, because the
// simulation restarts when the pointer enters the canvas (spec 3.4).
async function freeze(page) {
  await page.waitForTimeout(80);
  return page.evaluate(() => {
    simulation.stop();
    const rect = canvas.getBoundingClientRect();
    return {
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      border: [canvas.clientLeft, canvas.clientTop], bitmap: [canvas.width, canvas.height],
      nodes: graph.nodes.map((d, i) => ({ name: d.data.name, x: d.x, y: d.y, r: d.r, depth: d.depth, leaf: !d.children, surface: d.data.surface, i })),
    };
  });
}
const toScreen = (f, wx, wy) => ({
  x: f.rect.left + f.border[0] + (wx * f.rect.width) / f.bitmap[0],
  y: f.rect.top + f.border[1] + (wy * f.rect.height) / f.bitmap[1],
});
const pickAt = (page, wx, wy) => page.evaluate(([x, y]) => { const d = asubject(x, y); return d.data.name + '#' + graph.nodes.indexOf(d); }, [wx, wy]);

async function enterCanvas(page) {
  const p = await page.evaluate(() => { const r = canvas.getBoundingClientRect(); return { x: r.left + 3, y: r.top + 3 }; });
  await page.mouse.move(p.x, p.y);
  return freeze(page);
}

async function observe(page, target, index) { // node names are not unique (HIV has duplicates): look up by index
  await page.waitForTimeout(1500); // allow async mouseup side effects (grid, NGL) to settle
  return page.evaluate(([t, idx]) => {
    const g = typeof gridArray !== 'undefined' && gridArray[0];
    let rows = null;
    try { rows = g.getSelectedRows().map((r) => g.getData().getItem(r)?.id ?? null); } catch { rows = null; }
    return {
      target: t,
      nodeSelected: node_selected ? node_selected.data.name : null,
      nodesSelections: nodes_selections.map((d) => d.data.name),
      lineSelected: !!line_selected,
      visited: graph.nodes[idx]?.data.visited ?? null,
      tableTab: current_grid,
      selectedRows: rows,
      objectPropertiesText: (document.getElementById('objectOptions')?.textContent ?? '').slice(0, 200),
    };
  }, [target, index]);
}

async function clickAt(page, f, wx, wy, target, index) {
  const s = toScreen(f, wx, wy);
  await page.mouse.move(s.x, s.y);
  await page.mouse.down();
  await page.mouse.up();
  return observe(page, target, index);
}

// ingredient (leaf, not on the membrane), deepest first, whose centre resolves to itself under the legacy hit-test
// Falls back to membrane (surface) ingredients when a recipe has no other kind; `notes` records that.
async function pickLeaf(page, f, exclude = [], notes = []) {
  for (const surfaceOk of [false, true]) {
    const inCanvas = (n) => n.x > 3 && n.y > 3 && n.x < f.bitmap[0] - 3 && n.y < f.bitmap[1] - 3; // the pointer must land on the canvas
    const leaves = f.nodes.filter((n) => n.leaf && inCanvas(n) && (surfaceOk || !n.surface) && !exclude.includes(n.i)).sort((a, b) => b.depth - a.depth);
    for (const n of leaves) {
      if ((await pickAt(page, n.x, n.y)) === n.name + '#' + n.i) {
        if (surfaceOk) notes.push(`No non-surface ingredient is pickable; used surface ingredient ${n.name}.`);
        return n;
      }
    }
  }
  return null;
}

async function gesturesFor(browser, recipe) {
  const out = {};
  const notes = [];
  { // click, then ctrlClick, in one session
    const { page } = await openRecipe(browser, recipe);
    let f = await enterCanvas(page);
    const first = await pickLeaf(page, f, [], notes);
    out.click = await clickAt(page, f, first.x, first.y, first.name, first.i);
    await page.keyboard.down('Control');
    await page.mouse.move(f.rect.left + 6, f.rect.top + 6); // legacy samples ctrlKey on mousemove (m:2966-2972)
    f = await freeze(page);
    const second = await pickLeaf(page, f, [first.i], notes);
    out.ctrlClick = await clickAt(page, f, second.x, second.y, second.name, second.i);
    await page.keyboard.up('Control');
    await page.close();
  }
  { // click inside a non-root compartment, not inside any node of its depth or deeper (its ingredients, sub-compartments, siblings)
    const { page } = await openRecipe(browser, recipe);
    const f = await enterCanvas(page);
    let best = null;
    for (const c of f.nodes.filter((n) => n.depth > 0 && !n.leaf)) {
      for (let dx = -c.r; dx <= c.r; dx += 4) {
        for (let dy = -c.r; dy <= c.r; dy += 4) {
          const dist = Math.hypot(dx, dy);
          if (dist > c.r - 6) continue;
          const px = c.x + dx, py = c.y + dy;
          if (px < 4 || py < 4 || px > f.bitmap[0] - 4 || py > f.bitmap[1] - 4) continue; // on the canvas only
          let clear = c.r - dist;
          for (const o of f.nodes) if (o.depth >= c.depth && o.i !== c.i) clear = Math.min(clear, Math.hypot(px - o.x, py - o.y) - o.r);
          if (clear > 0 && (!best || clear > best.clear)) best = { c, px, py, clear };
        }
      }
      if (best) break; // first compartment (BFS order) with such a point
    }
    if (best) {
      if ((await pickAt(page, best.px, best.py)) !== best.c.name + '#' + best.c.i) notes.push('clickInsideCompartment point did not resolve to the compartment under asubject().');
      out.clickInsideCompartment = await clickAt(page, f, best.px, best.py, best.c.name, best.c.i);
      out.clickInsideCompartment.world = [r3(best.px), r3(best.py)];
    } else { out.clickInsideCompartment = null; notes.push('No free point inside any compartment.'); }
    await page.close();
  }
  { // click on space outside every non-root node
    const { page } = await openRecipe(browser, recipe);
    const f = await enterCanvas(page);
    let best = null;
    for (let px = 4; px < f.bitmap[0] - 4; px += 4) {
      for (let py = 4; py < f.bitmap[1] - 4; py += 4) {
        let clear = Infinity;
        for (const o of f.nodes) if (o.depth > 0) clear = Math.min(clear, Math.hypot(px - o.x, py - o.y) - o.r);
        if (clear > 0 && (!best || clear > best.clear)) best = { px, py, clear };
      }
    }
    if (best) {
      out.clickEmpty = await clickAt(page, f, best.px, best.py, f.nodes[0].name, 0);
      out.clickEmpty.world = [r3(best.px), r3(best.py)];
    } else { out.clickEmpty = null; notes.push('No empty point on the canvas.'); }
    await page.close();
  }
  return { out, notes };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const legacyRef = execSync(`git -C ${repoRoot} rev-parse HEAD`).toString().trim();
  const browser = await chromium.launch();
  for (const { name, recipe } of RECIPES) {
    // session 1: screenshot, frames, static node data
    const { page, errors } = await openRecipe(browser, recipe);
    const canvasSize = await page.evaluate(() => ({ width: canvas.width, height: canvas.height }));
    await page.locator('#d3canvas').screenshot({ path: resolve(outDir, `legacy-${name}.png`) });
    const frame = await captureFrame(page, 1);
    const frameZoomed = await captureFrame(page, 2);
    const frameNotes = await frameState(page);
    const rotationText = await page.evaluate(() => rotationText.slice());
    const stat = await captureNodes(page);
    await page.close();
    // later sessions: gestures
    const g = await gesturesFor(browser, recipe);
    const fixture = {
      source: { recipe, legacyRef, d3: '4.13.0', canvas: canvasSize, viewport: [VIEWPORT.width, VIEWPORT.height] },
      rotationText,
      colorModes: stat.modes,
      nondeterministic: ['automatic'],
      nodes: stat.nodes,
      frameNotes,
      frame,
      frameZoomed,
      gestures: g.out,
      gestureNotes: [
        'Each gesture group runs in a fresh page load: click+ctrlClick together, then clickInsideCompartment, then clickEmpty.',
        'The simulation is stopped (simulation.stop()) right before reading node positions and aiming; mouseup side effects were read 1500 ms later.',
        'tableTab is current_grid (0 = Recipe table, 1 = Interaction table); selectedRows are item ids of gridArray[0].getSelectedRows().',
        'objectPropertiesText is the textContent of #objectOptions (the Object Properties panel; its Golden Layout tab is not the active one).',
        ...g.notes,
      ].join(' '),
    };
    if (errors.length) console.log(`${name}: ${errors.length} page errors (first: ${errors[0].slice(0, 100)})`);
    console.log(`${name}: ${stat.nodes.length} nodes, size restored ${stat.sizeRestored}`);
    writeFileSync(resolve(outDir, `${name}.json`), JSON.stringify(fixture, (k, v) => r3(v), 1) + '\n');
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
