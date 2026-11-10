import type { WorkoutBlockType, WorkoutPlan } from '@/domain/workout/workout.types'
import type { FocusRating, WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import type { FocusSkill } from './focusSkill.types'

export interface FocusSkillAssessment extends Omit<FocusRating, 'assessment'> {
  assessment: number | 'unableToRate'
  sessionId: string
  workoutDate: string
  planName: string
  currentCriterion: boolean
}

/** Oldest first, with stable ordering for multiple occurrences on the same day. */
export function selectFocusSkillAssessments(skill: FocusSkill, sessions: readonly WorkoutSession[]): FocusSkillAssessment[] {
  return sessions.filter((session) => session.source === 'plan')
    .sort((a, b) => a.workoutDate.localeCompare(b.workoutDate) || a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id))
    .flatMap((session) => session.focusRatings.flatMap((rating) =>
      rating.focusSkillId === skill.id && rating.assessment !== null ? [{ ...rating,
        assessment: rating.assessment, sessionId: session.id, workoutDate: session.workoutDate,
        planName: session.workoutPlanNameSnapshot, currentCriterion: rating.criterionSnapshot === skill.criterion,
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

export function selectFocusSkillChart(assessments: readonly FocusSkillAssessment[], capacity: number, today: string) {
  const points = assessments.filter((rating) => typeof rating.assessment === 'number')
  const limited = points.length > capacity
  const cutoff = new Date(`${today}T00:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - 84)
  const start = cutoff.toISOString().slice(0, 10)
  const criterionChangedAt = assessments.some((rating) => !rating.currentCriterion)
    ? assessments.find((rating) => rating.currentCriterion)?.workoutDate ?? null : null
  return { points: limited ? points.filter((rating) => rating.workoutDate >= start && rating.workoutDate <= today) : points,
    limited, criterionChangedAt, start: limited ? start : null }
}

export function hasFocusSkillEntries(id: string, sessions: readonly WorkoutSession[]): boolean {
  return sessions.some((session) => session.source === 'plan' && session.focusRatings.some((rating) => rating.focusSkillId === id))
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
