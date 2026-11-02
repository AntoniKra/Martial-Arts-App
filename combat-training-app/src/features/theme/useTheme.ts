import { useContext } from 'react'

import { ThemeContext, type ThemeContextValue } from '@/features/theme/themeContext'

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (context === null) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}
