// Production (profiling) build of the step-0 spike, so the numbers are not React-dev numbers.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  root: resolve(__dirname, '../..'),
  plugins: [react()],
  resolve: { alias: { 'react-dom/client': 'react-dom/profiling' } },
  build: { outDir: resolve(__dirname, '../../node_modules/.spike-dist'), emptyOutDir: true, rollupOptions: { input: resolve(__dirname, '../../spike.html') } },
})
