import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: 'offline.spec.ts',
  outputDir: '../../test-results/firestore-offline',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['./reporter.ts'],
    ['json', { outputFile: 'test-results/firestore-offline/results.json' }],
    ['html', { outputFolder: 'playwright-report/firestore-offline', open: 'never' }],
  ],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npm run spike:firestore:build && vite preview --config spikes/firestore-offline/vite.config.ts --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
