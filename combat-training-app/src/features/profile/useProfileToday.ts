import { useEffect, useState } from 'react'
import { calculateWorkoutDate } from '@/domain/workout-session/workoutSessionDefinitions'

const deviceToday = () => calculateWorkoutDate(new Date().toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone)

export function useProfileToday() {
  const [today, setToday] = useState(deviceToday)
  useEffect(() => {
    const refresh = () => setToday(deviceToday())
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
  return today
}
