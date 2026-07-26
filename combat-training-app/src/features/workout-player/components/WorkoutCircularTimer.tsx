import { formatSecondsAsClock } from '@/features/workout-builder/utils/formatDuration'
import type { WorkoutPlaybackStepKind } from '@/features/workout-player/types/workoutPlayback.types'
import { formatRemainingSecondsAccessiblePl } from '@/features/workout-player/utils/formatRemainingSecondsAccessiblePl'
import { getWorkoutStepTimerPresentation } from '@/features/workout-player/utils/workoutStepTimerPresentation'

const BASE_SIZE = 260
const STROKE_WIDTH = 10
const TRACK_COLOR = 'var(--app-border)'

interface WorkoutCircularTimerProps {
  totalSeconds: number
  remainingSeconds: number
  stepKind: WorkoutPlaybackStepKind
  paused?: boolean
}

function clampProgressRatio(totalSeconds: number, remainingSeconds: number): number {
  const rawProgressRatio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0
  return Math.min(1, Math.max(0, rawProgressRatio))
}

export function WorkoutCircularTimer({
  totalSeconds,
  remainingSeconds,
  stepKind,
  paused = false,
}: WorkoutCircularTimerProps) {
  const presentation = getWorkoutStepTimerPresentation(stepKind)
  const radius = (BASE_SIZE - STROKE_WIDTH) / 2
  const circumference = 2 * Math.PI * radius
  const progressRatio = clampProgressRatio(totalSeconds, remainingSeconds)
  const strokeDashoffset = circumference * (1 - progressRatio)
  const innerInsetPercent = ((STROKE_WIDTH + 4) / BASE_SIZE) * 100

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[260px] min-w-0"
      style={{ maxHeight: 'min(260px, calc(100vw - 2.5rem))' }}
    >
      <div
        className={`absolute rounded-full ${presentation.innerFillClass}`}
        style={{
          inset: `${innerInsetPercent}%`,
        }}
        aria-hidden="true"
      />

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${BASE_SIZE} ${BASE_SIZE}`}
        className="absolute inset-0"
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        <circle
          cx={BASE_SIZE / 2}
          cy={BASE_SIZE / 2}
          r={radius}
          fill="none"
          stroke={TRACK_COLOR}
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          cx={BASE_SIZE / 2}
          cy={BASE_SIZE / 2}
          r={radius}
          fill="none"
          stroke={presentation.ringColor}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="butt"
          className="timer-ring"
        />
      </svg>

      <div className="relative flex h-full flex-col items-center justify-center px-4 text-center">
        {paused ? (
          <span className="mb-1 font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
            WSTRZYMANO
          </span>
        ) : null}
        <span
          className="font-display text-[48px] font-bold tabular-nums leading-none text-ink min-[360px]:text-[56px] sm:text-[64px]"
          aria-hidden="true"
        >
          {formatSecondsAsClock(remainingSeconds)}
        </span>
        <span className="sr-only">{formatRemainingSecondsAccessiblePl(remainingSeconds)}</span>
        <span
          className={`mt-2 font-display text-[10px] font-semibold uppercase tracking-[0.18em] ${presentation.labelClass}`}
        >
          {presentation.stateLabel}
        </span>
      </div>
    </div>
  )
}
