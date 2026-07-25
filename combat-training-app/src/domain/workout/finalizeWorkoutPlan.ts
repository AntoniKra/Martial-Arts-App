import { resolveWorkoutPlanDisplayName } from '@/domain/workout/workoutPlanDisplayName'
import type { WorkoutPlan, WorkoutPlanDraft } from '@/domain/workout/workout.types'
import {
  validateWorkoutPlanDraft,
  type WorkoutPlanValidationResult,
} from '@/domain/workout/workoutValidation'

export type FinalizeWorkoutPlanResult =
  | {
      ok: true
      plan: WorkoutPlan
    }
  | {
      ok: false
      validation: WorkoutPlanValidationResult
    }

export function finalizeWorkoutPlan(draft: WorkoutPlanDraft): FinalizeWorkoutPlanResult {
  const validation = validateWorkoutPlanDraft(draft)

  if (!validation.isValid) {
    return {
      ok: false,
      validation,
    }
  }

  if (draft.disciplineKey === null) {
    return {
      ok: false,
      validation,
    }
  }

  const plan: WorkoutPlan = {
    id: draft.id,
    disciplineKey: draft.disciplineKey,
    customName: draft.customName,
    mainGoal: draft.mainGoal,
    blocks: structuredClone(draft.blocks),
    createdAt: draft.createdAt,
    nameSnapshot: resolveWorkoutPlanDisplayName(draft),
  }

  return {
    ok: true,
    plan,
  }
}
