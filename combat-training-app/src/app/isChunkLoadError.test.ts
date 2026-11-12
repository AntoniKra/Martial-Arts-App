import { describe, expect, it } from 'vitest'
import { isChunkLoadError } from './isChunkLoadError'

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://example.test/assets/page.js',
    'Importing a module script failed.',
    'error loading dynamically imported module: https://example.test/assets/page.js',
  ])('recognizes a browser import failure: %s', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true)
  })

  it.each([new Error('Unexpected failure'), null, undefined, {}, 'Importing a module script failed.'])('rejects unrelated errors: %s', (error) => {
    expect(isChunkLoadError(error)).toBe(false)
  })
})
