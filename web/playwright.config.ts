import { defineConfig } from '@playwright/test'

// Each lane runs its own dev server: E2E_PORT picks it (How we work, CLAUDE.md), so two lanes
// running e2e at once never test each other's server through reuseExistingServer.
const port = Number(process.env.E2E_PORT ?? 5173)

export default defineConfig({
  testDir: './tests/e2e',
  webServer: [
    {
      command: `npm run dev -- --port ${port} --strictPort`,
      url: `http://localhost:${port}`,
      reuseExistingServer: !process.env.E2E_PORT,
    },
    // The production build (run `npm run build` first, as the checks do), for the frame-budget checks: React's
    // development build costs several times the production one per frame (recipe-view-port, Learned).
    {
      command: `npx vite preview --port ${port + 10} --strictPort`,
      url: `http://localhost:${port + 10}`,
      reuseExistingServer: !process.env.E2E_PORT,
    },
  ],
  use: {
    baseURL: `http://localhost:${port}`,
    // The Recipe View is a 2D canvas: rasterise it on the CPU, so the frame-budget checks time the canvas's own work
    // rather than SwiftShader's GPU-accelerated 2D path (rAF p50 8.4 ms at 120 Hz with it off, 17 ms with it on).
    // Mol-star needs a real WebGL2 context; headless Chromium's default backend can't provide
    // one (`Could not create a WebGL rendering context`) without explicitly picking software
    // rendering — see web/README-modernization.md's "Phase 4 progress: viewer mount" section.
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-webgl2', '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas'],
    },
  },
})
