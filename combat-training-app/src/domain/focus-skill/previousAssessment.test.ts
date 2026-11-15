import { describe, expect, it } from 'vitest'
import { findPreviousAssessment } from './previousAssessment'
import { selectFocusSkillAssessments } from './focusSkillProgress'
import type { FocusSkill } from './focusSkill.types'
import type { FocusRating } from '@/domain/workout-session/workoutSession.types'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import { manualFocusRating, manualWorkoutSession } from '@/test/manualWorkoutBuilder'

const skill: FocusSkill = { id: 'guard', exerciseId: 'personal', name: 'Guard', criterion: 'Chin', archivedAt: null, openCorrection: null,
  createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z' }
const rating = (assessment: FocusRating['assessment'], patch: Partial<FocusRating> = {}): FocusRating => ({ workoutItemId: 'exercise-1', focusSkillId: 'guard',
  skillNameSnapshot: 'Guard', criterionSnapshot: 'Chin', blockType: 'bag', assessment, correction: null, previousCorrectionCheck: null, ...patch })
const session = (id: string, date: string, assessment: FocusRating['assessment'], patch: Partial<FocusRating> = {}) =>
  workoutSession({ id, workoutPlanId: id, workoutDate: date, createdAt: `${date}T10:00:00.000Z`, focusRatings: [rating(assessment, patch)], stepResults: [sessionStep()] })

describe('previous focus assessment', () => {
  it('finds the previous assessment across plans by focusSkillId and preserves the existing trend', () => {
    const sessions = [session('b', '2026-11-02', 4), session('a', '2026-11-01', 2)]
    expect(findPreviousAssessment(sessions[0], 'guard', 'Chin', sessions)).toMatchObject({ assessment: 2, workoutDate: '2026-11-01' })
    expect(selectFocusSkillAssessments(skill, sessions).map((entry) => entry.assessment)).toEqual([2, 4])
    expect(selectFocusSkillAssessments({ ...skill, exerciseId: 'other' }, sessions)).toEqual(selectFocusSkillAssessments(skill, sessions))
  })
  it('ignores null, different criteria, other identities, future entries and the current entry', () => {
    const current = session('current', '2026-11-10', 5)
    const sessions = [current, session('valid', '2026-11-01', 2), session('future', '2026-11-11', 5), session('null', '2026-11-09', null),
      session('criterion', '2026-11-08', 5, { criterionSnapshot: 'Other' }), session('identity', '2026-11-07', 5, { focusSkillId: 'other' })]
    expect(findPreviousAssessment(current, 'guard', 'Chin', sessions)?.assessment).toBe(2)
    expect(findPreviousAssessment(current, 'missing', 'Chin', sessions)).toBeNull()
  })
  it('ignores skipped exercises and preserves unable-to-rate as a textual previous answer', () => {
    const skipped = session('skipped', '2026-11-09', 5)
    skipped.stepResults = [sessionStep({ outcome: 'skipped', performedDurationSeconds: 0 })]
    expect(findPreviousAssessment({ id: 'current', workoutDate: '2026-11-10' }, 'guard', 'Chin',
      [session('unable', '2026-11-08', 'unableToRate'), skipped])?.assessment).toBe('unableToRate')
  })
  it('orders two workouts on the same date by their creation instant', () => {
    const current = session('current', '2026-11-10', 5)
    const earlier = { ...session('earlier', current.workoutDate, 2), createdAt: '2026-11-10T09:00:00.000Z' }
    const later = { ...session('later', current.workoutDate, 4), createdAt: '2026-11-10T11:00:00.000Z' }
    expect(findPreviousAssessment(current, 'guard', 'Chin', [later, earlier])?.assessment).toBe(2)
  })
  it('includes a prior club assessment without requiring a plan or a workout-item reference', () => {
    const manual = manualWorkoutSession({ focusRatings: [manualFocusRating({ assessment: 4 })] })
    expect(findPreviousAssessment({ id: 'new', workoutDate: '2026-11-13' }, 'guard', 'Chin', [manual])).toMatchObject({
      assessment: 4, workoutDate: '2026-11-12', blockType: 'bag',
    })
  })
})
