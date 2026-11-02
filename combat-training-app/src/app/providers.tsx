import type { PropsWithChildren } from 'react'

import { ThemeProvider } from '@/features/theme/ThemeProvider'

export function AppProviders({ children }: PropsWithChildren) {
  return <ThemeProvider>{children}</ThemeProvider>
}
