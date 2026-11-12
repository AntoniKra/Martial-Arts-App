import type { ManualFocusRating, ManualWorkoutSession } from '@/domain/workout-session/workoutSession.types'

export const manualFocusRating = (overrides: Partial<ManualFocusRating> = {}): ManualFocusRating => ({
  workoutItemId: null, focusSkillId: 'guard', skillNameSnapshot: 'Guard', criterionSnapshot: 'Chin', blockType: 'bag',
  assessment: 4, correction: null, previousCorrectionCheck: null, ...overrides,
})
export function manualWorkoutSession(overrides: Partial<ManualWorkoutSession> = {}): ManualWorkoutSession {
  return { id: 'manual', source: 'manual', status: 'completed', disciplineKey: 'boxing', category: 'bag',
    workoutDate: '2026-11-12', timezone: 'Europe/Warsaw', durationSeconds: 5400, workSeconds: null, sparringSeconds: null,
    completion: null, rpe: 7, rpeRecordedAt: '2026-11-12T12:00:00.000Z', sparring: [], focusRatings: [], note: null,
    createdAt: '2026-11-12T12:00:00.000Z', updatedAt: '2026-11-12T12:00:00.000Z', ...overrides }
}
