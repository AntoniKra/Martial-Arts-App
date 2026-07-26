import type { WorkoutPlaybackStepKind } from '@/features/workout-player/types/workoutPlayback.types'

export interface WorkoutStepTimerPresentation {
  stateLabel: string
  ringColor: string
  innerFillClass: string
  labelClass: string
}

export function getWorkoutStepTimerPresentation(kind: WorkoutPlaybackStepKind): WorkoutStepTimerPresentation {
  switch (kind) {
    case 'exercise':
      return {
        stateLabel: 'PRACA',
        ringColor: 'var(--app-crimson)',
        innerFillClass: 'bg-crimson/10',
        labelClass: 'text-crimson',
      }
    case 'roundRest':
      return {
        stateLabel: 'ODPOCZYNEK',
        ringColor: 'var(--app-faint)',
        innerFillClass: 'bg-elevated',
        labelClass: 'text-faint',
      }
    case 'break':
      return {
        stateLabel: 'PRZERWA',
        ringColor: 'var(--app-muted)',
        innerFillClass: 'bg-surface',
        labelClass: 'text-muted',
      }
  }
}

export function getWorkoutStepKindShortLabelPl(kind: WorkoutPlaybackStepKind): string {
  switch (kind) {
    case 'exercise':
      return 'Praca'
    case 'roundRest':
      return 'Odpoczynek'
    case 'break':
      return 'Przerwa'
  }
}
