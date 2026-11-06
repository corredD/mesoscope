# Current

What is in flight, one line a lane, linking to its progress file. Only the coordinating session (the main checkout)
edits this file (How we work, root `CLAUDE.md`). What was built is the dated files beside it; what is not built is the
queue (`../TODO.md`).

## In flight

- `prism-architecture` (`~/Developments/mesoscope-lanes/prism-architecture`, branch `lane/prism-architecture`, port
  5183; prototype in `~/prism-me-lanes/mesoscope-extension`, branch `spike/mesoscope-extension`, local only): Mesoscope
  as a Prism/prism-me extension vs two apps, and a Recipe ⇄ Model workspace switch. Brief:
  [2026-11-06-prism-architecture.md](2026-11-06-prism-architecture.md) (on the lane's branch). Started 2026-11-06 on
  Sonnet (background agent). PR #50 waits on its decision.

## Waiting on Ludovic

- `builder-mockup`: PR [#50](https://github.com/corredD/mesoscope/pull/50) (branch `lane/builder-mockup`, spec and
  mockups only). Gate: 2 must-fix, 8 should-fix fixed; open nits R16, R19, R20, N2. Check: screens 10 Paint, 11 Place,
  12 Sync (light, `?theme=dark`), design spec §5.7; answer §9's open questions and D12-D15.
