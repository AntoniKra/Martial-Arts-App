import { defineConfig } from 'vite'

export default defineConfig({
  root: import.meta.dirname,
  build: { outDir: 'dist' },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
})
