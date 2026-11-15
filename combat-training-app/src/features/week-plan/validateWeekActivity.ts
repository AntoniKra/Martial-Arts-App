import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { ManualWorkoutPart, WorkoutSessionCategory } from '@/domain/workout-session/workoutSession.types'
import type { WeekActivity, Weekday } from '@/domain/week-plan/weekPlan.types'

export interface WeekActivityDraft {
  kind: WeekActivity['kind']; days: Weekday[]; anyDay: boolean; disciplineKey: DisciplineKey | ''
  startTime: string; endTime: string; parts: ManualWorkoutPart[]; clubName: string
  category: WorkoutSessionCategory; workoutPlanId: string | null; planNameSnapshot: string | null
}

export function validateWeekActivity(draft: WeekActivityDraft, createId: () => string): WeekActivity[] | null {
  const { kind, days } = draft
  const selected = [...new Set(days)]
  if (selected.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return null
  if (!(kind === 'own' && draft.anyDay) && !selected.length) return null
  if (kind === 'club' && (!draft.disciplineKey || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime)
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.endTime) || draft.endTime <= draft.startTime || draft.clubName.trim().length > 100)) return null
  if (kind === 'own' && (draft.workoutPlanId === null) !== (draft.planNameSnapshot === null)) return null
  const targets = kind === 'own' && draft.anyDay ? [null] : selected
  return targets.map((day): WeekActivity => {
    if (kind === 'own') return { id: createId(), kind, day, category: draft.category, workoutPlanId: draft.workoutPlanId, planNameSnapshot: draft.planNameSnapshot }
    if (day === null) throw new Error('A fixed activity requires a day')
    if (kind === 'rest') return { id: createId(), kind, day }
    if (!draft.disciplineKey) throw new Error('A club activity requires a discipline')
    return { id: createId(), kind, day, disciplineKey: draft.disciplineKey, startTime: draft.startTime, endTime: draft.endTime,
      parts: [...new Set(draft.parts)], clubName: draft.clubName.trim() || null }
  })
}
