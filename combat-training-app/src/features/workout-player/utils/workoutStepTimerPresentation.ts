import type { WorkoutPlaybackStatus, WorkoutPlaybackStepKind } from '@/domain/workout-playback/workoutPlayback.types'
import { workoutPlayerLabels as labels } from '@/features/workout-player/workoutPlayerLabels'

const stepLabels = { exercise: labels.work, roundRest: labels.roundRest, break: labels.break } as const

export function getWorkoutStepKindShortLabelPl(kind: WorkoutPlaybackStepKind): string {
  return stepLabels[kind]
}

export function getWorkoutTimerPhase(status: WorkoutPlaybackStatus, kind: WorkoutPlaybackStepKind, remainingSeconds: number) {
  if (status === 'preparing') return { phase: 'preparing', label: labels.preparing }
  if (status === 'paused') return { phase: 'paused', label: labels.paused }
  if (status === 'running' && remainingSeconds <= 5) return { phase: 'warning', label: labels.finalSeconds }
  return {
    phase: kind === 'exercise' ? 'work' : 'rest',
    label: stepLabels[kind].toLocaleUpperCase('pl'),
  }
}

export function getWorkoutArcProgress(totalSeconds: number, remainingSeconds: number): number {
  return totalSeconds > 0 ? Math.min(1, Math.max(0, remainingSeconds / totalSeconds)) : 0
}
