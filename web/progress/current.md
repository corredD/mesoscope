# Current

What is in flight, one line a lane, linking to its progress file. Only the coordinating session (the main checkout)
edits this file (How we work, root `CLAUDE.md`). What was built is the dated files beside it; what is not built is the
queue (`../TODO.md`).

## In flight

- `recipe-view-canvas` (`~/Developments/mesoscope-lanes/recipe-view-canvas`, branch `lane/recipe-view-canvas`,
  ports 5182/8092): Recipe view re-ported to a 2D canvas with legacy physics, reusing the oracle and modules of
  `lane/recipe-view-port` (PR #47, closed). Brief: [2026-11-05-recipe-view-canvas.md](2026-11-05-recipe-view-canvas.md)
  (on the lane's branch). **Resumed 2026-11-05** at `9a24392` on Sonnet (background agent): rerun the gate
  (lane-reviewer, lane-skeptic), fixes test-first, PR. `web/tests/_scratch/` is untracked scratch: not for commit.
## Waiting on Ludovic

- `ui-design`: PR [#48](https://github.com/corredD/mesoscope/pull/48) (branch `lane/ui-design`, docs and mockups
  only). Gate: 3 must-fix, 10 should-fix, 17 nits; none refuted; must/should fixed, open nits listed in the lane's
  progress file. Check: open `web/design/mockups/index.html` (`?theme=dark`), walk the nine screens, confirm or
  change the ten proposals in `web/_spec/design/README.md §8`.
