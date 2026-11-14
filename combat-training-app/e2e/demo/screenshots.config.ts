import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import base from '../../playwright.config'

// A .tour.ts suffix keeps this route out of the ordinary E2E discovery and CI.
export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: 'screenshots.tour.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: 'list',
  outputDir: '../../test-results/screenshots-tour',
  use: { ...base.use, actionTimeout: 10_000, screenshot: 'off', trace: 'off', video: 'off' },
  // Keep the emulator-configured preview independent of an ordinary build in dist/.
  webServer: {
    ...base.webServer,
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    command: 'npm run build -- --outDir test-results/screenshots-tour-app && npm run preview -- --outDir test-results/screenshots-tour-app --host 127.0.0.1 --port 4173 --strictPort',
  },
  projects: [
    { name: 'telefon-ciemny', use: { viewport: { width: 360, height: 800 }, colorScheme: 'dark' } },
    { name: 'telefon-jasny', use: { viewport: { width: 360, height: 800 }, colorScheme: 'light' } },
    { name: 'komputer-ciemny', use: { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' } },
    { name: 'komputer-jasny', use: { viewport: { width: 1440, height: 900 }, colorScheme: 'light' } },
  ],
})
