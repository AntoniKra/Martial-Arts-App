import { PauseIcon } from '@/components/icons/PauseIcon'
import { PlayIcon } from '@/components/icons/PlayIcon'
import { SkipBackIcon } from '@/components/icons/SkipBackIcon'
import { SkipForwardIcon } from '@/components/icons/SkipForwardIcon'
import type { WorkoutPlaybackStatus } from '@/domain/workout-playback/workoutPlayback.types'
import { workoutPlayerLabels } from '@/features/workout-player/workoutPlayerLabels'

interface WorkoutPlayerControlsProps {
  status: WorkoutPlaybackStatus
  canGoPrevious: boolean
  canGoNext: boolean
  onStart: () => void
  onStartNow: () => void
  onPause: () => void
  onResume: () => void
  onPrevious: () => void
  onNext: () => void
}

function getPrimaryControlLabel(status: WorkoutPlaybackStatus): string {
  switch (status) {
    case 'idle':
      return workoutPlayerLabels.start
    case 'preparing':
      return workoutPlayerLabels.startNow
    case 'running':
      return workoutPlayerLabels.pause
    case 'paused':
      return workoutPlayerLabels.resume
    case 'completed':
      return ''
  }
}

export function WorkoutPlayerControls({
  status,
  canGoPrevious,
  canGoNext,
  onStart,
  onStartNow,
  onPause,
  onResume,
  onPrevious,
  onNext,
}: WorkoutPlayerControlsProps) {
  function handlePrimaryAction() {
    if (status === 'preparing') {
      onStartNow()
      return
    }
    if (status === 'idle') {
      onStart()
      return
    }

    if (status === 'running') {
      onPause()
      return
    }

    if (status === 'paused') {
      onResume()
    }
  }

  const showPause = status === 'running'

  return (
    <div className="controls-bottom-bar">
      <div className="controls-row-3b">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          aria-label={workoutPlayerLabels.previousStep}
          className="player-icon-button m5-flat-control side-control-btn"
        >
          <SkipBackIcon />
        </button>

        <button
          type="button"
          onClick={handlePrimaryAction}
          aria-label={getPrimaryControlLabel(status)}
          className="player-icon-button diamond-wrapper-3b"
        >
          <span className="diamond-shape-3b">
            <span className="diamond-icon-3b">
              {showPause ? <PauseIcon /> : <PlayIcon className="ml-0.5" />}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label={workoutPlayerLabels.nextStep}
          className="player-icon-button m5-flat-control side-control-btn"
        >
          <SkipForwardIcon />
        </button>
      </div>
    </div>
  )
}
