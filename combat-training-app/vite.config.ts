import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import { readDeployFirebaseConfig } from './src/infrastructure/firebase/firebaseConfig.ts'
import { performancePanelPlugin } from './scripts/perf/panel-plugin.ts'
import packageInfo from './package.json' with { type: 'json' }

// Project in .firebaserc under the "prod" alias. `npm run build:deploy` refuses any other target.
const deployProjectId = 'combat-training-830fb'

export default defineConfig({
  define: {
    __PERF_WEB_VITALS_VERSION__: JSON.stringify(packageInfo.dependencies['web-vitals']),
    __PERF_FIREBASE_VERSION__: JSON.stringify(packageInfo.dependencies.firebase),
  },
  plugins: [performancePanelPlugin(), react(), tailwindcss(), {
    // Fail the deploy build early instead of publishing the configuration error screen.
    name: 'deploy-firebase-config',
    apply: 'build',
    configResolved(config) {
      if (config.mode === 'deploy') readDeployFirebaseConfig(loadEnv(config.mode, config.envDir || config.root, 'VITE_'), deployProjectId)
    },
  }, VitePWA({
    registerType: 'prompt',
    devOptions: { enabled: false },
    // The icons are already precached by globPatterns below, so do not list them twice.
    includeManifestIcons: false,
    manifest: {
      id: '/',
      name: 'Combat Training',
      short_name: 'Combat Training',
      description: 'Planowanie i analiza treningów sportów walki',
      lang: 'pl',
      display: 'standalone',
      start_url: '/',
      theme_color: '#0B0B0D',
      background_color: '#0B0B0D',
      // Temporary icons until the owner approves the final logo.
      icons: [
        { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{html,js,css,ico,png,svg,woff2}'],
      // Polish text needs only the latin and latin-ext font subsets. Other subsets still load from the
      // network when a page uses them, but they are not downloaded up front for offline use.
      globIgnores: ['**/*-{cyrillic,greek,vietnamese}-*.woff2', '**/performance-panel-*.js', '**/performanceNetwork-*.js'],
      navigateFallback: '/index.html',
      // Firebase Hosting serves the Google sign-in handler under /__/auth/ when authDomain is the app domain.
      navigateFallbackDenylist: [/^\/__\//],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
    },
  })],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
  },
  preview: {
    host: '0.0.0.0',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
