import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyThemeToDocument,
  parseThemeMode,
  persistThemeMode,
  readStoredThemeMode,
  readSystemThemeMode,
  resolveThemeMode,
  subscribeToSystemTheme,
  SYSTEM_THEME_QUERY,
  THEME_COLOR_BY_MODE,
  THEME_STORAGE_KEY,
} from '@/features/theme/themeStorage'

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8')
const bootstrapScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]

function mockDocument(hasMeta = true) {
  const root = { setAttribute: vi.fn() }
  const meta = { setAttribute: vi.fn() }
  const document = { documentElement: root, querySelector: vi.fn(() => hasMeta ? meta : null) }
  return { document, root, meta }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn() })
  vi.stubGlobal('window', { matchMedia: vi.fn(() => ({ matches: true })) })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('theme preferences', () => {
  it.each(['light', 'dark'] as const)('reads and persists the explicit %s preference', (mode) => {
    vi.mocked(localStorage.getItem).mockReturnValue(mode)
    expect(readStoredThemeMode()).toBe(mode)
    expect(localStorage.getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY)

    persistThemeMode(mode)
    expect(localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, mode)
  })

  it.each([null, undefined, '', 'LIGHT', 'system', '{}', 0])('rejects invalid preference %s', (value) => {
    expect(parseThemeMode(value)).toBeNull()
    expect(resolveThemeMode(value, 'light')).toBe('light')
    expect(resolveThemeMode(value, 'dark')).toBe('dark')
  })

  it('treats missing or corrupted storage as no explicit choice', () => {
    expect(readStoredThemeMode()).toBeNull()
    vi.mocked(localStorage.getItem).mockReturnValue('broken')
    expect(readStoredThemeMode()).toBeNull()
  })

  it('handles storage read and write failures', () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw new Error('Storage blocked') })
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('Quota exceeded') })
    expect(readStoredThemeMode()).toBeNull()
    expect(() => persistThemeMode('light')).not.toThrow()
  })

  it('handles an unavailable storage API', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(readStoredThemeMode()).toBeNull()
    expect(() => persistThemeMode('dark')).not.toThrow()
  })

  it.each(['dark', 'light'] as const)('resolves the %s system theme without persisting it', (mode) => {
    vi.stubGlobal('window', { matchMedia: vi.fn(() => ({ matches: mode === 'dark' })) })
    expect(readSystemThemeMode()).toBe(mode)
    expect(window.matchMedia).toHaveBeenCalledWith(SYSTEM_THEME_QUERY)
    expect(resolveThemeMode(null, readSystemThemeMode())).toBe(mode)
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })

  it.each(['light', 'dark'] as const)('gives the explicit %s choice priority over the system', (mode) => {
    expect(resolveThemeMode(mode, 'dark')).toBe(mode)
    expect(resolveThemeMode(mode, 'light')).toBe(mode)
  })

  it('subscribes to system changes and removes its listener on cleanup', () => {
    const listeners = new EventTarget()
    const mediaQuery = {
      addEventListener: vi.fn(listeners.addEventListener.bind(listeners)),
      removeEventListener: vi.fn(listeners.removeEventListener.bind(listeners)),
    }
    vi.stubGlobal('window', { matchMedia: vi.fn(() => mediaQuery) })
    const onChange = vi.fn()
    const unsubscribe = subscribeToSystemTheme(onChange)

    listeners.dispatchEvent(new Event('change'))
    expect(onChange).toHaveBeenCalledTimes(1)
    unsubscribe()
    listeners.dispatchEvent(new Event('change'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', onChange)
  })

  it('falls back to dark without matchMedia', () => {
    vi.stubGlobal('window', {})
    expect(readSystemThemeMode()).toBe('dark')
    expect(() => subscribeToSystemTheme(vi.fn())()).not.toThrow()
  })
})

describe('document theme', () => {
  it.each(['dark', 'light'] as const)('applies %s and updates the browser bar', (mode) => {
    const { document, root, meta } = mockDocument()
    vi.stubGlobal('document', document)
    applyThemeToDocument(mode)
    expect(root.setAttribute).toHaveBeenCalledWith('data-theme', mode)
    expect(meta.setAttribute).toHaveBeenCalledWith('content', THEME_COLOR_BY_MODE[mode])
  })

  it('applies the theme when the optional meta element is missing', () => {
    const { document, root } = mockDocument(false)
    vi.stubGlobal('document', document)
    expect(() => applyThemeToDocument('light')).not.toThrow()
    expect(root.setAttribute).toHaveBeenCalledWith('data-theme', 'light')
  })
})

describe('pre-paint bootstrap', () => {
  const cases = [
    { stored: null, system: 'light', expected: 'light' },
    { stored: null, system: 'dark', expected: 'dark' },
    { stored: 'invalid', system: 'light', expected: 'light' },
    { stored: 'invalid', system: 'dark', expected: 'dark' },
    { stored: 'dark', system: 'light', expected: 'dark' },
    { stored: 'light', system: 'dark', expected: 'light' },
  ] as const

  it.each(cases)('uses $expected for stored=$stored and system=$system', ({ stored, system, expected }) => {
    const { document, root, meta } = mockDocument()
    const getItem = vi.fn(() => stored)
    const matchMedia = vi.fn(() => ({ matches: system === 'dark' }))
    expect(bootstrapScript).toBeDefined()
    runInNewContext(bootstrapScript ?? '', { document, localStorage: { getItem }, window: { matchMedia } })

    expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY)
    expect(matchMedia).toHaveBeenCalledWith(SYSTEM_THEME_QUERY)
    expect(root.setAttribute).toHaveBeenCalledWith('data-theme', expected)
    // Guard the duplicated bootstrap colours against drifting from the runtime.
    expect(meta.setAttribute).toHaveBeenCalledWith('content', THEME_COLOR_BY_MODE[expected])
    expect(resolveThemeMode(stored, system)).toBe(expected)
  })

  it.each(['dark', 'light'] as const)('uses the %s system theme when the storage getter throws', (mode) => {
    const { document, root } = mockDocument()
    runInNewContext(bootstrapScript ?? '', {
      document,
      get localStorage() { throw new Error('Storage access denied') },
      window: { matchMedia: () => ({ matches: mode === 'dark' }) },
    })
    expect(root.setAttribute).toHaveBeenCalledWith('data-theme', mode)
  })

  it('supports missing browser APIs and a missing meta element', () => {
    const { document, root } = mockDocument(false)
    expect(() => runInNewContext(bootstrapScript ?? '', { document, window: {} })).not.toThrow()
    expect(root.setAttribute).toHaveBeenCalledWith('data-theme', 'dark')
  })
})
