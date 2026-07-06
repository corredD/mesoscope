import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// @testing-library/react's auto-cleanup relies on a global `afterEach`, which
// isn't registered since this project imports test globals explicitly
// instead of enabling vitest's `globals: true`.
afterEach(() => {
  cleanup()
})

// jsdom has no `ResizeObserver` — needed by the Nightingale custom elements
// (`SequenceFeaturesPanel.tsx`'s `@nightingale-elements/*` imports define their
// custom elements as soon as the module loads, and their `withResizable` mixin
// references `ResizeObserver` eagerly). A minimal no-op stand-in is the standard,
// low-risk fix for this exact gap (real resize behavior isn't something jsdom can
// exercise anyway, same reasoning as dockview's `smoke.test.tsx` mock elsewhere in
// this project — that one mocks the whole library instead because dockview also
// needs real layout measurement jsdom can't provide at all; Nightingale's elements
// don't need real layout to mount without throwing, so a polyfill is enough here).
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
