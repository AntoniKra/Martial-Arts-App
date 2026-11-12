import type {
  WorkoutBlock,
  WorkoutBlockType,
  WorkoutBreak,
  WorkoutExercise,
  WorkoutPlan,
} from '@/domain/workout/workout.types'
import type { WorkoutPlaybackStep } from '@/domain/workout-playback/workoutPlayback.types'

export function roundsExercise(
  id: string,
  roundCount: number,
  roundDurationSeconds: number,
  restBetweenRoundsSeconds: number,
): WorkoutExercise {
  return {
    id,
    type: 'exercise',
    combinationId: null,
    focusSkillId: null,
    exerciseNameSnapshot: `Exercise ${id}`,
    instruction: null,
    configuration: { mode: 'rounds', roundCount, roundDurationSeconds, restBetweenRoundsSeconds },
  }
}

export function continuousExercise(id: string, durationSeconds: number): WorkoutExercise {
  return {
    id,
    type: 'exercise',
    combinationId: null,
    focusSkillId: null,
    exerciseNameSnapshot: `Exercise ${id}`,
    instruction: null,
    configuration: { mode: 'continuous', durationSeconds },
  }
}

export function workoutBreak(id: string, durationSeconds: number): WorkoutBreak {
  return { id, type: 'break', durationSeconds, instruction: null }
}

export function block(
  id: string,
  items: WorkoutBlock['items'],
  blockType: WorkoutBlockType = 'technique',
): WorkoutBlock {
  return blockType === 'sparring' ? { id, blockType, items, sparringIntensity: null } : { id, blockType, items }
}

export function workoutPlan(blocks: WorkoutBlock[]): WorkoutPlan {
  return {
    id: 'plan-1',
    customName: null,
    mainGoal: null,
    blocks,
    createdAt: '2026-11-02T10:00:00.000Z',
    updatedAt: '2026-11-02T10:00:00.000Z',
    disciplineKey: 'boxing',
    nameSnapshot: 'Boks — 02.11.2026',
  }
}

/** Minimal playback step for timer tests; only the duration matters there. */
export function playbackStep(id: string, durationSeconds: number): WorkoutPlaybackStep {
  return {
    id,
    kind: 'exercise',
    durationSeconds,
    blockIndex: 0,
    blockId: 'block-1',
    blockType: 'technique',
    itemId: id,
    name: id,
    instruction: null,
    roundNumber: null,
    roundCount: null,
  }
}
