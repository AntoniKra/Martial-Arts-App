import { createContext } from 'react'

import type { ThemeMode, ThemePreference } from '@/features/theme/theme.types'

export interface ThemeContextValue {
  theme: ThemeMode
  preference: ThemePreference
  setTheme: (mode: ThemePreference) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
