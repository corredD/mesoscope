# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mesoscope@TSRI is a browser-based viewer/editor for cellPACK-style mesoscale
biological recipes (viruses, organelles, cells, compartments packed with
molecular ingredients). It is a legacy, no-build, no-bundler web app: plain
HTML/CSS/JS served as static files plus a handful of Python CGI scripts for
server-side geometry/DB work. There is no npm/package.json, no test suite, and
no linter configured in this repo.

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

There is no test suite or linter. The minimum sanity check after editing is a
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
