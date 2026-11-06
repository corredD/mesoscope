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
