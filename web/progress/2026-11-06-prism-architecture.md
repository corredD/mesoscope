# prism-architecture (2026-11-06)

Lane `prism-architecture`. Mesoscope worktree `~/Developments/mesoscope-lanes/prism-architecture`, branch
`lane/prism-architecture` from `origin/web-modernization` at `39175ca`. Prototype worktree
`~/prism-me-lanes/mesoscope-extension`, branch `spike/mesoscope-extension` from `origin/prism-me` at `a1126e871`
(repo `~/molstar-prism-me`, remote corredD/molstar-proto): **local only, never pushed** (Ludovic, 2026-11-06). Dev
server port 5183. Pinned: molstar `~/Developments/molstar` at `c1b8ecb`, prism-me at `a1126e871`.

## Brief

**Goal.** Decide, with a working prototype, whether Mesoscope becomes an extension in prism-me (one Prism app) rather
than a second app kept in sync with prism-me, and how a Recipe ⇄ Model workspace switch works. The flow to serve
(Ludovic, 2026-11-06): open a recipe, build and look at it (Recipe view, Table, Ingredient view), then switch to Model
and build and look at the mesoscale model; one Focus, one undo, one ⌘K.

**Context.**
- Decided (Ludovic, 2026-11-05): the ingredient viewer is Mol\* v6 Prism; the full-model view is prism-me; painting
  and placing happen in prism-me, with physics rebuilt there (queue item 12); topology and UniProt mapping come from
  Prism.
- PR #50 (`lane/builder-mockup`) designed the two-app variant: its `web/_spec/design/README.md` §5.7 sync contract is
  the alternative this lane compares against. PR #50 stays open until this lane decides.
- Prism extensions: `packages/prism/viewer/_spec/viewer-spec.md` §2.5 (`ui.layout`), §3 (`ViewerExtension`: api,
  commands, skills, settings, `ui(ctx)` views in slots: `tabs`, `pages`, `overlays`, inspector sections, scene-tree
  `rows`, `toolbar`, node/selection actions; lazy stubs; `viewer.extensions.mount`). Shell: `packages/prism/ui/_spec/shell.md`.
  prism-me: `apps/prism-me/_spec/README.md` (three extensions, no Prism code changed), `ui.md`, `architecture.md`.
- Coordinator's reading (verify): no workspace/mode switch exists in Prism; `ui.layout` has docks, tabs, `embedded`
  mode, start tab, `view.reset-layout`. The main area is the 3D canvas; extension views sit around or over it.

**Questions, each answered with evidence (file:line in Prism, prism-me, `web/`).**
1. Hosting: can `web/`'s React Recipe view (2D canvas + legacy physics, `web/src/components/recipe/`) and Table run
   as Prism views; in which slot; can they take the main area or only a page/dock? Does Prism's one undo (sequence.md
   §7) take recipe edits?
2. Workspace switch: what exists; can an app-level switch swap layout, tabs and the stage's content, or does it need a
   Prism shell change? If so, write it as a proposal for upstream Prism; do not make it in Prism.
3. Shared state: the recipe as the extension's own state; prism-me's particles keyed to ingredient paths; the Focus as
   Prism's selection extended to recipe objects.
4. Cost and risk: what of `web/` carries over (domain, Recipe view, Table) and what is rewritten; dockview, Radix
   Themes and our tokens vs Prism styling; bundle; deploy (prism-me is a pnpm workspace, not on npm); compared with
   the two-app variant (PR #50 §5.7).

**Prototype (throwaway, stays out of the PR).** In the prism-me worktree, a minimal `mesoscope` extension: loads
`data/HIV_serialized.json`; the recipe outline as a tab; the Recipe view in whichever slot works (copy or import from
`web/src`, as is cheapest); a click on an ingredient sets the Focus; switching to Model shows prism-me's HIV model with
that ingredient picked; a rough app-level Recipe/Model switch. Commit it on `spike/mesoscope-extension` locally.

**Produces (the Mesoscope PR).**
- `web/_spec/architecture.md`: the recommendation (extension or two apps) with the evidence per question.
- The workspace-switch design (app-level, or the Prism shell change to propose upstream).
- Screenshots or a short GIF of the prototype, under `web/_spec/architecture/` (small files).
- `web/TODO.md` queue updates proposed in the PR (item 1 Mol\* v6 spike, which this largely replaces; items 2-3; the
  next mockup round: two workspaces in one shell). Do not edit `web/progress/current.md` (coordinator's).

**Ludovic's check.** Read `architecture.md` and decide; on this machine run the prototype (the command in the PR body,
port 5183): open HIV, click an ingredient, switch to Model, the same ingredient picked.

**Tests.** No `web/src` change. If `web/` files change, `npm run lint` from `web/`. The prototype: it builds and runs;
note any prism-me check that fails and why (it is throwaway).

**Size.** No production lines in `web/src`. Spec ~200-300 lines; prototype ~300-600 lines (not in the PR).

**Models.** Lane on Sonnet. The architecture analysis and the workspace-switch design: one Opus subagent
(`model: "opus"`). Mechanical steps (install, builds, screenshots) on Sonnet. Gate reviewer and skeptic are Opus.

## Progress

### Built
- Prototype (local only, commit `ff2b24509` on `spike/mesoscope-extension`, never pushed): `apps/prism-me/src/recipe/extension.tsx`
  (205 lines) plus a verbatim copy of 43 `web/src` files (6.7k lines) and `web-css.ts`. A `recipe` API area (open,
  focus, workspace), an outline tab and a Recipe page (the real RecipeCanvas and RecipeTable through Prism's
  `reactView`), a Recipe/Model switch, ⌘K commands, the Focus mirrored both ways with the model (HIV, cellPACK example).
- `web/_spec/architecture.md` (about 380 lines), 4 screenshots in `web/_spec/architecture/`, a row in `web/_spec/README.md`.

### Decided (and by whom)
- Nothing decided by Ludovic yet: the recommendation (extension in prism-me, staged) and D1-D10 are proposals in
  `architecture.md` §1 and §10. Lane choices: the prototype copies `web/src` rather than importing it; the page is the
  Recipe workspace (the only way to take the main area); the workspace is derived from the page (review S4).

### Learned
- `reactView` is a first-class React adapter, but nothing shipped uses it; Prism UI is its own JSX runtime and renders in
  a shadow root, so document CSS and web's theme tokens do not reach a React island (the canvas drew nothing).
- A page covers the 3D stage, and with a pinned right dock it also covers the rail and panel (a Prism bug).
- One undo is not free: checkpoints stringify the custom state whole each step; a recipe with inline meshes
  (`hivfull`, 13 MB after the filter) turns undo off for the scene, and the recipe graph is cyclic (review M1).
- prism-me's `--prd` build is already over its 3.4 MB budget (6.15 MB; the spike adds 0.30 MB).
- This machine's pnpm 12.15.0 (corepack) is broken; `node ~/.cache/node/corepack/v1/pnpm/12.15.0/bin/pnpm.mjs` works.
  Headless Chromium has no WebGL; headed with `--use-angle=swiftshader` does.

### Size against the brief
- Brief: no `web/src` lines; spec 200-300 lines; prototype 300-600 lines (not in the PR). Actual: no `web/src` change;
  spec about 380 lines (the evidence per question, the workspace-switch design, the upstream proposal, the cost table,
  the review's fixes took the room); prototype 205 lines of own code plus the 6.7k-line copy.

### Review gate
| Finding | Verdict | Outcome |
| --- | --- | --- |
| M1 one undo vs the checkpoint size pass, cyclic graph | confirmed (skeptic probe) | fixed: §3.4, §1.2, D4, §9.2 |
| M2 empty Progress section | refuted as spec defect | this section |
| S1 cost table, in-place domain writers | confirmed | fixed: §1.1, §5 |
| S2 page covers the pinned rail | confirmed | fixed: §2.3, §7 |
| S3 bundle numbers vs a dev build | refuted (`--prd` ran) | clarified in §4.3 (X3) |
| S4 two sources of truth for the workspace | confirmed | fixed: §6.1, §6.5 |
| S5 reactView precedent | confirmed, nit | fixed: §2.1 |
| S6 [run] labels, theming | confirmed in part | fixed: §2.1, §2.3, §2.5, §3.3, §3.5 |
| S7 D10 vs §8.2 | confirmed | fixed: D10 |
| S8 README row | confirmed | fixed |
| X1 §9.2 check on plain HIV | confirmed | fixed: uses hivfull |
| X2 RecipeSaver writes in export | confirmed | fixed: §3.4, §5 |
| N1 writer count | confirmed | fixed: about 10 |
| N5 TODO items 4, 10, 11, 12 | confirmed | fixed: §11 |
| N6 unused pdb copy | confirmed | fixed: §2.8 |
| N2, N3 | refuted | none |
| N4 length | confirmed | recorded above |

