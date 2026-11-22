import type { RoundExerciseConfiguration, WorkoutBlock, WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutPlaybackStep, WorkoutPlaybackTimeline } from '@/domain/workout-playback/workoutPlayback.types'
import { MAX_WORKOUT_SESSION_STEPS } from '@/domain/workout-session/workoutSessionLimits'

function countRoundRestSteps({ roundCount, restBetweenRoundsSeconds }: RoundExerciseConfiguration): number {
  return restBetweenRoundsSeconds > 0 ? roundCount - 1 : 0
}

export function countWorkoutPlaybackSteps(blocks: readonly WorkoutBlock[]): number {
  let count = 0
  for (const block of blocks) {
    for (const item of block.items) {
      if (item.type === 'exercise' && item.configuration.mode === 'rounds') {
        count += item.configuration.roundCount + countRoundRestSteps(item.configuration)
      } else {
        count += 1
      }
    }
  }
  return count
}

function createPlaybackStepId(parts: unknown[]): string {
  return JSON.stringify(parts)
}

export function createWorkoutPlaybackTimeline(plan: WorkoutPlan): WorkoutPlaybackTimeline {
  const result = tryCreateWorkoutPlaybackTimeline(plan)
  if (!result.ok) {
    throw new RangeError(`Workout has ${result.stepCount} steps, exceeding the limit of ${MAX_WORKOUT_SESSION_STEPS}`)
  }
  return result.timeline
}

export function tryCreateWorkoutPlaybackTimeline(plan: WorkoutPlan):
  { ok: true; timeline: WorkoutPlaybackTimeline } | { ok: false; stepCount: number } {
  const stepCount = countWorkoutPlaybackSteps(plan.blocks)
  if (stepCount > MAX_WORKOUT_SESSION_STEPS) return { ok: false, stepCount }

  const steps: WorkoutPlaybackStep[] = []

  plan.blocks.forEach((block, blockIndex) => {
    block.items.forEach((item) => {
      if (item.type === 'exercise') {
        if (item.configuration.mode === 'rounds') {
          const { roundCount, roundDurationSeconds, restBetweenRoundsSeconds } = item.configuration
          const roundRestCount = countRoundRestSteps(item.configuration)

          for (let roundNumber = 1; roundNumber <= roundCount; roundNumber += 1) {
            steps.push({
              id: createPlaybackStepId([block.id, item.id, 'exercise', roundNumber]),
              kind: 'exercise',
              durationSeconds: roundDurationSeconds,
              blockIndex,
              blockId: block.id,
              blockType: block.blockType,
              itemId: item.id,
              name: item.exerciseNameSnapshot,
              ...(item.combinationId ? { combinationId: item.combinationId } : {}),
              instruction: item.instruction,
              roundNumber,
              roundCount,
            })

            if (roundNumber <= roundRestCount) {
              steps.push({
                id: createPlaybackStepId([block.id, item.id, 'roundRest', roundNumber]),
                kind: 'roundRest',
                durationSeconds: restBetweenRoundsSeconds,
                blockIndex,
                blockId: block.id,
                blockType: block.blockType,
                itemId: item.id,
                name: item.exerciseNameSnapshot,
                instruction: item.instruction,
                roundNumber: null,
                roundCount: null,
              })
            }
          }

          return
        }

        steps.push({
          id: createPlaybackStepId([block.id, item.id, 'exercise', 'continuous']),
          kind: 'exercise',
          durationSeconds: item.configuration.durationSeconds,
          blockIndex,
          blockId: block.id,
          blockType: block.blockType,
          itemId: item.id,
          name: item.exerciseNameSnapshot,
          ...(item.combinationId ? { combinationId: item.combinationId } : {}),
          instruction: item.instruction,
          roundNumber: null,
          roundCount: null,
        })

        return
      }

      steps.push({
        id: createPlaybackStepId([block.id, item.id, 'break']),
        kind: 'break',
        durationSeconds: item.durationSeconds,
        blockIndex,
        blockId: block.id,
        blockType: block.blockType,
        itemId: item.id,
        name: 'Przerwa',
        instruction: item.instruction,
        roundNumber: null,
        roundCount: null,
      })
    })
  })

  const totalDurationSeconds = steps.reduce((total, step) => total + step.durationSeconds, 0)
  const identity = JSON.stringify({
    planId: plan.id,
    steps: steps.map((step) => [step.id, step.durationSeconds]),
  })

  return { ok: true, timeline: { steps, totalDurationSeconds, identity } }
}
