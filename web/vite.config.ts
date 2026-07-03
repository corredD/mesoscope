/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-time proxy to the legacy localCGIServer.py (python3 localCGIServer.py, :8080)
// so the modern app can exercise the same recipe bridge/proxy endpoints and
// example data without duplicating the legacy backend. See README-modernization.md.
const LEGACY_SERVER = 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/recipe_json': LEGACY_SERVER,
      '/recipe_proxy': LEGACY_SERVER,
      '/data': LEGACY_SERVER,
      '/SKILLS.md': LEGACY_SERVER,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules', 'tests/e2e/**'],
  },
})
