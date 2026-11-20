import { useEffect, useState } from 'react'
import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import { formatRemainingSecondsAccessiblePl } from '@/features/workout-player/utils/formatRemainingSecondsAccessiblePl'
import { getWorkoutArcProgress } from '@/features/workout-player/utils/workoutStepTimerPresentation'
import { workoutPlayerLabels as labels } from '@/features/workout-player/workoutPlayerLabels'

const ARC_LENGTH = 75

interface WorkoutCircularTimerProps {
  totalSeconds: number
  remainingSeconds: number
  phaseLabel: string
  preparing: boolean
  onAdjustTime?: (deltaSeconds: -15 | 15) => void
}

export function WorkoutCircularTimer({
  totalSeconds,
  remainingSeconds,
  phaseLabel,
  preparing,
  onAdjustTime,
}: WorkoutCircularTimerProps) {
  const [adjustmentNotice, setAdjustmentNotice] = useState<{ label: string } | null>(null)

  useEffect(() => {
    if (!adjustmentNotice) return
    const timeout = window.setTimeout(() => setAdjustmentNotice(null), 1000)
    return () => window.clearTimeout(timeout)
  }, [adjustmentNotice])

  const progress = getWorkoutArcProgress(totalSeconds, remainingSeconds)
  const digits = preparing ? String(remainingSeconds) : formatSecondsAsClock(remainingSeconds).padStart(5, '0')

  return (
    <div className="timer-center-area">
      <div className="timer-wrap-2b">
        <div className="timer-digits-container">
          <span
            className={`timer-digits${digits.length === 1 ? ' single-digit' : ''}${digits.length > 5 ? ' timer-digits-compact' : ''}`}
            aria-hidden="true"
          >
            {digits}
          </span>
          <span className="sr-only">{formatRemainingSecondsAccessiblePl(remainingSeconds)}</span>
        </div>
        <svg className="timer-svg-2b" viewBox="0 0 300 300" aria-hidden="true">
          <g transform="rotate(135 150 150)" strokeLinecap="round">
            <circle className="arc-track" cx="150" cy="150" r="138" pathLength="100" strokeDasharray="75 25" />
            <circle
              className="arc-progress" cx="150" cy="150" r="138" pathLength="100"
              strokeDasharray={`${ARC_LENGTH * progress} 100`} visibility={progress === 0 ? 'hidden' : undefined}
            />
          </g>
        </svg>
        <span className="arc-phase-opening">{phaseLabel}</span>
        {onAdjustTime ? ([-15, 15] as const).map((delta) => {
          const subtract = delta < 0
          const symbol = subtract ? '−' : '+'
          return (
            <button
              key={delta}
              type="button"
              aria-label={subtract ? labels.subtractTime : labels.addTime}
              onClick={() => {
                onAdjustTime(delta)
                setAdjustmentNotice({ label: `${symbol}${labels.timeAdjustment}` })
              }}
              className={`player-adjust-time player-icon-button ${subtract ? 'player-adjust-subtract' : 'player-adjust-add'}`}
            >
              <span aria-hidden="true" className="player-adjust-sign">{symbol}</span>
              <span aria-hidden="true" className="player-adjust-label">{labels.timeAdjustment}</span>
            </button>
          )
        }) : null}
      </div>
      <p className="player-adjust-notice" aria-live="polite" aria-atomic="true">
        {onAdjustTime ? adjustmentNotice?.label ?? '' : ''}
      </p>
    </div>
  )
}
