import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { QuickTimerWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { SparringIntensity } from '@/domain/workout/workout.types'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { calculateCompletedWorkoutRounds } from '@/domain/workout-session/workoutSessionDefinitions'
import type { QuickTimerCategory } from './quickTimer'

export interface QuickTimerFeedbackDraft {
  category: QuickTimerCategory
  disciplineKey?: DisciplineKey
  intensity: SparringIntensity | null
  note: string | null
}
export type QuickTimerFeedbackUpdate = Pick<QuickTimerWorkoutSession, 'category' | 'sparring' | 'sparringSeconds' | 'stepResults' | 'note' | 'updatedAt'>
  & Partial<Pick<QuickTimerWorkoutSession, 'disciplineKey'>>

export function prepareQuickTimerFeedback(session: QuickTimerWorkoutSession, draft: QuickTimerFeedbackDraft, updatedAt: string): QuickTimerFeedbackUpdate {
  return {
    category: draft.category, note: draft.note?.trim() || null, updatedAt,
    ...(draft.disciplineKey === undefined ? {} : { disciplineKey: draft.disciplineKey }),
    sparring: draft.category === 'sparring' ? [{ blockId: null, intensity: draft.intensity, rounds: calculateCompletedWorkoutRounds(session.stepResults) }] : [],
    sparringSeconds: draft.category === 'sparring' ? session.workSeconds : 0,
    stepResults: session.stepResults.map((step) => ({ ...step, blockType: draft.category, nameSnapshot: getWorkoutBlockLabelPl(draft.category) })),
  }
}
