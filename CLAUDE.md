# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mesoscope@TSRI is a browser-based viewer/editor for cellPACK-style mesoscale
biological recipes (viruses, organelles, cells, compartments packed with
molecular ingredients). The repo holds two apps:

- **The legacy app** (repo root: `index.html`, `js/`, `cgi-bin/`): a no-build,
  no-bundler web app, plain HTML/CSS/JS served as static files plus Python CGI
  scripts. It has no tests and no linter. It is the **reference** the
  modernization specs are derived from, and it owns production `/` until a
  separately approved cutover. Don't modify it.
- **The modern app** (`web/`, branch `web-modernization`): Vite + React 19 +
  TypeScript, Vitest + Playwright, oxlint. Its specs are in `web/_spec/`
  (`README.md` lists them; `parity.md` is the legacy → modern evaluation).
  New work happens there, in lanes (see "How we work" at the end).

The sections below describe the legacy app unless they say otherwise.

## Running it locally

Start the legacy CGI-capable static server from the repo root:

```bash
python3 localCGIServer.py
```

Then open `http://localhost:8080/` (serves `index.html`, the main app).

`localCGIServer.py` is a thin wrapper around Python's `http.server`
`CGIHTTPRequestHandler` that additionally treats any `*.cgi` file as an
executable CGI script (matching the production Apache/mgl2 setup), and adds
three custom routes used for LLM-generated recipe loading (see
`recipe_json`/`recipe_proxy` below).

## Recipe loading (core workflow)

Recipes can be loaded into the running app via URL query parameters, handled in
`js/main.js` (`getRecipeUrlFromLocation`, `getRecipeJsonFromLocation`,
`LoadRecipeFromUrl`, `LoadRecipeFromJsonObject`, around js/main.js:1842-1920):

- `?recipe=<path>` / `?recipe_url=<path>` / `?load_recipe=<path>` — fetch and load a recipe file.
- `?recipe_json=<url-encoded JSON>` — load a recipe embedded directly in the URL (small recipes only).
- `?recipe_format=serialized|classic` — force the parser; otherwise it's auto-detected from JSON shape (`Compartments`/`IngredientGroups` keys) or filename.

Two recipe shapes exist and are parsed differently:
- **Serialized** (`parseCellPackRecipeSerialized`) — the modern nested
  `Compartments` / `IngredientGroups` / `Ingredients` tree. `data/HIV_serialized.json`
  is the canonical example to diff against.
- **Classic** (`parseCellPackRecipe`) — older flat recipe format.

Cross-origin recipe URLs are routed through `localCGIServer.py`'s
`/recipe_proxy?url=` endpoint (server-side fetch, http/https only, 10MB cap) to
avoid CORS issues; same-origin URLs are fetched directly. Posting a full recipe
JSON to `/recipe_json` writes it to `data/codex_recipe_serialized.json` (the
"bridge" file) and returns a `load_url` for the app to open.

The `Skills` menu in the running app copies `SKILLS.md` (the LLM prompt for
generating recipes) to the clipboard — see that file for the full recipe CSV
schema, serialized-JSON ingredient contract, and the genome/nucleic-acid
inclusion rules for viral recipes. When generating or editing recipe JSON by
hand, validate it before claiming it's loadable:

```bash
python3 -m json.tool data/codex_recipe_serialized.json >/dev/null
```

## Checking JS/Python changes

The legacy app has no test suite or linter (the modern app's checks are in
"How we work"). The minimum sanity check after editing legacy code is a
syntax check:

```bash
node --check js/main.js          # or whichever file(s) changed
python3 -m py_compile localCGIServer.py
python3 -m py_compile cgi-bin/cellpack_db_dev.py
```

For UI-affecting changes, start `localCGIServer.py` and exercise the feature in
a browser — there's no automated coverage to fall back on.

## Frontend architecture

`index.html` is the single-page app shell; it loads, in order, a large stack of
third-party libraries from `extras/` (jQuery, AngularJS 1.4, D3 v4, Mol*, NGL,
SlickGrid, Golden Layout, Three.js, gpu-physics, etc.) and then the project's
own scripts from `js/` (see the `<script>` block near the end of `index.html`,
~line 1146). Load order matters — most `js/` files rely on globals defined by
earlier scripts (e.g. `js/main.js` before `js/layout_mg.js` before
`js/illustrate.js`).

Key `js/` files and their roles:
- `main.js` — the largest file; global app state, recipe loading/parsing (classic vs serialized), the compartment/ingredient graph data model (`update_graph`), and most UI wiring. Read this first for any recipe-model work.
- `cp_serialized.js` — data classes for the serialized recipe tree (`sCompartment`, `sIngredientGroup`, ingredient constructors) mirroring the JSON shape described in `SKILLS.md`.
- `layout_mg.js` — Golden Layout panel/grid setup (NGL viewer, Mol* viewer, PFV/ProtVista feature views, SlickGrid tables) and cross-panel wiring.
- `query_helper.js`, `gridtable.js` — SlickGrid-backed ingredient/compartment tables and querying.
- `molstar_wrapper.js` — thin wrapper around the bundled Mol* build in `extras/molstar/`.
- `ngl.js`, `ngl_grid.js`, `distance.js` — NGL-based 3D structure viewing and measurement.
- `illustrate.js`, `illustrator.js` — client side for the Illustrate-style rendering workflow (paired with `illustrate.html`/`illustratecall.html` and `cgi-bin/illustrator.py`/`hILL.py` on the server side).
- `util.js`, `pycallback.js` — shared helpers and the bridge for calling server-side CGI endpoints from JS.

Other top-level HTML pages are alternate entry points, not partials of
`index.html`: `illustrate.html`/`illustratecall.html` (structure illustration
tool), `index_gridster.html` (gridster-based layout variant), `landing_page.html`.

## Server-side (cgi-bin/ and python/)

CGI scripts follow a `<name>_dev.py` + `<name>_dev.cgi` pairing convention:
the `.py` file is the actively edited source (Python 3 style); the `.cgi` file
is a near-duplicate deployed copy with production-specific shebangs/paths and,
historically, Python 2 compatibility (`urllib2`, `StringIO`) for the older
mgl2 server. When you change logic in one, check whether the other needs the
equivalent change — they are not auto-synced.

- `cgi-bin/cellpack_db_dev.py`/`.cgi` — queries `data/cellPackDatabase.db` (SQLite) for recipe/compartment trees and produces the DB browsing UI and circle-packing/force-simulation JSON views.
- `cgi-bin/get_geom_dev.py`/`.cgi` — geometry helpers (fetching molecules, biological units, coarse molecular surfaces) via MGLTools; note the shebang points at a `pythonsh` install path, not plain Python.
- `cgi-bin/illustrator.py`, `cgi-bin/hILL.py` — server-side handlers for the Illustrate rendering pipeline (wildcard/outline generation, PDB fetching, oriented bounding boxes, principal-axis computation); `hILL.py` is the newer per-chain-coloring/alignment variant (uses `scipy.spatial.transform.Rotation`).
- `python/jsonRecipeDB.py` — shared SQLite helpers (`sqlite3`) for reading `data/cellPackDatabase.db`.
- `python/HTMLTools.py` — shared CGI/HTML form-building helpers used by `illustrator.py`.

## Data directory

`data/` holds example and working recipes in both classic (`*.json`) and
serialized (`*_serialized.json`) formats, plus `cellPackDatabase.db` (SQLite,
used by `cellpack_db_dev`). `data/codex_recipe_serialized.json` (and sibling
`codex_recipe*.csv`/`.md` files) is the well-known "bridge" location that
LLM-generated recipes are written to and that the app/server both know how to
load by convention — treat it as a scratch/output slot, not a checked-in
example.

## Deployment model

There is no CI/build pipeline. Deployment is via git push to bare repos on the
`mgl2`/production host, driven by `post-receive` hooks that checkout the repo
into the live/beta www directories (see `notes.txt` for the exact remote names
and hook script). Do not assume any packaging or transpilation step happens
between this repo and what's served in production — what's committed here is
what runs, modulo the `.cgi`/`.py` python-version split described above.
`web/` is not deployable this way yet: `web/dist` is gitignored and no hook
runs a build (see the queue in `web/TODO.md`).

## How we work (Ludovic Autin, 2026-11-04)

Many small lanes in parallel, each one task, one branch, one PR; the checks and the review gate are the reviewer,
Ludovic reads PR bodies and tries the result. Why: one long session serializes the work and loses detail at each
context compaction; written state and small PRs do not. Modelled on Mol\* v6 (`~/Developments/molstar`, `AGENTS.md`,
`packages/prism/viewer/_spec/`).

- **`web-modernization` is the integration branch.** PRs go to `corredD/mesoscope` base `web-modernization`:
  `gh pr create -R corredD/mesoscope --base web-modernization`. Ludovic merges. Nothing goes to `master` (production)
  from a lane: cutover is its own decision.
- **A lane is a worktree beside the repo**, never inside it: `git worktree add ~/Developments/mesoscope-lanes/<slug> -b
  lane/<slug> origin/web-modernization`, then `cd web && npm ci --legacy-peer-deps` (molstar 5 and jsdom want different
  `canvas` peers). Each lane gets its own ports, written in its brief:
  the Vite dev server on `5180+n`, e2e through `E2E_PORT=5180+n npm run test:e2e`, the legacy server (when a lane
  needs it for an oracle) on `8090+n`.
- **The queue** is `web/TODO.md` `## Next`: Ludovic's items, in order, in Ludovic's words (what to see, how to
  check it).
- **Spec first.** The legacy app is the reference. A feature's behaviour is written in `web/_spec/<area>.md`, derived
  from the legacy code with a `file:line` citation per rule, before a lane rebuilds it; `web/_spec/parity.md` maps
  every legacy feature to its modern state. Specs are terse: a rule and its reason, numbered sections (`recipe-view.md
  §3`) that code comments cite, no history. Where the modern app departs from legacy on purpose, the spec says so
  with who decided it. Question a spec that the legacy code or Ludovic's intent contradicts; ask, don't silently
  follow or rewrite.
- **Parity is proven by an oracle, not by reading code**: where legacy behaviour can be captured (node positions,
  colors, parsed models, merged recipes), capture it by running the legacy app (`python3 localCGIServer.py`) and keep
  the capture as a fixture under `web/tests/fixtures/` (as `merge-oracle/` does).
- **Written state, not memory.** A session starts by reading [web/progress/current.md](web/progress/current.md) (one
  line per lane in flight; only the coordinating session, the main checkout, edits it) and its lane's
  `web/progress/<yyyy-mm-dd>-<slug>.md`; it ends by writing what was built, what was decided (and by whom), what was
  learned, the size against the brief's. Dated, not numbered: parallel lanes would take the same number.
- **A brief before code**: the spec section it changes, the tests that prove it, what Ludovic checks, a size in
  production lines, the model of each step. Over the size: record it and what took the room, keep going; stop and
  report when the work turns out different from the brief.
- **Models by step**: mechanical work (copying, renames, running checks and tests, measuring, oracle captures) to
  Sonnet subagents; design, hot-path authoring and every review to Opus. A lane session itself runs on Sonnet unless
  its brief says why Opus (a background agent gets `model: "sonnet"` explicitly, else it inherits the coordinator's
  Opus); it hands each design or hot-path step to one Opus subagent, and the gate's reviewer and skeptic are Opus. At
  most 3 lanes run at once; the others wait in `current.md` as queued.
- **A lane is done** when: it works as the brief's check says; it has tests (failing first for a fix); these pass, from
  `web/`: `npm run typecheck && npm run lint && npm test && npm run build && E2E_PORT=<port> npm run test:e2e`; no
  changelog file (the PR body and the progress file are the record); the specs it moves (`_spec/<area>.md`,
  `parity.md`) are updated in the same PR. `web/README-modernization.md` is history: don't extend it, move what still
  holds into `_spec/`.
- **No accidental quadratic, few allocations**: over many items, index once and never scan or rebuild per item; nothing
  allocated per pointer event or animation frame (the recipe canvas ticks a force simulation every frame). A bulk path
  lands with a scaling guard (n and 4n, with a quadratic control). No perf guard exists yet: the first lane that
  touches a per-frame or bulk path adds one.
- **UI from the foundations**: views use `web/src/components/ui/` (Button, Switch, Slider over Radix Themes) and the
  theme tokens in `web/src/styles/`; a principle of our own is written down with its story or example.
- **Mol\* v6 (Prism)** is the target for the ingredient (protein-in-focus) viewer and the full-scene viewer. It is not
  on npm (`6.0.0-dev.0`, a pnpm workspace): the reference checkout is `~/Developments/molstar`, and how `web/`
  consumes it is decided by its own spike lane. Pin the molstar commit a lane builds against in its brief.
- **The review gate before the PR**: an Opus reviewer, read-only, lists findings on the lane's diff (must-fix,
  should-fix, nit; file:line and a failure scenario); a skeptic re-runs or re-reads each and tries to refute it; each
  confirmed must-fix and should-fix gets a failing test, then its fix, one commit each. The PR body's `Review` section
  lists them (refuted, fixed by commit, or left open to the queue).
- **The PR body**: What, Changes, Notes for review (defaults, public API, what is left open), Testing (what ran, what
  was checked by hand, with what data), Review.
- **Small commits, one cause each**, the cause in the message; only your own hunks; a wrong commit is fixed forward,
  never amended once pushed.
- **Corrections become rules**: when Ludovic corrects a choice that should hold, add it to this file as "(Ludovic,
  date) rule, because …", with a test that guards it where one can.
