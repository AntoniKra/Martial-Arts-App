import type { ThemeMode } from '@/features/theme/theme.types'

export const THEME_STORAGE_KEY = 'combat-training.theme'
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

export const THEME_COLOR_BY_MODE: Record<ThemeMode, string> = {
  dark: '#0B0B0D',
  light: '#F1F1EF',
}

export function parseThemeMode(value: unknown): ThemeMode | null {
  return value === 'light' || value === 'dark' ? value : null
}

export function readStoredThemeMode(): ThemeMode | null {
  try {
    return parseThemeMode(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

export function readSystemThemeMode(): ThemeMode {
  return typeof window.matchMedia === 'function' && !window.matchMedia(SYSTEM_THEME_QUERY).matches
    ? 'light'
    : 'dark'
}

export function resolveThemeMode(preference: unknown, systemTheme: ThemeMode): ThemeMode {
  return parseThemeMode(preference) ?? systemTheme
}

export function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY)
  mediaQuery.addEventListener('change', onChange)

  return () => mediaQuery.removeEventListener('change', onChange)
}

export function persistThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
}

export function applyThemeToDocument(mode: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', mode)

  const themeColorMeta = document.querySelector('meta[name="theme-color"]')

  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', THEME_COLOR_BY_MODE[mode])
  }
}
