import { useEffect, useState } from 'react'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import type { WorkoutPlaybackStepKind } from '@/domain/workout-playback/workoutPlayback.types'
import { formatRemainingSecondsAccessiblePl } from '@/features/workout-player/utils/formatRemainingSecondsAccessiblePl'
import { getWorkoutStepTimerPresentation } from '@/features/workout-player/utils/workoutStepTimerPresentation'
import { workoutPlayerLabels } from '@/features/workout-player/workoutPlayerLabels'

const BASE_SIZE = 260
const STROKE_WIDTH = 10
const TRACK_COLOR = 'var(--app-border)'

interface WorkoutCircularTimerProps {
  totalSeconds: number
  remainingSeconds: number
  stepKind: WorkoutPlaybackStepKind
  paused?: boolean
  preparing?: boolean
  showAdjustmentPreview?: boolean
  adjustmentVariant?: '1' | '2' | '3'
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
  preparing = false,
  showAdjustmentPreview = false,
  adjustmentVariant = '1',
}: WorkoutCircularTimerProps) {
  const [adjustmentNotice, setAdjustmentNotice] = useState<{ label: string } | null>(null)

  useEffect(() => {
    if (!adjustmentNotice) return
    const timeout = window.setTimeout(() => setAdjustmentNotice(null), 1000)
    return () => window.clearTimeout(timeout)
  }, [adjustmentNotice])

  const presentation = getWorkoutStepTimerPresentation(stepKind)
  const radius = (BASE_SIZE - STROKE_WIDTH) / 2
  const circumference = 2 * Math.PI * radius
  const progressRatio = clampProgressRatio(totalSeconds, remainingSeconds)
  const strokeDashoffset = circumference * (1 - progressRatio)
  const innerInsetPercent = ((STROKE_WIDTH + 4) / BASE_SIZE) * 100

  return (
    <div className="flex w-full flex-col items-center">
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
            <span className="mb-1 font-display text-[16px] font-semibold uppercase tracking-[0.14em] text-muted">
              WSTRZYMANO
            </span>
          ) : null}
          <span
            className="font-display text-[48px] font-bold tabular-nums leading-none text-ink min-[360px]:text-[56px] sm:text-[64px]"
            aria-hidden="true"
          >
            {preparing ? remainingSeconds : formatSecondsAsClock(remainingSeconds)}
          </span>
          <span className="sr-only">{formatRemainingSecondsAccessiblePl(remainingSeconds)}</span>
          <span
            className={`mt-2 font-display text-[16px] font-semibold uppercase tracking-[0.18em] ${presentation.labelClass}`}
          >
            {preparing ? workoutPlayerLabels.preparing : presentation.stateLabel}
          </span>
        </div>

        {showAdjustmentPreview ? (['subtract', 'add'] as const).map((direction) => {
          const subtract = direction === 'subtract'
          const symbol = subtract ? '−' : '+'
          const positionClass = adjustmentVariant === '3'
            ? `${subtract ? '-left-[17px]' : '-right-[17px]'} top-1/2`
            : `${subtract ? '-left-11' : '-right-11'} ${paused ? 'top-1/2' : 'top-[calc(50%-0.75rem)]'}`

          return (
            <button
              key={direction}
              type="button"
              aria-label={subtract ? 'Odejmij 15 sekund' : 'Dodaj 15 sekund'}
              onClick={() => setAdjustmentNotice({ label: `${symbol}15 s` })}
              className={`absolute ${positionClass} flex h-11 w-11 -translate-y-1/2 flex-col items-center justify-center text-faint hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]`}
            >
              <span
                aria-hidden="true"
                className={adjustmentVariant === '3'
                  ? 'flex h-8 w-8 items-center justify-center rounded-full border border-current bg-bg text-[26px] font-light leading-none'
                  : 'text-[32px] font-light leading-none'}
              >
                {symbol}
              </span>
              {adjustmentVariant === '2' ? (
                <span aria-hidden="true" className="font-display text-[10px] font-semibold leading-3 tracking-[0.08em]">
                  15 s
                </span>
              ) : null}
            </button>
          )
        }) : null}
      </div>
      {showAdjustmentPreview ? (
        <p className="mt-2 h-5 font-display text-[13px] font-semibold tabular-nums text-muted" aria-live="polite" aria-atomic="true">
          {adjustmentNotice?.label ?? ''}
        </p>
      ) : null}
    </div>
  )
}
