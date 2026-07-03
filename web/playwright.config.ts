import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:5173',
    // Mol-star needs a real WebGL2 context; headless Chromium's default backend can't provide
    // one (`Could not create a WebGL rendering context`) without explicitly picking software
    // rendering — see web/README-modernization.md's "Phase 4 progress: viewer mount" section.
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-webgl2', '--ignore-gpu-blocklist'],
    },
  },
})
