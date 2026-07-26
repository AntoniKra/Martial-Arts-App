import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutPlaybackStep, WorkoutPlaybackTimeline } from '@/features/workout-player/types/workoutPlayback.types'

function createPlaybackStepId(parts: unknown[]): string {
  return JSON.stringify(parts)
}

export function createWorkoutPlaybackTimeline(plan: WorkoutPlan): WorkoutPlaybackTimeline {
  const steps: WorkoutPlaybackStep[] = []

  plan.blocks.forEach((block, blockIndex) => {
    block.items.forEach((item) => {
      if (item.type === 'exercise') {
        if (item.configuration.mode === 'rounds') {
          const { roundCount, roundDurationSeconds, restBetweenRoundsSeconds } = item.configuration

          for (let roundNumber = 1; roundNumber <= roundCount; roundNumber += 1) {
            steps.push({
              id: createPlaybackStepId([block.id, item.id, 'exercise', roundNumber]),
              kind: 'exercise',
              durationSeconds: roundDurationSeconds,
              blockIndex,
              blockType: block.blockType,
              itemId: item.id,
              name: item.exerciseNameSnapshot,
              instruction: item.instruction,
              roundNumber,
              roundCount,
            })

            if (roundNumber < roundCount && restBetweenRoundsSeconds > 0) {
              steps.push({
                id: createPlaybackStepId([block.id, item.id, 'roundRest', roundNumber]),
                kind: 'roundRest',
                durationSeconds: restBetweenRoundsSeconds,
                blockIndex,
                blockType: block.blockType,
                itemId: item.id,
                name: item.exerciseNameSnapshot,
                instruction: item.instruction,
                roundNumber: null,
                roundCount,
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
          blockType: block.blockType,
          itemId: item.id,
          name: item.exerciseNameSnapshot,
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

  return {
    steps,
    totalDurationSeconds,
    identity,
  }
}
