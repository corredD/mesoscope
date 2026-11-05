# Mesoscope modern app: the specification

The behaviour of the modern app (`web/`), derived from the legacy app (repo root: `index.html`, `js/`, `cgi-bin/`),
which is the reference. Each rule cites the legacy code it comes from (`js/main.js:5565`); code comments cite these
files' sections (`recipe-view.md §3`). Where the modern app departs from legacy on purpose, the spec says so and who
decided it. Terse: a rule and its reason, no history (that is `../README-modernization.md` and `../progress/`). What is
not built is the queue: `../TODO.md`.

| File                               | What it covers                                                                 | State      |
| ---------------------------------- | ------------------------------------------------------------------------------ | ---------- |
| [parity.md](parity.md)             | every legacy feature → its modern state (the evaluation)                       | seeded     |
| [recipe-view.md](recipe-view.md)   | the D3 Recipe view: pack, canvas drawing, forces, gestures, options, Edit Mode | in writing |
| recipe-model.md                    | recipe formats, parsing, serializing, merge, CSV, URL parameters               | to write   |
| tables.md                          | recipe table, interaction table, PDB/UniProt search tables                     | to write   |
| ingredient-view.md                 | the protein-in-focus viewer and its options (Mol\* v6 target)                  | to write   |
| scene-view.md                      | the full-scene viewer: whole packed models (Mol\* v6 target)                   | to write   |
| shell.md                           | menus, panels, layout presets, theme, Skills, pages                            | to write   |
| server.md                          | the CGI endpoints the app calls and what replaces them                         | to write   |

## Pinned references

- Legacy reference: `web-modernization` at `ab6f09a` (the legacy files are unchanged from `master`).
- Mol\* v6 (Prism): `~/Developments/molstar` at `c1b8ecb` (master, 2026-11-01, `6.0.0-dev.0`). Its
  `packages/prism/viewer/_spec/` is the model for these files, and its `parity.md` the model for ours.
- Dragology (declarative dragging for the Recipe view, `recipe-view.md §10.1`): `declarative-dragging/dragology` at
  `b145bdd` (0.1.7, MIT, pre-1.0, npm `dragology`); reference checkout `~/Developments/_refs/dragology`. Its
  `docs/AGENTS.md` is the usage guide; `src/demos/` (`multi-circle-points`, `point-on-circle-via-constraint`,
  `point-in-circle`, `sprouting-tree`, `graph`, `two-kinds-of-tree`) are patterns, not limits: our own operators are allowed.
