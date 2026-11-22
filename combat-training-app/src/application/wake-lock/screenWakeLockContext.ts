import { createContext, useContext } from 'react'
import type { ScreenWakeLockService } from './screenWakeLock'

export const ScreenWakeLockContext = createContext<(() => ScreenWakeLockService) | null>(null)

export function useScreenWakeLockFactory() {
  const createWakeLock = useContext(ScreenWakeLockContext)
  if (!createWakeLock) throw new Error('ScreenWakeLockContext provider is missing')
  return createWakeLock
}
