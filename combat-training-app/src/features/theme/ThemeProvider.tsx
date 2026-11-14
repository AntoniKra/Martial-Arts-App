import { useCallback, useLayoutEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react'

import { ThemeContext } from '@/features/theme/themeContext'
import {
  applyThemeToDocument,
  persistThemeMode,
  readStoredThemeMode,
  readSystemThemeMode,
  resolveThemeMode,
  subscribeToSystemTheme,
} from '@/features/theme/themeStorage'
import type { ThemePreference } from '@/features/theme/theme.types'

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreference] = useState<ThemePreference>(() => readStoredThemeMode() ?? 'system')
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, readSystemThemeMode)
  const theme = resolveThemeMode(preference, systemTheme)

  useLayoutEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  const setTheme = useCallback((mode: ThemePreference) => {
    setPreference(mode)
    persistThemeMode(mode)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  return (
    <ThemeContext.Provider value={{ theme, preference, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
