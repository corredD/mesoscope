import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// @testing-library/react's auto-cleanup relies on a global `afterEach`, which
// isn't registered since this project imports test globals explicitly
// instead of enabling vitest's `globals: true`.
afterEach(() => {
  cleanup()
})
