import type { ThemeMode } from '@/features/theme/theme.types'

export const THEME_STORAGE_KEY = 'combat-training.theme'

const THEME_COLOR_BY_MODE: Record<ThemeMode, string> = {
  dark: '#0B0B0D',
  light: '#F1F1EF',
}

export function parseThemeMode(value: string | null | undefined): ThemeMode {
  if (value === 'light') {
    return 'light'
  }

  return 'dark'
}

export function readStoredThemeMode(): ThemeMode {
  try {
    return parseThemeMode(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'dark'
  }
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

export function readThemeModeFromDocument(): ThemeMode {
  return parseThemeMode(document.documentElement.getAttribute('data-theme'))
}
