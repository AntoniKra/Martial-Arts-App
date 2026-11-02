import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBrowserScreenWakeLock } from '@/infrastructure/wake-lock/browserScreenWakeLock'

class ScreenLock extends EventTarget implements WakeLockSentinel {
  released = false
  readonly type = 'screen'
  onrelease = null
  release = vi.fn(async () => {
    this.released = true
    this.dispatchEvent(new Event('release'))
  })
}

let visibility: EventTarget & { visibilityState: DocumentVisibilityState }
let lock: ScreenLock
let request: ReturnType<typeof vi.fn<(type: 'screen') => Promise<WakeLockSentinel>>>

function setVisibility(state: DocumentVisibilityState): void {
  visibility.visibilityState = state
  visibility.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  visibility = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState })
  lock = new ScreenLock()
  request = vi.fn<(type: 'screen') => Promise<WakeLockSentinel>>().mockResolvedValue(lock)
  vi.stubGlobal('document', visibility)
  vi.stubGlobal('navigator', { wakeLock: { request } })
})

afterEach(() => vi.unstubAllGlobals())

describe('browser screen wake lock', () => {
  it('holds one screen lock until player completion or exit, including idle and pause', async () => {
    const service = createBrowserScreenWakeLock()
    service.activate()
    await Promise.resolve()
    expect(request).toHaveBeenCalledExactlyOnceWith('screen')
    service.activate()
    setVisibility('visible')
    expect(request).toHaveBeenCalledOnce()
    expect(lock.release).not.toHaveBeenCalled()
    service.dispose()
    expect(lock.release).toHaveBeenCalledOnce()
    setVisibility('visible')
    expect(request).toHaveBeenCalledOnce()
  })

  it('releases when hidden and requests a new lock when visible again', async () => {
    const service = createBrowserScreenWakeLock()
    service.activate()
    await Promise.resolve()
    setVisibility('hidden')
    expect(lock.release).toHaveBeenCalledOnce()
    const secondLock = new ScreenLock()
    request.mockResolvedValue(secondLock)
    setVisibility('visible')
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(2)
    service.dispose()
    expect(secondLock.release).toHaveBeenCalledOnce()
  })

  it('waits for visibility when opened in a hidden tab', () => {
    visibility.visibilityState = 'hidden'
    const service = createBrowserScreenWakeLock()
    service.activate()
    expect(request).not.toHaveBeenCalled()
    setVisibility('visible')
    expect(request).toHaveBeenCalledOnce()
    service.dispose()
  })

  it('reacquires a lock revoked by the browser on the next visibility change', async () => {
    const service = createBrowserScreenWakeLock()
    service.activate()
    await Promise.resolve()
    await lock.release()
    setVisibility('visible')
    expect(request).toHaveBeenCalledTimes(2)
    service.dispose()
  })

  it('silently tolerates a missing API', () => {
    vi.stubGlobal('navigator', {})
    const service = createBrowserScreenWakeLock()
    expect(() => {
      service.activate()
      setVisibility('hidden')
      setVisibility('visible')
      service.dispose()
    }).not.toThrow()
  })

  it('tolerates permission denial and retries on visibility change', async () => {
    request.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'))
    const service = createBrowserScreenWakeLock()
    service.activate()
    await Promise.resolve()
    setVisibility('hidden')
    setVisibility('visible')
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(2)
    service.dispose()
    expect(lock.release).toHaveBeenCalledOnce()
  })

  it('silently tolerates synchronous API and release errors', async () => {
    request.mockImplementationOnce(() => { throw new Error('Unavailable') })
    const service = createBrowserScreenWakeLock()
    service.activate()
    setVisibility('visible')
    await Promise.resolve()
    lock.release.mockImplementationOnce(() => { throw new Error('Already released') })
    expect(() => service.dispose()).not.toThrow()
  })

  it('silently tolerates an asynchronous release error', async () => {
    const service = createBrowserScreenWakeLock()
    service.activate()
    await Promise.resolve()
    lock.release.mockRejectedValueOnce(new Error('Release failed'))
    service.dispose()
    await Promise.resolve()
    expect(lock.release).toHaveBeenCalledOnce()
  })

  it('releases a pending request resolved after completion or unmount', async () => {
    let resolveRequest: (value: WakeLockSentinel) => void = () => {}
    request.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    const service = createBrowserScreenWakeLock()
    service.activate()
    setVisibility('visible')
    expect(request).toHaveBeenCalledOnce()
    service.dispose()
    resolveRequest(lock)
    await Promise.resolve()
    expect(lock.release).toHaveBeenCalledOnce()
  })

  it('does not retain a stale request during a hide/show race', async () => {
    let resolveRequest: (value: WakeLockSentinel) => void = () => {}
    request.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve }))
    const secondLock = new ScreenLock()
    request.mockResolvedValue(secondLock)
    const service = createBrowserScreenWakeLock()
    service.activate()
    setVisibility('hidden')
    setVisibility('visible')
    await Promise.resolve()
    resolveRequest(lock)
    await Promise.resolve()
    expect(lock.release).toHaveBeenCalledOnce()
    expect(secondLock.release).not.toHaveBeenCalled()
    service.dispose()
    expect(secondLock.release).toHaveBeenCalledOnce()
  })

  it('can activate again after effect cleanup (React Strict Mode)', async () => {
    const service = createBrowserScreenWakeLock()
    service.activate()
    service.dispose()
    const secondLock = new ScreenLock()
    request.mockResolvedValue(secondLock)
    service.activate()
    await Promise.resolve()
    expect(lock.release).toHaveBeenCalledOnce()
    expect(secondLock.release).not.toHaveBeenCalled()
    service.dispose()
    expect(secondLock.release).toHaveBeenCalledOnce()
  })
})
