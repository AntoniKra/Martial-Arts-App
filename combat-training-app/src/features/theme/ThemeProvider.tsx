import { useCallback, useState, type PropsWithChildren } from 'react'

import { ThemeContext } from '@/features/theme/themeContext'
import {
  applyThemeToDocument,
  persistThemeMode,
  readThemeModeFromDocument,
} from '@/features/theme/themeStorage'
import type { ThemeMode } from '@/features/theme/theme.types'

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<ThemeMode>(readThemeModeFromDocument)

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
    applyThemeToDocument(mode)
    persistThemeMode(mode)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
