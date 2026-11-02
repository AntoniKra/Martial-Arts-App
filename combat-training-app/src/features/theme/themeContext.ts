import { createContext } from 'react'

import type { ThemeMode } from '@/features/theme/theme.types'

export interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
