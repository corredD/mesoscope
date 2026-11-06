# Current

What is in flight, one line a lane, linking to its progress file. Only the coordinating session (the main checkout)
edits this file (How we work, root `CLAUDE.md`). What was built is the dated files beside it; what is not built is the
queue (`../TODO.md`).

## In flight

## Waiting on Ludovic

- `prism-architecture`: PR [#51](https://github.com/corredD/mesoscope/pull/51) (branch `lane/prism-architecture`;
  prototype `~/prism-me-lanes/mesoscope-extension` at `ff2b24509`, local only, port 5183). Recommends Mesoscope as an
  extension in prism-me, staged. Decide D1-D10 in `web/_spec/architecture.md` §10; PR #50 waits on D1/D10.

- `builder-mockup`: PR [#50](https://github.com/corredD/mesoscope/pull/50) (branch `lane/builder-mockup`, spec and
  mockups only). Gate: 2 must-fix, 8 should-fix fixed; open nits R16, R19, R20, N2. Check: screens 10 Paint, 11 Place,
  12 Sync (light, `?theme=dark`), design spec §5.7; answer §9's open questions and D12-D15.
