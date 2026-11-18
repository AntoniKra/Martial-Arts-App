import * as z from 'zod/mini'
import type { ThemeMode, ThemePreference } from '@/features/theme/theme.types'

export const THEME_STORAGE_KEY = 'combat-training.theme'
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

export const THEME_COLOR_BY_MODE: Record<ThemeMode, string> = {
  dark: '#0B0B0D',
  light: '#F1F1EF',
}

const preferenceSchema = z.enum(['light', 'dark', 'system'])

export function parseThemeMode(value: unknown): ThemePreference | null {
  const result = preferenceSchema.safeParse(value)
  return result.success ? result.data : null
}

export function readStoredThemeMode(): ThemePreference | null {
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
  const parsed = parseThemeMode(preference)
  return parsed === 'light' || parsed === 'dark' ? parsed : systemTheme
}

export function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY)
  mediaQuery.addEventListener('change', onChange)

  return () => mediaQuery.removeEventListener('change', onChange)
}

export function persistThemeMode(mode: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
}

export function applyThemeToDocument(mode: ThemeMode): void {
  const root = document.documentElement
  root.setAttribute('data-theme-changing', '')
  root.setAttribute('data-theme', mode)
  // Commit the whole palette before re-enabling control transitions: intermediate
  // foreground/background pairs during a theme change can fail text contrast.
  void root.offsetWidth
  root.removeAttribute('data-theme-changing')

  const themeColorMeta = document.querySelector('meta[name="theme-color"]')

  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', THEME_COLOR_BY_MODE[mode])
  }
}
