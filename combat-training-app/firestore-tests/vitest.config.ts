import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['firestore-tests/**/*.test.ts'],
    // Every test clears the same demo database.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
})
