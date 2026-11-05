/*
 * The mockups' shared shell (README §5): one command registry (menus, palette, toolbars read it), one Focus (what
 * the person points at, shared by every view), the views drawn from the real recipes in sample-data.js.
 * A page calls Mock.render({...}) with its screen's state. Static: no network, no build.
 */
;(function () {
  const S = window.MESO_SAMPLE
  const root = document.documentElement
  root.dataset.theme = new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light'

  const SCREENS = [
    ['index.html', 'Index'],
    ['01-shell.html', '1 Shell'],
    ['02-build.html', '2 Build'],
    ['03-curate.html', '3 Curate'],
    ['04-ingredient.html', '4 Ingredient'],
    ['05-scene.html', '5 Scene'],
    ['06-structure.html', '6 Find a structure'],
    ['07-open.html', '7 Open and import'],
    ['08-first-run.html', '8 First run'],
    ['09-palette.html', '9 Commands'],
  ]

  // ---- tiny DOM helper ------------------------------------------------------------------------------------------
  function h(tag, attrs, ...kids) {
    const el = tag.startsWith('svg:') ? document.createElementNS('http://www.w3.org/2000/svg', tag.slice(4)) : document.createElement(tag)
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
      else if (k === 'html') el.innerHTML = v
      else el.setAttribute(k, v === true ? '' : v)
    }
    for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k.nodeType ? k : String(k))
    return el
  }
  const svg = (tag, attrs, ...kids) => h('svg:' + tag, attrs, ...kids)
  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim()
  function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647) }

  // ---- the recipe model (from sample-data.js) -------------------------------------------------------------------
  let R = null
  function useRecipe(key) {
    if (!key) { R = null; return }
    const d = S[key]
    const byId = new Map(d.nodes.map((n) => [n.id, n]))
    const kids = new Map()
    for (const n of d.nodes) if (n.parent) (kids.get(n.parent) || kids.set(n.parent, []).get(n.parent)).push(n)
    const lay = new Map(d.layout.map((l) => [l.id, l]))
    const ings = d.nodes.filter((n) => n.kind === 'ingredient')
    const comps = d.nodes.filter((n) => n.kind === 'compartment')
    R = { key, d, byId, kids, lay, ings, comps, root: d.nodes[0], file: d.file }
  }
  const byName = (name) => R && R.d.nodes.find((n) => n.name === name)
  const parentOf = (n) => (n && n.parent ? R.byId.get(n.parent) : null)
  /** A name is shown alone unless another ingredient has it too: then the compartment follows (README §5.3). */
  const shown = (n) => {
    if (!R || n.kind !== 'ingredient') return n.name
    if (!R.dups) { const c = new Map(); for (const i of R.ings) c.set(i.name, (c.get(i.name) || 0) + 1); R.dups = c }
    const p = parentOf(n)
    return R.dups.get(n.name) > 1 && p ? `${n.name} · ${p.name}` : n.name
  }
  const isPdbId = (s) => /^[0-9][a-z0-9]{3}$/i.test(s)

  /** What is missing or doubtful on an ingredient: the same list everywhere (tree flag, table, inspector). */
  function problems(n) {
    if (!n || n.kind !== 'ingredient') return []
    const p = []
    if (!n.pdb) p.push({ level: 'danger', text: 'No structure', fix: 'structure.find' })
    if (!n.count && !n.molarity) p.push({ level: 'warning', text: 'No amount: count and molarity are 0', fix: 'focus.amount' })
    if (!n.uniprot) p.push({ level: 'warning', text: 'No UniProt accession', fix: 'structure.find' })
    if (n.side === 'surface' && n.pcpalAxis.every((v) => !v)) p.push({ level: 'warning', text: 'No principal axis: its orientation on the membrane is undefined', fix: 'structure.orient' })
    // As the app resolves structures (web/src/domain/pdb/structureSource.ts): a .pdb/.cif/.mrc name is a file from the
    // cellPACK_data repository; any other name is sent to the PDB as an id, so one that is not an id will not load.
    if (n.pdb && /\.(pdb|cif|mrc)$/i.test(n.pdb)) p.push({ level: 'info', text: `File "${n.pdb}", from the cellPACK_data repository`, fix: 'recipe.dataDirectory' })
    else if (n.pdb && !isPdbId(n.pdb)) p.push({ level: 'warning', text: `"${n.pdb}" is not a PDB id: it will not load`, fix: 'structure.find' })
    return p
  }
  const flagged = (n) => problems(n).some((p) => p.level !== 'info')

  // ---- the Focus -----------------------------------------------------------------------------------------------
  const state = { focus: [], views: ['recipe'], split: 'rows', column: 'recipe', filter: 'all', card: null, editMode: false }
  const listeners = []
  function setFocus(ids, additive) {
    if (additive) {
      const set = new Set(state.focus)
      for (const id of ids) set.has(id) ? set.delete(id) : set.add(id)
      state.focus = [...set]
    } else state.focus = ids
    listeners.forEach((f) => f())
  }
  const focused = () => state.focus.map((id) => R && R.byId.get(id)).filter(Boolean)
  const pick = (n) => (e) => { e.stopPropagation(); setFocus([n.id], e.shiftKey || e.metaKey || e.ctrlKey) }

  // ---- commands: the one registry (README §5.3) -----------------------------------------------------------------
  const NOT_BUILT = (what) => () => `Not built yet: ${what}`
  const needIngredient = () => (focused().some((n) => n.kind === 'ingredient') ? true : 'Point at an ingredient first')
  const EXAMPLES = [
    ['HIV mature', '26 ingredients · 3 compartments', 'HIV_serialized.json'],
    ['HIV immature', '13 ingredients', 'HIV_immature.json'],
    ['HIV mature and Blood plasma', '46 ingredients · 1 fiber', 'BloodPlasmaHIV_serialized.json'],
    ['HIV immature and Blood plasma', '32 ingredients', 'HIV_immature_blood.json'],
    ['Influenza envelope', '3 ingredients · 1 compartment', 'InfluenzaA.json'],
    ['Influenza complete', '5 ingredients', 'InfluenzaFull.json'],
    ['Exosome', '47 ingredients · 2 fibers', 'exosome_catalase.json'],
    ['Mycoplasma pneumoniae', '180 ingredients · 1 compartment · 3 fibers', 'Mpn_1.0_2.json'],
    ['Blood plasma', '21 ingredients · 1 fiber', 'BloodPlasma_serialized.json'],
  ]
  const C = []
  const cmd = (id, title, cat, more = {}) => C.push({ id, title, cat, ...more })
  cmd('recipe.new', 'New empty recipe', 'Recipe', { key: '⌘N' })
  cmd('recipe.open', 'Open a recipe…', 'Recipe', { key: '⌘O', go: '07-open.html', hint: '.json, _serialized.json, .csv; .xlsx and .zip later' })
  for (const [t, m] of EXAMPLES) cmd('recipe.example', `Open example: ${t}`, 'Recipe', { hint: m, go: t === 'HIV mature' ? '02-build.html' : t.startsWith('Myco') ? '03-curate.html' : null })
  cmd('recipe.example', 'Open example: Mycoplasma genitalium (auto, curated)', 'Recipe', { when: NOT_BUILT('.zip import; MG_*.zip is not in data/') })
  cmd('recipe.example', 'Open example: YASARA PetWorld (SARS-CoV-2, HIV, synapse vesicle, presynapse)', 'Recipe', { when: NOT_BUILT('whole-model loading in the Scene view') })
  cmd('recipe.append', 'Append a recipe…', 'Recipe', { hint: 'merge another recipe into this one', go: '07-open.html' })
  cmd('recipe.importPalette', 'Import a colour palette…', 'Recipe')
  cmd('recipe.importMolarity', 'Import counts and molarities…', 'Recipe')
  cmd('recipe.importMapping', 'Import a colour mapping…', 'Recipe', { when: NOT_BUILT('colouring by property') })
  cmd('recipe.dataDirectory', 'Set the data directory (PDB, geometries)…', 'Recipe', { when: NOT_BUILT('a local data server') })
  cmd('recipe.export.cellpack', 'Export for cellPACK / cellPAINT (.json)', 'Recipe', { key: '⌘S' })
  cmd('recipe.export.gpu', 'Export for cellPACK-gpu (_serialized.json)', 'Recipe', { key: '⇧⌘S' })
  cmd('recipe.export.csv', 'Export as a spreadsheet (.csv)', 'Recipe')
  cmd('recipe.export.palette', 'Export the colour palette', 'Recipe')
  cmd('recipe.export.molarity', 'Export counts and molarities', 'Recipe')
  cmd('recipe.export.mapping', 'Export the colour mapping', 'Recipe', { when: NOT_BUILT('colouring by property') })
  cmd('recipe.export.paintZip', 'Export for cellPAINT with sprites (.zip)', 'Recipe', { when: NOT_BUILT('sprite export') })
  cmd('llm.copySkill', 'Copy the LLM recipe skill', 'Recipe', { hint: 'paste it into your LLM, with the subject' })
  cmd('llm.openSkills', 'Open SKILLS.md', 'Recipe')
  cmd('llm.paste', 'Load a recipe from an LLM (paste JSON)…', 'Recipe', { go: '07-open.html' })
  cmd('edit.undo', 'Undo', 'Edit', { key: '⌘Z' })
  cmd('edit.redo', 'Redo', 'Edit', { key: '⇧⌘Z' })
  cmd('edit.addIngredient', 'Add an ingredient', 'Edit', { key: 'A' })
  cmd('edit.addCompartment', 'Add a compartment', 'Edit')
  cmd('edit.addInteraction', 'Add an interaction between the two ingredients', 'Edit', { when: () => (focused().filter((n) => n.kind === 'ingredient').length === 2 ? true : 'Point at two ingredients (⇧-click the second)') })
  cmd('edit.rename', 'Rename', 'Edit', { key: 'F2', when: () => (focused().length === 1 ? true : 'Point at one thing') })
  cmd('edit.color', 'Set colour…', 'Edit', { when: () => (focused().length ? true : 'Point at something first') })
  cmd('edit.delete', 'Delete', 'Edit', { key: '⌫', when: () => (focused().length && !focused().includes(R && R.root) ? true : 'Point at an ingredient or a compartment') })
  cmd('edit.layout', 'Edit layout: drag to move and reparent', 'Edit', { key: 'E', toggle: () => state.editMode })
  cmd('view.recipe', 'Show the Recipe view', 'View', { key: '1', view: 'recipe' })
  cmd('view.table', 'Show the Table', 'View', { key: '2', view: 'table' })
  cmd('view.ingredient', 'Show the Ingredient view (3D)', 'View', { key: '3', view: 'ingredient' })
  cmd('view.scene', 'Show the Scene view (3D, whole model)', 'View', { key: '4', view: 'scene' })
  cmd('view.arrangement', 'Arrangement: Build (Recipe view over the Table)', 'View', { go: '02-build.html' })
  cmd('view.arrangement', 'Arrangement: Curate (Table beside the Ingredient view)', 'View', { go: '03-curate.html' })
  cmd('view.arrangement', 'Arrangement: Overview (Recipe view beside the Ingredient view)', 'View', { go: '01-shell.html' })
  cmd('view.interactions', 'Show interactions', 'View', { hint: 'the Interactions tab of the column' })
  cmd('view.sequence', 'Show sequence features', 'View', { hint: 'the band over the Ingredient view' })
  cmd('view.legend', 'Show the legend', 'View')
  cmd('view.theme', 'Switch light / dark theme', 'View', { key: '⌥⌘T' })
  cmd('view.resetLayout', 'Reset the layout', 'View')
  cmd('focus.clear', 'Clear the Focus', 'Focus', { key: 'Esc' })
  cmd('focus.frame', 'Frame the Focus in every view', 'Focus', { key: 'F' })
  cmd('focus.parent', 'Point at the parent compartment', 'Focus', { key: '⌥↑' })
  cmd('focus.problems', 'Go to the next problem', 'Focus', { key: '⌘\'' })
  cmd('focus.amount', 'Set count or molarity', 'Focus', { when: needIngredient })
  cmd('structure.find', 'Find a structure (PDB, UniProt, AlphaFold)…', 'Structure', { key: '⌘F', go: '06-structure.html', when: needIngredient })
  cmd('structure.open', 'Open in the Ingredient view', 'Structure', { go: '04-ingredient.html', when: needIngredient })
  cmd('structure.orient', 'Orient in the membrane (from OPM)', 'Structure', { when: needIngredient, hint: 'surface ingredients' })
  cmd('structure.beads', 'Build beads (levels of detail)…', 'Structure', { when: needIngredient })
  cmd('structure.fiber', 'Build a fiber from chains', 'Structure', { when: needIngredient })
  cmd('structure.sprite', 'Capture the sprite from the view', 'Structure', { when: needIngredient })
  cmd('help.shortcuts', 'Keyboard shortcuts', 'Help', { key: '?' })
  cmd('help.docs', 'Documentation', 'Help')
  cmd('help.about', 'About, FAQ and contact', 'Help')
  cmd('help.settings', 'Settings', 'Help', { key: '⌘,' })
  const enabled = (c) => (c.when ? c.when() : true)

  function run(c) {
    const ok = enabled(c)
    if (ok !== true) return
    if (c.view) { state.views = [c.view]; renderStage(); return }
    if (c.id === 'view.theme') { toggleTheme(); return }
    if (c.id === 'focus.clear') { setFocus([]); return }
    if (c.id === 'edit.layout') { state.editMode = !state.editMode; renderStage(); return }
    if (c.go) location.href = c.go + location.search
  }
  function toggleTheme() {
    const dark = root.dataset.theme !== 'dark'
    const u = new URL(location.href)
    dark ? u.searchParams.set('theme', 'dark') : u.searchParams.delete('theme')
    history.replaceState(null, '', u)
    root.dataset.theme = dark ? 'dark' : 'light'
    renderAll()
  }

  // ---- menus (built from the registry) --------------------------------------------------------------------------
  const MENUS = {
    Recipe: [['', ['recipe.new', 'recipe.open', 'recipe.append']], ['Examples', ['recipe.example']], ['Import', ['recipe.importPalette', 'recipe.importMolarity', 'recipe.importMapping', 'recipe.dataDirectory']], ['Export', ['recipe.export.cellpack', 'recipe.export.gpu', 'recipe.export.csv', 'recipe.export.palette', 'recipe.export.molarity', 'recipe.export.mapping', 'recipe.export.paintZip']], ['With an LLM', ['llm.copySkill', 'llm.openSkills', 'llm.paste']]],
    Edit: [['', ['edit.undo', 'edit.redo']], ['', ['edit.addIngredient', 'edit.addCompartment', 'edit.addInteraction']], ['', ['edit.rename', 'edit.color', 'edit.delete', 'edit.layout']]],
    View: [['Stage', ['view.recipe', 'view.table', 'view.ingredient', 'view.scene']], ['Arrangements', ['view.arrangement']], ['', ['view.interactions', 'view.sequence', 'view.legend', 'view.theme', 'view.resetLayout']], ['Focus', ['focus.clear', 'focus.frame', 'focus.parent', 'focus.problems']]],
    Structure: [['', ['structure.find', 'structure.open', 'structure.orient', 'structure.beads', 'structure.fiber', 'structure.sprite']]],
    Help: [['', ['help.shortcuts', 'help.docs', 'help.about', 'help.settings']]],
  }
  function commandRow(c, cls = 'row') {
    const ok = enabled(c)
    return h('div', { class: cls, role: 'menuitem', 'aria-disabled': ok === true ? null : 'true', title: ok === true ? c.hint || null : ok, onclick: () => run(c) },
      h('span', { class: 'title' }, c.title + (c.toggle && c.toggle() ? '  ✓' : '')),
      h('span', { class: 'end' }, ok === true ? c.key || '' : ok))
  }
  let openMenu = null
  function showMenu(name, button) {
    closeMenu()
    const box = h('div', { class: 'dropdown', role: 'menu' })
    MENUS[name].forEach(([head, ids], i) => {
      if (i) box.append(h('div', { class: 'sep' }))
      if (head) box.append(h('div', { class: 'head' }, head))
      for (const id of ids) for (const c of C.filter((c) => c.id === id)) box.append(commandRow(c))
    })
    const r = button.getBoundingClientRect()
    Object.assign(box.style, { left: r.left + 'px', top: r.bottom + 4 + 'px' })
    document.body.append(box)
    button.setAttribute('aria-expanded', 'true')
    openMenu = { box, button }
  }
  function closeMenu() { if (openMenu) { openMenu.box.remove(); openMenu.button.setAttribute('aria-expanded', 'false'); openMenu = null } }
  document.addEventListener('click', (e) => { if (openMenu && !openMenu.box.contains(e.target) && e.target !== openMenu.button) closeMenu() })

  // ---- the command palette (README §5.3) ------------------------------------------------------------------------
  let palette = null
  function openPalette(query = '') {
    if (palette) return
    const input = h('input', { 'aria-label': 'Search commands and ingredients', placeholder: 'Run a command, or go to an ingredient…', value: query, role: 'combobox', 'aria-expanded': 'true' })
    const list = h('div', { class: 'list', role: 'listbox' })
    const f = focused()
    const focusChip = f.length ? h('span', { class: 'pill' }, f.length === 1 ? shown(f[0]) : `${f.length} items`) : null
    const box = h('div', { class: 'palette', role: 'dialog', 'aria-label': 'Commands' },
      h('div', { class: 'input-row' }, h('span', { class: 'muted' }, '⌘K'), input, focusChip),
      list,
      h('div', { class: 'foot' }, h('span', {}, '↑↓ move'), h('span', {}, '↵ run'), h('span', {}, 'Esc close'), h('span', { style: 'margin-left:auto' }, f.length ? 'Commands act on the Focus' : 'Nothing in Focus')))
    const scrim = h('div', { class: 'scrim', onclick: (e) => { if (e.target === scrim) closePalette() } }, box)
    document.body.append(scrim)
    palette = { scrim, input, list, sel: 0 }
    const fill = () => {
      const q = input.value.trim().toLowerCase()
      list.textContent = ''
      const match = (t) => !q || q.split(/\s+/).every((w) => t.toLowerCase().includes(w))
      const mark = (t) => {
        if (!q) return t
        const w = q.split(/\s+/)[0]
        const i = t.toLowerCase().indexOf(w)
        return i < 0 ? t : [t.slice(0, i), h('mark', {}, t.slice(i, i + w.length)), t.slice(i + w.length)]
      }
      let rows = 0
      const cats = ['Recipe', 'Edit', 'View', 'Focus', 'Structure', 'Help']
      if (!q) list.append(h('div', { class: 'head' }, 'Recent'), ...['structure.find', 'recipe.export.gpu', 'view.table'].map((id) => commandRow(C.find((c) => c.id === id))))
      for (const cat of cats) {
        const cs = C.filter((c) => c.cat === cat && match(c.title + ' ' + (c.hint || '') + ' ' + c.id))
        if (!cs.length || (!q && cat !== 'Recipe')) continue
        list.append(h('div', { class: 'head' }, cat))
        for (const c of cs) {
          const ok = enabled(c)
          list.append(h('div', { class: 'row', role: 'option', 'aria-selected': rows++ === palette.sel ? 'true' : 'false', 'aria-disabled': ok === true ? null : 'true', onclick: () => run(c) },
            h('span', { class: 'title' }, mark(c.title)), h('span', { class: 'end' }, ok === true ? (c.hint ? c.hint + '  ' : '') + (c.key || '') : ok)))
        }
      }
      if (R && q) {
        const hits = R.ings.filter((n) => match(n.name + ' ' + n.pdb + ' ' + n.label)).slice(0, 6)
        if (hits.length) list.append(h('div', { class: 'head' }, 'Go to'), ...hits.map((n) => h('div', { class: 'row', role: 'option', onclick: () => { closePalette(); setFocus([n.id]) } },
          h('span', { class: 'swatch' }), h('span', { class: 'title' }, mark(n.name)), h('span', { class: 'end mono' }, `${n.pdb || 'no structure'} · ${n.side} of ${parentOf(n).name}`))))
      }
    }
    input.addEventListener('input', () => { palette.sel = 0; fill() })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { palette.sel++; fill(); e.preventDefault() }
      if (e.key === 'ArrowUp') { palette.sel = Math.max(0, palette.sel - 1); fill(); e.preventDefault() }
      if (e.key === 'Enter') list.querySelector('[aria-selected="true"]')?.click()
    })
    fill()
    input.focus()
  }
  function closePalette() { if (palette) { palette.scrim.remove(); palette = null } }
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette ? closePalette() : openPalette() }
    else if (e.key === 'Escape') { if (palette) closePalette(); else if (openMenu) closeMenu(); else if (state.card) { state.card = null; renderInspector() } else setFocus([]) }
  })

  // ---- chrome: review strip, top bar, status bar ----------------------------------------------------------------
  function reviewStrip(caption) {
    const here = location.pathname.split('/').pop()
    return h('nav', { class: 'review-strip', 'aria-label': 'Mockup screens' },
      h('strong', {}, 'Mockups'),
      SCREENS.map(([f, t]) => h('a', { href: f + location.search, 'aria-current': f === here ? 'page' : null }, t)),
      h('span', { class: 'caption' }, caption || ''),
      h('button', { onclick: toggleTheme, 'aria-label': 'Switch theme' }, root.dataset.theme === 'dark' ? 'Light' : 'Dark'))
  }
  function logo() {
    return svg('svg', { width: 22, height: 22, viewBox: '0 0 22 22', 'aria-hidden': 'true' },
      svg('circle', { cx: 11, cy: 11, r: 10, fill: 'none', stroke: css('--color-text'), 'stroke-width': 1.5 }),
      svg('circle', { cx: 8, cy: 9, r: 4, fill: css('--color-depth-3') }),
      svg('circle', { cx: 14.5, cy: 13, r: 3, fill: css('--color-depth-2') }),
      svg('circle', { cx: 9, cy: 15.5, r: 2, fill: css('--color-depth-5') }))
  }
  function topbar() {
    const nc = R ? R.comps.length - 1 : 0
    const meta = R ? `${R.ings.length} ingredients · ${nc} compartment${nc === 1 ? '' : 's'} · ${R.file}` : 'no recipe'
    return h('header', { class: 'topbar' },
      h('div', { class: 'brand' }, logo(), 'Mesoscope'),
      h('nav', { class: 'menus', 'aria-label': 'Menus' }, Object.keys(MENUS).map((m) => h('button', { class: 'menu-button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: (e) => (openMenu && openMenu.button === e.currentTarget ? closeMenu() : showMenu(m, e.currentTarget)) }, m))),
      R ? h('div', { class: 'recipe-title' }, h('span', { class: 'name' }, R.root.name), h('span', { class: 'dirty', title: 'Unsaved changes' }), h('span', { class: 'meta' }, meta)) : null,
      h('span', { class: 'spacer' }),
      h('button', { class: 'search-field', onclick: () => openPalette(), 'aria-label': 'Search or run a command' }, '⌕  Search or run a command', h('kbd', {}, '⌘K')),
      h('button', { class: 'icon-button', onclick: toggleTheme, 'aria-label': 'Switch theme', title: 'Switch light / dark theme (⌥⌘T)' }, root.dataset.theme === 'dark' ? '☀' : '☾'),
      h('button', { class: 'icon-button', 'aria-label': 'Help', title: 'Help and shortcuts (?)' }, '?'))
  }
  let statusEl
  function renderStatus() {
    if (!statusEl) return
    const f = focused()
    statusEl.replaceChildren(...[
      h('span', { class: 'focus-label' }, 'Focus'),
      f.length ? f.map((n) => h('span', { class: 'pill' }, shown(n), h('button', { 'aria-label': `Remove ${shown(n)} from the Focus`, onclick: () => setFocus([n.id], true) }, '×'))) : h('span', { class: 'subtle' }, 'nothing: click anything in any view; ⇧-click adds'),
      f.length ? h('button', { class: 'button link', onclick: () => setFocus([]) }, 'Clear') : null,
      h('span', { class: 'msg' }, R ? `Loaded ${R.file} · ${R.ings.filter(flagged).length} ingredients need attention` : 'Ready'),
      h('kbd', {}, '⌘K')].flat().filter(Boolean))
  }

  // ---- the column: the recipe outline (README §5.1) --------------------------------------------------------------
  let columnEl
  function renderColumn() {
    if (!columnEl) return
    const nProblems = R.ings.filter(flagged).length
    const filters = [['all', 'All'], ['problems', `Needs attention ${nProblems}`], ['surface', 'Surface'], ['interior', 'Interior'], ['fiber', 'Fibers']]
    const show = (n) => state.filter === 'all' || (state.filter === 'problems' ? flagged(n) : state.filter === 'fiber' ? n.ingtype === 'fiber' : n.side === state.filter)
    const tree = h('div', { class: 'tree', role: 'tree', 'aria-label': 'Recipe outline' })
    const walk = (c, depth) => {
      const kids = R.kids.get(c.id) || []
      tree.append(h('div', { class: 'node compartment', role: 'treeitem', 'aria-level': depth + 1, 'aria-expanded': 'true', 'aria-selected': state.focus.includes(c.id) ? 'true' : 'false', style: `padding-left:${4 + depth * 12}px`, onclick: pick(c) },
        h('span', { class: 'twisty' }, '▾'), h('span', { class: 'swatch square', style: `background:${css('--color-depth-' + Math.min(7, depth))}` }),
        h('span', { class: 'label' }, c.name), h('span', { class: 'end' }, (kids.filter((k) => k.kind === 'ingredient').length) || '')))
      for (const side of ['surface', 'interior']) {
        const ings = kids.filter((k) => k.kind === 'ingredient' && k.side === side && show(k))
        if (!ings.length) continue
        tree.append(h('div', { class: 'node group', style: `padding-left:${22 + depth * 12}px` }, h('span', { class: 'label' }, side), h('span', { class: 'end' }, ings.length)))
        for (const n of ings) {
          const p = problems(n).filter((x) => x.level !== 'info')
          tree.append(h('div', { class: 'node', role: 'treeitem', 'aria-level': depth + 2, 'aria-selected': state.focus.includes(n.id) ? 'true' : 'false', style: `padding-left:${26 + depth * 12}px`, onclick: pick(n), title: p.map((x) => x.text).join('\n') || null },
            h('span', { class: 'swatch', style: `background:${n.color ? `rgb(${n.color.map((v) => v * 255).join(',')})` : css('--color-depth-' + Math.min(7, depth + 1))}` }),
            h('span', { class: 'label' }, n.name),
            h('span', { class: 'end' }, h('span', { class: 'mono' }, n.count || ''), p.length ? h('span', { class: 'flag' + (p.some((x) => x.level === 'danger') ? ' danger' : '') }, '●') : null)))
        }
      }
      for (const k of kids.filter((k) => k.kind === 'compartment')) walk(k, depth + 1)
    }
    walk(R.root, 0)
    columnEl.replaceChildren(
      h('div', { class: 'tabs', role: 'tablist' },
        h('button', { class: 'tab', role: 'tab', 'aria-selected': 'true' }, 'Recipe', h('span', { class: 'count' }, R.ings.length)),
        h('button', { class: 'tab', role: 'tab', 'aria-selected': 'false', title: 'Interactions between ingredients' }, 'Interactions', h('span', { class: 'count' }, R.ings.reduce((s, n) => s + n.partners, 0)))),
      h('div', { class: 'filter' },
        h('input', { class: 'input', placeholder: 'Filter by name, PDB, UniProt…', 'aria-label': 'Filter the outline' }),
        h('div', { class: 'chips' }, filters.map(([k, t]) => h('button', { class: 'chip' + (k === 'problems' ? ' warn' : ''), 'aria-pressed': state.filter === k ? 'true' : 'false', onclick: () => { state.filter = k; renderColumn() } }, t)))),
      tree)
  }

  // ---- views ----------------------------------------------------------------------------------------------------
  const VIEWS = { recipe: 'Recipe view', table: 'Table', ingredient: 'Ingredient', scene: 'Scene' }
  let stageEl
  function renderStage() {
    if (!stageEl) return
    const head = h('div', { class: 'stage-head' },
      h('div', { role: 'tablist', 'aria-label': 'Stage views', style: 'display:flex;gap:16px' },
        Object.entries(VIEWS).map(([k, t], i) => h('button', { class: 'tab', role: 'tab', 'aria-selected': state.views.includes(k) ? 'true' : 'false', title: `${t} (${i + 1})`, onclick: (e) => {
          if (e.shiftKey || e.metaKey) state.views = state.views.includes(k) ? state.views.filter((v) => v !== k) : [state.views[0], k]
          else state.views = [k]
          renderStage()
        } }, t))),
      h('span', { class: 'end' },
        h('span', { class: 'subtle' }, '⇧-click a view to split'),
        h('div', { class: 'segmented', role: 'group', 'aria-label': 'Split direction' },
          h('button', { 'aria-pressed': state.split === 'rows' ? 'true' : 'false', onclick: () => { state.split = 'rows'; renderStage() }, title: 'One over the other' }, '☰'),
          h('button', { 'aria-pressed': state.split === 'cols' ? 'true' : 'false', onclick: () => { state.split = 'cols'; renderStage() }, title: 'Side by side' }, '◫'))))
    const views = h('div', { class: 'views ' + state.split })
    for (const v of state.views) views.append(VIEW_RENDER[v]())
    stageEl.replaceChildren(head, views)
    if (state.page) stageEl.append(state.page())
  }

  function recipeView() {
    const [w, hgt] = R.d.size
    const box = svg('svg', { viewBox: `-10 -10 ${w + 20} ${hgt + 20}`, role: 'img', 'aria-label': `Recipe view of ${R.root.name}: compartments as nested circles, ingredients inside or on their membrane` })
    const defs = svg('defs')
    box.append(defs)
    const nodes = R.d.layout.map((l) => ({ l, n: R.byId.get(l.id) })).sort((a, b) => a.l.depth - b.l.depth)
    const fx = state.focus
    for (const { l, n } of nodes) {
      if (n.kind !== 'compartment' || l.depth === 0) continue
      const fill = css('--color-depth-' + Math.min(7, l.depth)), stroke = css('--color-depth-' + Math.min(7, l.depth + 1))
      const sel = fx.includes(n.id)
      box.append(svg('circle', { class: 'rv-compartment' + (sel ? ' rv-selected' : ''), cx: l.x, cy: l.y, r: l.r + 5, fill, stroke, onclick: pick(n) }),
        svg('circle', { cx: l.x, cy: l.y, r: l.r - 5, fill: 'none', stroke: sel ? css('--color-select') : stroke, 'pointer-events': 'none' }))
      const pid = 'arc-' + n.id
      defs.append(svg('path', { id: pid, d: `M ${l.x - l.r - 9} ${l.y} a ${l.r + 9} ${l.r + 9} 0 1 1 ${2 * (l.r + 9)} 0` }))
      box.append(svg('text', { class: 'rv-label' }, svg('textPath', { href: '#' + pid, startOffset: ['24%', '8%', '58%', '40%'][l.depth % 4] }, n.name.replace(/ and /g, ' & '))))
    }
    for (const { l, n } of nodes) {
      if (n.kind !== 'ingredient') continue
      const sel = fx.includes(n.id)
      const fill = n.color ? `rgb(${n.color.map((v) => Math.round(v * 255)).join(',')})` : css('--color-depth-' + Math.min(7, l.depth))
      box.append(svg('circle', { class: 'rv-ingredient' + (sel ? ' rv-selected' : ''), cx: l.x, cy: l.y, r: l.r, fill, stroke: css('--color-depth-' + Math.min(7, l.depth + 1)), onclick: pick(n) }, svg('title', {}, `${n.name} · ${n.pdb || 'no structure'}`)))
      if (n.side === 'surface' && l.angle != null) {
        const tx = -Math.sin(l.angle), ty = Math.cos(l.angle)
        box.append(svg('line', { class: 'rv-membrane-mark', x1: l.x - tx * l.r * 0.8, y1: l.y - ty * l.r * 0.8, x2: l.x + tx * l.r * 0.8, y2: l.y + ty * l.r * 0.8, 'pointer-events': 'none' }))
      }
      if (sel) box.append(svg('text', { class: 'rv-ing-label', x: l.x, y: l.y + l.r + 12, 'text-anchor': 'middle' }, n.name))
    }
    box.append(svg('text', { class: 'rv-root-label', x: 0, y: hgt + 4 }, R.root.name + '*'))
    if (state.editMode) box.append(svg('text', { class: 'rv-ing-label', x: w, y: 10, 'text-anchor': 'end', 'font-size': 12 }, 'Edit layout: drag to move or reparent'))
    const n = state.focus.length
    return h('section', { class: 'view recipe', 'aria-label': 'Recipe view' }, box,
      h('div', { class: 'glass toolbar', role: 'toolbar', 'aria-label': 'Recipe view options' },
        tool('Colour', 'by depth'), tool('Size', 'by radius'), tool('Label', 'name'), tool('Group', 'none'), sep(),
        h('button', { class: 'tool', 'aria-pressed': state.editMode ? 'true' : 'false', onclick: () => run(C.find((c) => c.id === 'edit.layout')), title: 'Edit layout (E)' }, '✥ Edit'),
        h('button', { class: 'tool', title: n === 2 ? 'Add an interaction between the two ingredients' : 'Point at two ingredients (⇧-click the second)', 'aria-disabled': n === 2 ? null : 'true' }, '⟷ Interaction', n === 2 ? null : h('span', { class: 'k' }, ' needs two')),
        sep(), h('button', { class: 'tool', title: 'Forces, stroke width, sprites, legend' }, '⋯ More'), h('button', { class: 'tool', title: 'Frame the Focus (F)' }, '⤢')),
      h('div', { class: 'glass legend', 'aria-label': 'Legend' }, h('strong', {}, 'Colour by depth'), [1, 2, 3, 4].map((d) => h('span', { style: 'display:flex;gap:6px;align-items:center' }, h('span', { class: 'swatch square', style: `background:${css('--color-depth-' + d)}` }), `depth ${d}`))))
  }
  const tool = (k, v) => h('button', { class: 'tool', 'aria-haspopup': 'menu' }, h('span', { class: 'k' }, k), v, ' ▾')
  const sep = () => h('span', { class: 'sep' })

  function tableView() {
    const rows = [...R.ings]
    if (R.key === 'mpn') rows.sort((a, b) => b.count - a.count)
    const cell = (v, cls = '') => h('td', { class: cls + (v === '' || v === 0 || v == null ? ' empty' : '') }, v === '' || v == null ? '—' : v)
    const body = h('tbody')
    for (const n of rows) {
      const p = problems(n)
      body.append(h('tr', { 'aria-selected': state.focus.includes(n.id) ? 'true' : 'false', onclick: pick(n) },
        h('td', { title: p.map((x) => x.text).join('\n') }, p.some((x) => x.level === 'danger') ? h('span', { class: 'flag danger' }, '●') : flagged(n) ? h('span', { class: 'flag' }, '●') : ''),
        h('td', {}, n.name), h('td', { class: 'muted' }, parentOf(n).name), h('td', { class: 'muted' }, n.side),
        cell(n.count, 'num mono' + (!n.count && !n.molarity ? ' warn' : '')), cell(n.molarity, 'num mono'), cell(n.mw, 'num mono'),
        cell(n.pdb, 'mono' + (n.pdb && !isPdbId(n.pdb) ? ' muted' : '')), cell(n.uniprot, 'mono'), h('td', { class: 'muted' }, n.ingtype), cell(n.beads || '', 'num mono')))
    }
    const cols = [['', ''], ['Name', ''], ['Compartment', ''], ['Where', ''], ['Count', 'num'], ['Molarity (M)', 'num'], ['MW (kDa)', 'num'], ['PDB', ''], ['UniProt', ''], ['Type', ''], ['Beads', 'num']]
    return h('section', { class: 'view', 'aria-label': 'Table' },
      h('div', { class: 'table-wrap' }, h('table', { class: 'grid', role: 'grid', 'aria-rowcount': rows.length }, h('thead', {}, h('tr', {}, cols.map(([t, c]) => h('th', { class: c }, t)))), body)))
  }

  function ingredientView() {
    const n = focused().find((x) => x.kind === 'ingredient') || R.ings[0]
    const W = 760, H = 560
    const box = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Ingredient view of ${n.name}: its beads, and its membrane when it sits on one` })
    const rgbText = css('--color-text')
    let beads = []
    if (n.beadsXYZ && n.beadsR) {
      for (let i = 0; i < n.beadsR.length; i++) beads.push({ x: n.beadsXYZ[i * 3], y: n.beadsXYZ[i * 3 + 1], z: n.beadsXYZ[i * 3 + 2], r: n.beadsR[i] })
    } else {
      const r = rng(n.name.length * 97 + 7)
      for (let i = 0; i < 40; i++) beads.push({ x: (r() - 0.5) * 60, y: (r() - 0.5) * 80, z: r() * 40, r: 6 + r() * 6 })
    }
    const xs = beads.map((b) => b.x), ys = beads.map((b) => b.y)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 40
    const k = Math.min(W, H) * 0.62 / span
    const X = (x) => W / 2 + (x - cx) * k, Y = (y) => H / 2 + 20 - (y - cy) * k
    if (n.side === 'surface') {
      // Membrane: a gray band with its two faces (Stories Untold membrane-orientation: outer red, inner blue).
      const my = Y(cy - 10), half = 16 * k
      box.append(svg('rect', { x: 0, y: my - half, width: W, height: 2 * half, fill: rgbText, opacity: 0.08 }),
        svg('line', { x1: 0, x2: W, y1: my - half, y2: my - half, stroke: '#c0392b', 'stroke-width': 2, opacity: 0.7 }),
        svg('line', { x1: 0, x2: W, y1: my + half, y2: my + half, stroke: '#2e6db4', 'stroke-width': 2, opacity: 0.7 }),
        svg('text', { x: 12, y: my - half - 6, fill: css('--color-text-muted'), 'font-size': 11 }, 'outside'),
        svg('text', { x: 12, y: my + half + 14, fill: css('--color-text-muted'), 'font-size': 11 }, 'inside'))
    }
    const grad = svg('radialGradient', { id: 'bead', cx: '35%', cy: '35%' }, svg('stop', { offset: '0%', 'stop-color': css('--color-depth-1') }), svg('stop', { offset: '100%', 'stop-color': css('--color-depth-5') }))
    box.append(svg('defs', {}, grad))
    for (const b of beads.sort((a, b) => a.z - b.z)) box.append(svg('circle', { cx: X(b.x), cy: Y(b.y), r: Math.max(2, b.r * k), fill: 'url(#bead)', stroke: css('--color-depth-6'), 'stroke-width': 0.6, opacity: 0.95 }))
    // Principal axis (the ingredient's own frame, drawn in ink: the accent is kept for the Focus).
    box.append(svg('line', { x1: W / 2, y1: H / 2 + 200, x2: W / 2, y2: H / 2 - 170, stroke: rgbText, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }),
      svg('path', { d: `M ${W / 2 - 6} ${H / 2 - 160} L ${W / 2} ${H / 2 - 174} L ${W / 2 + 6} ${H / 2 - 160} Z`, fill: rgbText }),
      svg('text', { x: W / 2 + 10, y: H / 2 - 160, fill: css('--color-text-muted'), 'font-size': 11 }, `principal axis ${JSON.stringify(n.pcpalAxis)}`))
    return h('section', { class: 'view', 'aria-label': 'Ingredient view' }, box,
      h('div', { class: 'glass band', 'aria-label': 'Sequence features' },
        h('div', { style: 'display:flex;gap:8px;align-items:center' }, h('strong', {}, 'Sequence'), n.uniprot ? h('span', { class: 'mono' }, n.uniprot) : h('span', { class: 'muted' }, 'needs a UniProt accession · ', h('button', { class: 'button link', onclick: () => run(C.find((c) => c.id === 'structure.find')) }, 'Find one'))),
        svg('svg', { viewBox: '0 0 600 14', height: 14, preserveAspectRatio: 'none', 'aria-hidden': 'true' }, svg('rect', { x: 0, y: 6, width: 600, height: 2, fill: css('--color-border-strong') }), n.uniprot ? [svg('rect', { x: 80, y: 2, width: 140, height: 10, rx: 2, fill: css('--data-cat-2'), stroke: css('--color-text'), 'stroke-width': 0.75 }), svg('rect', { x: 300, y: 2, width: 60, height: 10, rx: 2, fill: css('--data-cat-1'), stroke: css('--color-text'), 'stroke-width': 0.75 })] : null)),
      h('div', { class: 'view-title', style: 'top:auto;bottom:8px' }, `${n.name} · `, h('span', { class: 'mono' }, n.pdb || 'no structure'), ` · ${n.beads ? n.beads + (n.beads === 1 ? ' bead' : ' beads') + ' at level 0' : 'no beads'} · ${n.beadsXYZ ? 'its real beads' : 'a placeholder shape'}; in the app, Mol* v6`),
      h('div', { class: 'glass toolbar', role: 'toolbar', 'aria-label': 'Ingredient view options' }, tool('Show', 'cartoon'), tool('Colour', 'chain'), tool('Chains', 'all'), sep(), h('button', { class: 'tool', 'aria-pressed': 'true' }, 'Membrane'), h('button', { class: 'tool', 'aria-pressed': 'true' }, 'Beads'), sep(), h('button', { class: 'tool', title: 'Frame (F)' }, '⤢')))
  }

  function sceneView() {
    const W = 900, H = 640, cx = W / 2, cy = H / 2 + 10, R0 = 270
    const r = rng(42)
    const box = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Scene view: the whole packed ${R.root.name} model, one colour per ingredient` })
    const cat = (i) => css('--data-cat-' + ((i % 8) + 1))
    const colorOf = new Map(R.ings.map((n, i) => [n.id, cat(i)]))
    box.append(svg('defs', {}, svg('radialGradient', { id: 'shade', cx: '40%', cy: '38%' }, svg('stop', { offset: '0%', 'stop-color': css('--color-bg') }), svg('stop', { offset: '100%', 'stop-color': css('--color-depth-3') }))))
    box.append(svg('circle', { cx, cy, r: R0 + 14, fill: 'url(#shade)', opacity: 0.55 }), svg('circle', { cx, cy, r: R0, fill: 'none', stroke: css('--color-depth-5'), 'stroke-width': 10, opacity: 0.6 }))
    const f = new Set(state.focus)
    const dim = f.size > 0
    const surf = R.ings.filter((n) => n.side === 'surface' && parentOf(n).name.includes('envelope'))
    for (let i = 0; i < 150; i++) {
      const n = surf[i % surf.length], a = r() * Math.PI * 2, rr = R0 + (r() - 0.5) * 8
      box.append(svg('circle', { cx: cx + rr * Math.cos(a), cy: cy + rr * Math.sin(a), r: n.name.includes('ENV') ? 9 : 5, fill: colorOf.get(n.id), opacity: dim && !f.has(n.id) ? 0.18 : 1, stroke: f.has(n.id) ? css('--color-select') : css('--color-text'), 'stroke-width': f.has(n.id) ? 2 : 0.6, onclick: pick(n) }))
    }
    // The capsid: a cone of hexamers.
    const capsid = R.ings.find((n) => n.name.includes('CA_mono'))
    for (let i = 0; i < 160; i++) {
      const t = r(), w = 30 + t * 90, x = cx - 170 + t * 330, y = cy + (r() - 0.5) * 2 * w
      box.append(svg('circle', { cx: x, cy: y, r: 6, fill: capsid ? colorOf.get(capsid.id) : cat(1), opacity: dim && !f.has(capsid && capsid.id) ? 0.18 : 0.9, stroke: f.has(capsid && capsid.id) ? css('--color-select') : css('--color-text'), 'stroke-width': f.has(capsid && capsid.id) ? 2 : 0.6, onclick: capsid ? pick(capsid) : null }))
    }
    const inner = R.ings.filter((n) => n.side === 'interior')
    for (let i = 0; i < 260; i++) {
      const n = inner[i % inner.length], a = r() * Math.PI * 2, rr = Math.sqrt(r()) * (R0 - 26)
      const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a)
      box.append(svg('circle', { cx: x, cy: y, r: 3 + r() * 3, fill: colorOf.get(n.id), opacity: dim && !f.has(n.id) ? 0.15 : 0.95, stroke: f.has(n.id) ? css('--color-select') : css('--color-text'), 'stroke-width': f.has(n.id) ? 2 : 0.6, onclick: pick(n) }))
    }
    return h('section', { class: 'view', 'aria-label': 'Scene view' }, box,
      h('div', { class: 'view-title' }, `${R.root.name}: whole packed model · an illustration; in the app, Mol* v6 (Prism) loading the cellPACK result`),
      h('div', { class: 'glass legend', style: 'top:auto;bottom:8px' }, h('strong', {}, 'One colour per ingredient'), R.ings.slice(0, 6).map((n) => h('span', { style: 'display:flex;gap:6px;align-items:center' }, h('span', { class: 'swatch', style: `background:${colorOf.get(n.id)}` }), n.name)), h('span', { class: 'muted' }, `+ ${R.ings.length - 6} more in the outline`)),
      h('div', { class: 'glass toolbar', role: 'toolbar', 'aria-label': 'Scene view options' }, tool('Colour', 'ingredient'), tool('Detail', 'auto'), tool('Clip', 'off'), sep(), h('button', { class: 'tool', 'aria-pressed': dim ? 'true' : 'false' }, 'Fade the rest'), h('button', { class: 'tool' }, '⤢')))
  }
  const VIEW_RENDER = { recipe: recipeView, table: tableView, ingredient: ingredientView, scene: sceneView }

  // ---- the inspector (README §5.2) ------------------------------------------------------------------------------
  let inspEl
  const field = (k, v) => h('div', { class: 'field' }, h('span', { class: 'k' }, k), v)
  const input = (v, cls = '') => h('input', { class: 'input ' + cls, value: v == null ? '' : v, 'aria-label': 'value' })
  const section = (title, open, end, ...content) => h('details', { class: 'section', open: open || null }, h('summary', {}, title, end ? h('span', { class: 'end' }, end) : null), h('div', { class: 'content' }, ...content))
  const vec = (v) => h('div', { class: 'vec' }, (v || [0, 0, 0]).slice(0, 3).map((x) => input(x)))
  const btn = (title, id, primary) => {
    const c = C.find((c) => c.id === id)
    const ok = c ? enabled(c) : true
    const b = h('button', { class: 'button' + (primary && ok === true ? ' primary' : ''), title: ok === true ? (c && c.key ? `${c.title} (${c.key})` : null) : ok, 'aria-disabled': ok === true ? null : 'true', onclick: () => c && run(c) }, title)
    // P7: the reason is visible text beside the control, not only a tooltip (touch and keyboard never see those).
    return ok === true ? b : h('span', { class: 'with-reason' }, b, h('span', { class: 'reason' }, ok))
  }
  function crumbs(n) {
    const path = []
    for (let p = parentOf(n); p; p = parentOf(p)) path.unshift(p)
    return h('div', { class: 'insp-crumbs' }, path.map((p, i) => [i ? ' › ' : '', h('a', { href: '#', onclick: (e) => { e.preventDefault(); setFocus([p.id]) } }, p.name)]))
  }
  function ingredientInspector(n) {
    const p = problems(n)
    const sectionsOpen = state.inspectorOpen || ['Amount', 'Structure']
    const o = (t) => sectionsOpen.includes(t)
    return [
      h('div', { class: 'insp-head' }, h('div', { class: 'insp-kind' }, `Ingredient · ${n.side} · ${n.ingtype}`), h('div', { class: 'insp-name' }, n.name), crumbs(n)),
      h('div', { class: 'insp-body' },
        p.length ? h('div', { class: 'section' }, h('div', { class: 'content', style: 'padding-top:12px' }, p.map((x) => h('div', { class: 'problem' }, h('b', {}, x.level === 'danger' ? '●' : x.level === 'info' ? 'i' : '●'), h('span', {}, x.text, ' · ', h('button', { class: 'button link', onclick: () => run(C.find((c) => c.id === x.fix)) }, x.fix === 'structure.find' ? 'Find…' : x.fix === 'recipe.dataDirectory' ? 'Use a local copy…' : x.fix === 'structure.orient' ? 'Orient…' : 'Set')))))) : null,
        section('Amount', o('Amount'), n.count ? `${n.count} copies` : 'not set',
          field('Count', h('div', { class: 'row' }, input(n.count), h('span', { class: 'muted' }, 'copies'))),
          field('Molarity', h('div', { class: 'row' }, input(n.molarity), h('span', { class: 'muted' }, 'M'))),
          field('MW', h('div', { class: 'row' }, input(n.mw), h('span', { class: 'muted' }, 'kDa'))),
          field('Confidence', h('div', { class: 'segmented' }, ['low', 'medium', 'high'].map((t) => h('button', { 'aria-pressed': 'false' }, t))))),
        section('Structure', o('Structure'), n.pdb ? n.pdb : 'none',
          h('div', { class: 'thumb', role: 'img', 'aria-label': 'Preview of the structure' }),
          field('PDB / file', input(n.pdb, 'mono')), field('Assembly', input(n.bu, 'mono')), field('Selection', input(n.selection, 'mono')),
          field('UniProt', input(n.uniprot, 'mono')),
          h('div', { class: 'actions' }, btn('Find a structure…', 'structure.find', !n.pdb || !n.uniprot), btn('Open in 3D', 'structure.open'))),
        section('Placement', o('Placement'), n.side,
          field('Where', h('div', { class: 'segmented' }, ['surface', 'interior'].map((t) => h('button', { 'aria-pressed': n.side === t ? 'true' : 'false' }, t)))),
          field('Principal axis', vec(n.pcpalAxis)), field('Offset (Å)', vec(n.offset)),
          n.side === 'surface' ? h('div', { class: 'actions' }, btn('Orient from OPM', 'structure.orient'), h('span', { class: 'muted', style: 'align-self:center' }, 'or drag the axis in 3D')) : null,
          n.ingtype === 'fiber' ? field('Fiber length', input('', 'mono')) : null),
        section('Beads and levels of detail', o('Beads and levels of detail'), n.beads ? `${n.beads} beads · ${n.lods} levels` : 'not built',
          field('Level', h('div', { class: 'segmented' }, ['0 sphere', '1', '2'].map((t, i) => h('button', { 'aria-pressed': i === 1 ? 'true' : 'false' }, t)))),
          field('Beads', h('div', { class: 'row' }, input(n.beads || 'auto'), h('span', { class: 'switch on', role: 'switch', 'aria-checked': 'true', 'aria-label': 'Automatic number of beads' }), h('span', { class: 'muted' }, 'auto'))),
          field('Colour by', h('select', { class: 'input' }, ['level', 'radius', 'random'].map((t) => h('option', {}, t)))),
          h('div', { class: 'actions' }, btn('Build beads', 'structure.beads'), btn('Capture sprite', 'structure.sprite'))),
        section('Appearance', o('Appearance'), n.color ? 'own colour' : 'by depth',
          field('Colour', h('div', { class: 'row' }, h('span', { class: 'swatch square', style: `width:20px;height:20px;background:${n.color ? `rgb(${n.color.map((v) => v * 255).join(',')})` : css('--color-depth-3')}` }), h('span', { class: 'muted' }, n.color ? '' : 'none: drawn by depth'))),
          field('Label', input(n.label)), field('Sprite', h('span', { class: 'muted' }, 'scale 1 · y offset 0'))),
        section('Interactions', o('Interactions'), String(n.partners), n.partners ? h('span', {}, `${n.partners} partners`) : h('span', { class: 'muted' }, 'None. ⇧-click a second ingredient, then Add interaction.')),
        section('Custom data', false, '', h('span', { class: 'muted' }, 'Columns this recipe adds (custom_data), editable here and in the Table.')),
        section('Advanced', false, '', field('Packing', input('random')), field('Geometry', input('', 'mono')), field('Comments', input(''))))]
  }
  function compartmentInspector(c) {
    const kids = R.kids.get(c.id) || []
    const isRoot = c === R.root
    const ings = isRoot ? R.ings : kids.filter((k) => k.kind === 'ingredient')
    return [
      h('div', { class: 'insp-head' }, h('div', { class: 'insp-kind' }, isRoot ? `Recipe · ${R.file}` : `Compartment · ${c.geom_type}`), h('div', { class: 'insp-name' }, c.name), isRoot ? null : crumbs(c)),
      h('div', { class: 'insp-body' },
        section('Contents', true, '', field('Surface', h('span', {}, ings.filter((n) => n.side === 'surface').length + ' ingredients')), field('Interior', h('span', {}, ings.filter((n) => n.side === 'interior').length + ' ingredients')), field('Compartments', h('span', {}, kids.filter((k) => k.kind === 'compartment').length)), field('Need attention', h('span', { class: 'flag' }, ings.filter(flagged).length)),
          h('div', { class: 'actions' }, btn('Add an ingredient', 'edit.addIngredient'), btn('Add a compartment', 'edit.addCompartment'))),
        isRoot ? section('Recipe', true, '', field('Name', input(c.name)), field('Format', h('span', {}, R.key === 'hiv' ? 'serialized (cellPACK-gpu)' : 'classic (cellPACK)')), h('div', { class: 'actions' }, btn('Export…', 'recipe.export.gpu'))) :
          section('Geometry', true, c.geom_type, field('Type', h('select', { class: 'input' }, ['mb', 'sphere', 'file', 'raw', 'None'].map((t) => h('option', { selected: t === c.geom_type || null }, t)))), field('Thickness', input('', 'mono')), field('Radius', input('', 'mono'))),
        section('Appearance', false, 'by depth', field('Colour', h('span', { class: 'swatch square', style: `width:20px;height:20px;background:${css('--color-depth-2')}` }))))]
  }
  function multiInspector(ns) {
    return [
      h('div', { class: 'insp-head' }, h('div', { class: 'insp-kind' }, 'Focus'), h('div', { class: 'insp-name' }, `${ns.length} items`), h('div', { class: 'insp-crumbs' }, ns.map((n) => n.name).join(', '))),
      h('div', { class: 'insp-body' }, section('Together', true, '', h('span', { class: 'muted' }, 'Edits here apply to every item in the Focus.'), field('Count', input('mixed')), field('Colour', input('mixed')),
        h('div', { class: 'actions' }, btn('Add interaction', 'edit.addInteraction', true), btn('Delete', 'edit.delete'))))]
  }
  function renderInspector() {
    if (!inspEl) return
    if (state.card) { inspEl.replaceChildren(...state.card()); return }
    const f = focused()
    if (!R) { inspEl.replaceChildren(); return }
    const content = f.length > 1 ? multiInspector(f) : f.length ? (f[0].kind === 'ingredient' ? ingredientInspector(f[0]) : compartmentInspector(f[0])) : compartmentInspector(R.root)
    inspEl.replaceChildren(...content)
  }

  // ---- the find-a-structure card (README §5.4) ------------------------------------------------------------------
  function structureCard() {
    const n = focused().find((x) => x.kind === 'ingredient') || R.ings[0]
    const q = n.label || n.name.replace(/_.*$/, '')
    // Placeholders, not search results: the first is the structure already in the recipe; the rest only show the
    // shape of a result of each kind (no accession or measurement is claimed).
    const results = [
      [n.pdb ? n.pdb.toUpperCase() : '—', 'The structure in this recipe', 'PDB entry · method, resolution, chains', 'PDB'],
      ['UniProt entry', `The protein for ${n.name}`, 'organism · reviewed or not · length', 'UniProt'],
      ['AlphaFold model', 'The predicted model of that UniProt entry', 'mean pLDDT · whole chain', 'AlphaFold'],
      ['PDB entry', 'A homolog from another organism', 'PDB entry · method, resolution, chains', 'PDB'],
    ]
    return [
      h('div', { class: 'insp-head' }, h('div', { class: 'insp-kind' }, 'Find a structure · a card in the inspector’s place'), h('div', { class: 'insp-name' }, n.name), h('div', { class: 'insp-crumbs' }, 'Esc or ✕ goes back to the inspector · ', h('button', { class: 'button link', onclick: () => { state.card = null; renderInspector() } }, '✕ Close'))),
      h('div', { class: 'insp-body', style: 'padding:12px 16px' },
        h('div', { class: 'tabs', role: 'tablist', style: 'padding:0;margin-bottom:12px' }, ['All', 'PDB', 'UniProt', 'AlphaFold'].map((t, i) => h('button', { class: 'tab', role: 'tab', 'aria-selected': i === 0 ? 'true' : 'false' }, t))),
        h('input', { class: 'input', value: q, 'aria-label': 'Search' }),
        h('div', { class: 'chips', style: 'margin:8px 0 12px' }, ['by name', 'by sequence', 'by UniProt', 'organism'].map((t, i) => h('button', { class: 'chip', 'aria-pressed': i === 0 || i === 3 ? 'true' : 'false' }, t))),
        results.map(([id, t, m, src], i) => h('div', { class: 'result' }, h('div', { class: 'thumb', role: 'img', 'aria-label': 'Structure preview' }),
          h('div', {}, h('div', {}, h('span', { class: 'mono' }, id), ' · ', h('span', { class: 'muted' }, src)), h('div', {}, t), h('div', { class: 'muted' }, m)),
          h('button', { class: 'button' + (i === 0 ? ' primary' : ''), title: `Set ${src === 'UniProt' ? 'the UniProt accession' : 'the structure'} of ${n.name}` }, 'Use'))),
        h('p', { class: 'muted' }, 'Placeholder results, not a search. Hovering a result previews it in the Ingredient view; Use writes it onto the ingredient in the Focus (one undo step).'))]
  }

  // ---- render ---------------------------------------------------------------------------------------------------
  let config = {}
  function renderAll() {
    document.body.replaceChildren()
    document.body.append(reviewStrip(config.caption), topbar())
    if (config.body) { document.body.append(config.body()); return }
    const body = h('div', { class: 'body' })
    columnEl = R ? h('aside', { class: 'column', 'aria-label': 'Recipe' }) : null
    stageEl = h('main', { class: 'stage', style: 'position:relative' })
    inspEl = R ? h('aside', { class: 'inspector', 'aria-label': 'Inspector' }) : null
    body.append(...[columnEl, stageEl, inspEl].filter(Boolean))
    statusEl = h('footer', { class: 'statusbar' })
    document.body.append(body, statusEl)
    renderColumn(); renderStage(); renderInspector(); renderStatus()
    if (config.after) config.after()
  }
  listeners.push(() => { renderColumn(); renderStage(); renderInspector(); renderStatus() })

  window.Mock = {
    h, svg, css, state, C, EXAMPLES, enabled, problems, flagged, openPalette, structureCard,
    get R() { return R },
    byName,
    render(cfg) {
      config = cfg
      useRecipe(cfg.recipe)
      Object.assign(state, { views: cfg.views || ['recipe'], split: cfg.split || 'rows', filter: cfg.filter || 'all', editMode: !!cfg.editMode, page: cfg.page || null, inspectorOpen: cfg.inspectorOpen || null })
      state.focus = (cfg.focus || []).map((name) => byName(name)).filter(Boolean).map((n) => n.id)
      state.card = cfg.card === 'structure' ? structureCard : null
      renderAll()
      if (cfg.palette) openPalette(cfg.palette)
    },
  }
})()
