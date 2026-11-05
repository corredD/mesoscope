/* The Open page and the first-run page: both offer the same ways in (README §5.5), so they share their parts. */
;(function () {
  const { h, svg, css } = Mock
  function thumb(seed, n) {
    let s = seed * 7919 + 13
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const kids = []
    for (let i = 0; i < Math.min(n, 30); i++) {
      const a = r() * 6.283, d = Math.sqrt(r()) * 30
      kids.push(svg('circle', { cx: 60 + d * Math.cos(a), cy: 45 + d * Math.sin(a), r: 3 + r() * 4, fill: css('--color-depth-' + (3 + (i % 3))) }))
    }
    return svg('svg', { viewBox: '0 0 120 90', 'aria-hidden': 'true' }, svg('circle', { cx: 60, cy: 45, r: 40, fill: css('--color-depth-1'), stroke: css('--color-depth-3'), 'stroke-width': 3 }), kids)
  }
  function examples(mode) {
    const cards = Mock.EXAMPLES.map(([t, m, file], i) => h('button', { class: 'card', title: `${mode === 'append' ? 'Append' : 'Open'} ${file}`, onclick: () => { location.href = (t.startsWith('Myco') ? '03-curate.html' : '02-build.html') + location.search } },
      thumb(i + 1, 10 + i * 3), h('span', { class: 't' }, t), h('span', { class: 'm' }, m), h('span', { class: 'm mono' }, file)))
    const off = [
      ['Mycoplasma genitalium (auto, curated)', 'Not built yet: .zip import; MG_*.zip is not in data/'],
      ['YASARA PetWorld: SARS-CoV-2, HIV, synapse vesicle, presynapse', 'Not built yet: whole-model loading in the Scene view'],
    ].map(([t, why], i) => h('div', { class: 'card', 'aria-disabled': 'true', title: why }, thumb(20 + i, 6), h('span', { class: 't muted' }, t), h('span', { class: 'm' }, why)))
    return h('div', { class: 'cards' }, cards, off)
  }
  function ways() {
    return [
      h('h2', {}, 'From a file'),
      h('div', { class: 'drop' }, h('div', { class: 'serif', style: 'font-size:18px;color:var(--color-text)' }, 'Drop a recipe here, or ', h('button', { class: 'button link' }, 'choose a file')),
        h('div', {}, 'cellPACK .json · cellPACK-gpu _serialized.json · spreadsheet .csv (you map its columns next) · .xlsx and .zip: not built yet')),
      h('h2', {}, 'From a link'),
      h('div', { style: 'display:flex;gap:8px' }, h('input', { class: 'input', placeholder: 'https://…/recipe.json', 'aria-label': 'Recipe URL' }), h('button', { class: 'button' }, 'Open')),
      h('p', { class: 'muted' }, 'The same as opening Mesoscope with ?recipe=<url>; every loaded recipe gets a link to share it.'),
      h('h2', {}, 'With an LLM (Skills)'),
      h('div', { class: 'steps' },
        h('div', { class: 'step' }, h('span', { class: 'n' }, '1'), h('strong', {}, 'Copy the skill'), h('span', { class: 'muted' }, 'SKILLS.md tells your LLM the recipe format, the CSV columns and the genome rules for viruses.'), h('div', { class: 'actions' }, h('button', { class: 'button' }, 'Copy the skill'), h('button', { class: 'button link' }, 'Open SKILLS.md'))),
        h('div', { class: 'step' }, h('span', { class: 'n' }, '2'), h('strong', {}, 'Ask your LLM'), h('span', { class: 'muted' }, 'Paste the skill and say what to build: “a mature influenza A virion with its membrane proteins and vRNPs”.'), h('span', { class: 'muted' }, 'Mesoscope sends nothing anywhere: you choose the LLM.')),
        h('div', { class: 'step' }, h('span', { class: 'n' }, '3'), h('strong', {}, 'Paste its JSON here'), h('textarea', { class: 'input', 'aria-label': 'Recipe JSON from the LLM' }, '{ "name": "InfluenzaA", "Compartments": [ … ] }'),
          h('span', { style: 'color:var(--color-success)' }, '✓ valid serialized recipe · 1 compartment · 11 ingredients'), h('div', { class: 'actions' }, h('button', { class: 'button primary' }, 'Open it')))),
    ]
  }
  Mock.openPage = function (mode) {
    return () => h('div', { class: 'page', role: 'dialog', 'aria-label': 'Open a recipe' }, h('div', { class: 'page-inner' },
      h('div', { style: 'display:flex;align-items:center;gap:12px' }, h('span', { class: 'muted' }, 'A page over the stage · Esc goes back'), h('span', { style: 'margin-left:auto' }), h('button', { class: 'button', onclick: () => history.back() }, '✕ Close')),
      h('h1', {}, mode === 'append' ? 'Append to HIV' : 'Open a recipe'),
      h('div', { class: 'segmented', role: 'group', 'aria-label': 'Open or append' }, h('button', { 'aria-pressed': mode !== 'append' ? 'true' : 'false', onclick: () => (location.href = '07-open.html' + location.search) }, 'Open as a new recipe'), h('button', { 'aria-pressed': mode === 'append' ? 'true' : 'false', onclick: () => (location.href = '07-open.html' + (location.search ? location.search + '&' : '?') + 'append=1') }, 'Append into HIV (merge)')),
      mode === 'append' ? h('p', { class: 'muted' }, 'Appending asks which fields to merge (structure, count, molarity, UniProt, colour…) and whether to create the ingredients that are new: the Column merging step, as today.') : null,
      h('h2', {}, 'Examples'), examples(mode), ...ways(),
      h('h2', {}, 'Into this recipe'),
      h('div', { class: 'actions' }, h('button', { class: 'button' }, 'Import a colour palette…'), h('button', { class: 'button' }, 'Import counts and molarities…'),
        h('button', { class: 'button', 'aria-disabled': 'true', title: 'Not built yet: colouring by property' }, 'Import a colour mapping…'),
        h('button', { class: 'button', 'aria-disabled': 'true', title: 'Not built yet: a local data server' }, 'Set the data directory…'))))
  }
  Mock.firstRun = function () {
    return h('div', { class: 'body' }, h('main', { class: 'stage', style: 'background:var(--color-bg);overflow:auto' }, h('div', { class: 'page-inner', style: 'max-width:900px' },
      h('h1', { class: 'serif', style: 'font-weight:400;font-size:40px;margin:48px 0 8px' }, 'What will you pack?'),
      h('p', { class: 'muted', style: 'font-size:15px;margin:0 0 24px' }, 'A recipe is compartments and the molecules in them, with how many of each. Start from an example, a file, a link, or an LLM.'),
      h('button', { class: 'search-field', style: 'width:100%;height:56px;font-size:15px;background:var(--color-raised);box-shadow:var(--shadow-float)', onclick: () => Mock.openPalette('open') }, 'Drop a recipe, paste a link or an LLM’s JSON, or type a command…', h('kbd', {}, '⌘K')),
      h('div', { class: 'chips', style: 'margin:12px 0 0' }, h('span', { class: 'muted' }, 'Try'), ['HIV mature', 'Influenza envelope', 'Mycoplasma pneumoniae'].map((t) => h('button', { class: 'chip', onclick: () => (location.href = (t.startsWith('Myco') ? '03-curate.html' : '02-build.html') + location.search) }, t)), h('button', { class: 'chip' }, 'New empty recipe')),
      h('h2', { style: 'margin-top:40px' }, 'Examples'), (function () { const p = Mock.openPage('open')(); return p.querySelector('.cards') })(),
      ...ways(),
      h('h2', {}, 'Recent'), h('p', { class: 'muted' }, 'Recipes you open appear here, in this browser only.'))))
  }
})()
