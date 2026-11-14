import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { commitWhileOnline } from './commitWhileOnline'

const events = new EventTarget()
beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('addEventListener', events.addEventListener.bind(events))
  vi.stubGlobal('removeEventListener', events.removeEventListener.bind(events))
})
afterEach(() => vi.unstubAllGlobals())
it('does not start another write when offline', async () => {
  vi.stubGlobal('navigator', { onLine: false })
  const action = vi.fn()
  await expect(commitWhileOnline(action)).rejects.toThrow('Offline')
  expect(action).not.toHaveBeenCalled()
})
it('rejects promptly on offline, observes a late rejection and allows a new operation', async () => {
  let rejectQueued!: (error: Error) => void
  const queued = commitWhileOnline(() => new Promise<void>((_resolve, reject) => { rejectQueued = reject }))
  const failed = expect(queued).rejects.toThrow('Offline')
  events.dispatchEvent(new Event('offline'))
  await failed
  rejectQueued(new Error('Late server rejection'))
  await expect(commitWhileOnline(async () => 'retry')).resolves.toBe('retry')
})
it('removes the offline handler on success and on synchronous failure', async () => {
  const remove = vi.fn(events.removeEventListener.bind(events)); vi.stubGlobal('removeEventListener', remove)
  await expect(commitWhileOnline(async () => 1)).resolves.toBe(1)
  await expect(commitWhileOnline(() => { throw new Error('Failed') })).rejects.toThrow('Failed')
  expect(remove).toHaveBeenCalledTimes(2)
})
