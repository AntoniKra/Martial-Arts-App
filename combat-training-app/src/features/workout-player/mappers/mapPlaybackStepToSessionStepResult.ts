import type { WorkoutSessionStepResult, WorkoutSessionStepOutcome } from '@/domain/workout-session/workoutSession.types'
import type { WorkoutPlaybackStep } from '@/features/workout-player/types/workoutPlayback.types'

export function mapPlaybackStepToSessionStepResult(
  step: WorkoutPlaybackStep,
  performedDurationSeconds: number,
  outcome: WorkoutSessionStepOutcome,
): WorkoutSessionStepResult {
  return {
    playbackStepId: step.id,
    workoutItemId: step.itemId,
    blockId: step.blockId,
    blockType: step.blockType,
    kind: step.kind,
    nameSnapshot: step.name,
    roundNumber: step.roundNumber,
    roundCount: step.roundCount,
    plannedDurationSeconds: step.durationSeconds,
    performedDurationSeconds,
    outcome,
  }
}
