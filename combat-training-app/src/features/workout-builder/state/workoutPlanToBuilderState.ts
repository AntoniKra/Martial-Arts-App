import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutBuilderState } from '@/features/workout-builder/state/workoutBuilder.types'

export function workoutPlanToBuilderState(plan: WorkoutPlan): WorkoutBuilderState {
  return {
    draft: {
      id: plan.id,
      disciplineKey: plan.disciplineKey,
      customName: plan.customName,
      mainGoal: plan.mainGoal,
      blocks: structuredClone(plan.blocks),
      createdAt: plan.createdAt,
    },
    disciplineLocked: plan.blocks.some((block) => block.items.some((item) => item.type === 'exercise')),
    isDirty: false,
  }
}
