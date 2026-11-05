import { describe, expect, it, vi } from 'vitest'
import { requestPersistentStorage } from './persistentStorage'

describe('requestPersistentStorage', () => {
  it('does not ask again when storage is already persistent', async () => {
    const persist = vi.fn(async () => true)
    await expect(requestPersistentStorage({ persisted: async () => true, persist })).resolves.toBe('persisted')
    expect(persist).not.toHaveBeenCalled()
  })

  it('reports the browser decision', async () => {
    await expect(requestPersistentStorage({ persisted: async () => false, persist: async () => true })).resolves.toBe('persisted')
    await expect(requestPersistentStorage({ persisted: async () => false, persist: async () => false })).resolves.toBe('denied')
  })

  it('handles browsers without the API', async () => {
    await expect(requestPersistentStorage(undefined)).resolves.toBe('unsupported')
    await expect(requestPersistentStorage({})).resolves.toBe('unsupported')
  })

  it('never throws when the browser rejects', async () => {
    await expect(requestPersistentStorage({ persisted: async () => false, persist: async () => { throw new Error('blocked') } })).resolves.toBe('error')
  })
})
