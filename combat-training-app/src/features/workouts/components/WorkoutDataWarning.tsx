import { useWorkoutData } from '@/application/workoutDataContext'

export function WorkoutDataWarning() {
  const { plans, sessions } = useWorkoutData()
  const count = plans.invalidDocumentIds.length + sessions.invalidDocumentIds.length
  return count ? <p role="alert" className="mx-auto max-w-2xl px-4 pt-4 text-[13px] text-crimson-ink">
    Pominięto niepoprawne dokumenty: {count}. Pozostałe dane są dostępne.
  </p> : null
}
