import { useContext } from 'react'
import { WorkoutDataContext } from '@/application/workoutDataContext'
import { wellbeingWorkoutContext } from '@/domain/wellbeing/wellbeing'
import { hasWellbeingConsent } from '@/domain/wellbeing/wellbeingConsent'
import { wellbeingQuestions } from './wellbeingLabels'

export function WellbeingWorkoutLine({ date, previous = false }: { date: string; previous?: boolean }) {
  const data = useContext(WorkoutDataContext)
  if (!data || !hasWellbeingConsent(data.profile.items[0])) return null
  const state = data.wellbeing
  if (state.status !== 'ready' || !state.complete || state.invalidDocumentIds.length) return null
  const worse = wellbeingWorkoutContext(state.items, date)
  if (worse === null) return null
  const context = worse.length ? worse.map((field) => `${wellbeingQuestions[field].name.toLocaleLowerCase('pl')} gorzej niż zwykle`).join(', ') : 'typowo dla Ciebie'
  return <p className="text-sm leading-relaxed text-muted">{previous ? 'Tamtego dnia' : 'Dziś rano'}: {context}</p>
}
