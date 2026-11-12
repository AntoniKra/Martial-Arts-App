import type { WorkoutBlockType, WorkoutPlan } from '@/domain/workout/workout.types'
import type { FocusRating, WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { FocusSkill } from './focusSkill.types'

export interface FocusSkillAssessment extends Omit<FocusRating, 'assessment' | 'workoutItemId'> {
  workoutItemId: string | null
  assessment: number | 'unableToRate'
  sessionId: string
  workoutDate: string
  planName: string
  currentCriterion: boolean
}

/** Oldest first, with stable ordering for multiple occurrences on the same day. */
export function selectFocusSkillAssessments(skill: FocusSkill, sessions: readonly WorkoutSession[]): FocusSkillAssessment[] {
  return sessions.filter((session) => session.source !== 'quickTimer')
    .sort((a, b) => a.workoutDate.localeCompare(b.workoutDate)
      || (a.source === 'manual' ? a.createdAt : a.startedAt).localeCompare(b.source === 'manual' ? b.createdAt : b.startedAt) || a.id.localeCompare(b.id))
    .flatMap((session) => session.focusRatings.flatMap((rating) =>
      rating.focusSkillId === skill.id && rating.assessment !== null ? [{ ...rating,
        assessment: rating.assessment, sessionId: session.id, workoutDate: session.workoutDate,
        planName: session.source === 'plan' ? session.workoutPlanNameSnapshot : 'Trening poza aplikacją', currentCriterion: rating.criterionSnapshot === skill.criterion,
      }] : []))
}

export function median(values: readonly number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function summarizeFocusSkill(assessments: readonly FocusSkillAssessment[]) {
  const current = assessments.filter((rating) => rating.currentCriterion && typeof rating.assessment === 'number')
  const places = [...new Set(current.map((rating) => rating.blockType))].map((blockType: WorkoutBlockType) => {
    const ratings = current.filter((rating) => rating.blockType === blockType)
    const values = ratings.map((rating) => Number(rating.assessment))
    return { blockType, count: values.length, median: median(values), ratings,
      recent: values.slice(-3), earlier: values.slice(-6, -3) }
  })
  return { places, count: current.length, latest: current.at(-1) ?? null,
    unableToRateCount: assessments.filter((rating) => rating.assessment === 'unableToRate').length,
    previousCriterionCount: assessments.filter((rating) => !rating.currentCriterion).length }
}

export function selectFocusSkillChart(assessments: readonly FocusSkillAssessment[], capacity: number) {
  const points = assessments.filter((rating) => typeof rating.assessment === 'number')
  const limited = points.length > capacity
  const end = points.at(-1)?.workoutDate ?? null
  const cutoff = limited && end ? new Date(`${end}T00:00:00Z`) : null
  if (cutoff) cutoff.setUTCDate(cutoff.getUTCDate() - 84)
  const start = cutoff?.toISOString().slice(0, 10) ?? null
  const lastOtherIndex = assessments.reduce((last, rating, index) => rating.currentCriterion ? last : index, -1)
  const criterionChangedAt = lastOtherIndex >= 0
    ? assessments.slice(lastOtherIndex + 1).find((rating) => rating.currentCriterion)?.workoutDate ?? null : null
  return { points: start ? points.filter((rating) => rating.workoutDate >= start) : points,
    limited, criterionChangedAt, start, end }
}

export function hasFocusSkillEntries(id: string, sessions: readonly WorkoutSession[]): boolean {
  return sessions.some((session) => session.source !== 'quickTimer' && session.focusRatings.some((rating) => rating.focusSkillId === id))
}

export function selectFocusSkillPlans(id: string, plans: readonly WorkoutPlan[]): WorkoutPlan[] {
  return plans.filter((plan) => plan.blocks.some((block) => block.items.some((item) => item.type === 'exercise' && item.focusSkillId === id)))
}

/** Preserve exercises and all snapshots, only detach this reusable skill. */
export function detachFocusSkill(plan: WorkoutPlan, id: string, updatedAt: string): WorkoutPlan {
  return { ...plan, updatedAt, blocks: plan.blocks.map((block) => ({ ...block,
    items: block.items.map((item) => item.type === 'exercise' && item.focusSkillId === id ? { ...item, focusSkillId: null } : item),
  })) }
}
