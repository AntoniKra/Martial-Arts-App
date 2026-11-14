import { lazy, Suspense, useContext } from 'react'
import { WorkoutDataContext } from '@/application/workoutDataContext'
import { hasWellbeingConsent } from '@/domain/wellbeing/wellbeingConsent'

const Line = lazy(() => import('./WellbeingWorkoutLine').then((module) => ({ default: module.WellbeingWorkoutLine })))
export function LazyWellbeingWorkoutLine(props: { date: string; previous?: boolean }) {
  const data = useContext(WorkoutDataContext)
  return data && hasWellbeingConsent(data.profile.items[0]) ? <Suspense fallback={null}><Line {...props} /></Suspense> : null
}
