import { useEffect, useState } from 'react'
import { useWorkoutData } from '@/application/workoutDataContext'
import { accountLabels } from './accountLabels'

export function useAccountAvailability() {
  const data = useWorkoutData()
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  const sources = [data.exercises, data.profile, data.bodyWeights, data.wellbeing, data.plans, data.sessions, data.focusSkills, data.weekPlans, data.recurringWeeks]
  const pending = sources.some((source) => source.hasPendingWrites)
  const loading = sources.some((source) => source.status === 'loading')
  return { blocked: !online || pending || loading, reason: pending ? accountLabels.pending : !online ? accountLabels.offline : null }
}
