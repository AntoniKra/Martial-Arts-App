import { useEffect, useState } from 'react'
import { currentWeekStart } from '@/domain/week-plan/weekCalendar'

export function useCurrentWeek() {
  const [week, setWeek] = useState(() => currentWeekStart())
  useEffect(() => {
    const refresh = () => setWeek(currentWeekStart())
    const interval = window.setInterval(refresh, 1000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    refresh()
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
    }
  }, [])
  return week
}
