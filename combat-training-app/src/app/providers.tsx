import type { PropsWithChildren } from 'react'

import { ThemeProvider } from '@/features/theme/ThemeProvider'
import { AuthBootstrap } from '@/app/AuthBootstrap'

export function AppProviders({ children }: PropsWithChildren) {
  return <ThemeProvider><AuthBootstrap>{children}</AuthBootstrap></ThemeProvider>
}
