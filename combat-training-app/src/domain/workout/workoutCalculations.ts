import type {
  WorkoutBlock,
  WorkoutExercise,
  WorkoutItem,
  WorkoutPlanDraft,
} from '@/domain/workout/workout.types'

export interface WorkoutPlanSummary {
  exerciseCount: number
  plannedRoundCount: number
  activeWorkSeconds: number
  roundRestSeconds: number
  standaloneBreakSeconds: number
  totalRestSeconds: number
  estimatedTotalSeconds: number
}

/** Summary calculations depend only on block structure, not discipline or name. */
export type WorkoutPlanCalculable = Pick<WorkoutPlanDraft, 'blocks'>

function isExercise(item: WorkoutItem): item is WorkoutExercise {
  return item.type === 'exercise'
}

function forEachItem(blocks: readonly WorkoutBlock[], visit: (item: WorkoutItem) => void): void {
  for (const block of blocks) {
    for (const item of block.items) {
      visit(item)
    }
  }
}

export function calculateExerciseCount(plan: WorkoutPlanCalculable): number {
  let count = 0

  forEachItem(plan.blocks, (item) => {
    if (isExercise(item)) {
      count += 1
    }
  })

  return count
}

export function calculatePlannedRoundCount(plan: WorkoutPlanCalculable): number {
  let count = 0

  forEachItem(plan.blocks, (item) => {
    if (isExercise(item) && item.configuration.mode === 'rounds') {
      count += item.configuration.roundCount
    }
  })

  return count
}

export function calculateActiveWorkSeconds(plan: WorkoutPlanCalculable): number {
  let total = 0

  forEachItem(plan.blocks, (item) => {
    if (!isExercise(item)) {
      return
    }

    if (item.configuration.mode === 'rounds') {
      total += item.configuration.roundCount * item.configuration.roundDurationSeconds
      return
    }

    total += item.configuration.durationSeconds
  })

  return total
}

export function calculateRoundRestSeconds(plan: WorkoutPlanCalculable): number {
  let total = 0

  forEachItem(plan.blocks, (item) => {
    if (!isExercise(item) || item.configuration.mode !== 'rounds') {
      return
    }

    const { roundCount, restBetweenRoundsSeconds } = item.configuration
    total += Math.max(roundCount - 1, 0) * restBetweenRoundsSeconds
  })

  return total
}

/**
 * Standalone breaks are explicit `WorkoutBreak` items inside a block.
 * Inter-block rest is represented as the last item of the preceding block,
 * not as a separate global plan-level list.
 */
export function calculateStandaloneBreakSeconds(plan: WorkoutPlanCalculable): number {
  let total = 0

  forEachItem(plan.blocks, (item) => {
    if (item.type === 'break') {
      total += item.durationSeconds
    }
  })

  return total
}

export function calculateTotalRestSeconds(plan: WorkoutPlanCalculable): number {
  return calculateRoundRestSeconds(plan) + calculateStandaloneBreakSeconds(plan)
}

export function calculateEstimatedTotalSeconds(plan: WorkoutPlanCalculable): number {
  return calculateActiveWorkSeconds(plan) + calculateTotalRestSeconds(plan)
}

export function calculateWorkoutPlanSummary(plan: WorkoutPlanCalculable): WorkoutPlanSummary {
  const activeWorkSeconds = calculateActiveWorkSeconds(plan)
  const roundRestSeconds = calculateRoundRestSeconds(plan)
  const standaloneBreakSeconds = calculateStandaloneBreakSeconds(plan)
  const totalRestSeconds = roundRestSeconds + standaloneBreakSeconds

  return {
    exerciseCount: calculateExerciseCount(plan),
    plannedRoundCount: calculatePlannedRoundCount(plan),
    activeWorkSeconds,
    roundRestSeconds,
    standaloneBreakSeconds,
    totalRestSeconds,
    estimatedTotalSeconds: activeWorkSeconds + totalRestSeconds,
  }
}
