# Current

What is in flight, one line a lane, linking to its progress file. Only the coordinating session (the main checkout)
edits this file (How we work, root `CLAUDE.md`). What was built is the dated files beside it; what is not built is the
queue (`../TODO.md`).

## In flight

## Waiting on Ludovic

- `recipe-view-canvas`: PR [#49](https://github.com/corredD/mesoscope/pull/49) (branch `lane/recipe-view-canvas`,
  ports 5182/8092). Gate: 3 must-fix, 4 should-fix, 7 nits (+1 from the skeptic); none refuted; M1-M3, S3, N1, N5
  fixed test-first; open: S1 (label/title colour on the dark background: Ludovic to choose), S2, S4, N2-N4, N6, X1.
  ~2,080 production lines against ~1,300 briefed. Check: legacy and modern side by side on HIV and Influenza
  (layout, colours, labels, popup, legend, gestures, Edit Mode, options, dark theme); Mpn drags smoothly in a
  preview build.

- `ui-design`: PR [#48](https://github.com/corredD/mesoscope/pull/48) (branch `lane/ui-design`, docs and mockups
  only). Gate: 3 must-fix, 10 should-fix, 17 nits; none refuted; must/should fixed, open nits listed in the lane's
  progress file. Check: open `web/design/mockups/index.html` (`?theme=dark`), walk the nine screens, confirm or
  change the ten proposals in `web/_spec/design/README.md §8`.
