import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadAccountFile } from './downloadAccountFile'

const share = vi.fn()
const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
beforeEach(() => {
  vi.stubGlobal('navigator', { userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5, canShare: () => true, share })
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  vi.stubGlobal('document', { createElement: () => link, body: { append: vi.fn() } })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); share.mockReset(); link.click.mockClear() })

describe('downloadAccountFile in an iPhone PWA', () => {
  it('treats a closed share sheet as a choice, without an error or a second download', async () => {
    share.mockRejectedValue(new DOMException('Share canceled', 'AbortError'))
    await expect(downloadAccountFile('{}', 'dane.json', 'application/json')).resolves.toBeUndefined()
    expect(link.click).not.toHaveBeenCalled()
  })
  it('falls back to the download link when the share sheet is refused', async () => {
    share.mockRejectedValue(new DOMException('Not allowed', 'NotAllowedError'))
    await expect(downloadAccountFile('{}', 'dane.json', 'application/json')).resolves.toBeUndefined()
    expect(link.click).toHaveBeenCalledOnce()
    expect(link.download).toBe('dane.json')
  })
})
