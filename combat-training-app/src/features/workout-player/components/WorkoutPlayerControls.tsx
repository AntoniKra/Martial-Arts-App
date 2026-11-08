import { PauseIcon } from '@/components/icons/PauseIcon'
import { PlayIcon } from '@/components/icons/PlayIcon'
import { SkipBackIcon } from '@/components/icons/SkipBackIcon'
import { SkipForwardIcon } from '@/components/icons/SkipForwardIcon'
import type { WorkoutPlaybackStatus } from '@/features/workout-player/types/workoutPlayback.types'
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
      return 'Rozpocznij trening'
    case 'preparing':
      return workoutPlayerLabels.startNow
    case 'running':
      return 'Pauza'
    case 'paused':
      return 'Wznów'
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
    <div className="shrink-0 border-t border-bd bg-surface px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex h-16 items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          aria-label="Poprzedni etap"
          className="flex size-12 shrink-0 items-center justify-center text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SkipBackIcon />
        </button>

        <div className="relative h-16 w-32 shrink-0">
          <button
            type="button"
            onClick={handlePrimaryAction}
            aria-label={getPrimaryControlLabel(status)}
            className="absolute top-1/2 left-1/2 flex size-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-crimson text-on-accent ring-4 ring-bg transition-colors hover:bg-crimson-hi active:bg-crimson"
          >
            {showPause ? <PauseIcon className="size-[38px]" /> : <PlayIcon className="size-[38px]" />}
            {status === 'preparing' ? (
              <span className="absolute inset-x-0 top-[calc(50%+1.5rem)] font-display text-[12px] font-semibold">{workoutPlayerLabels.startNow}</span>
            ) : null}
          </button>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Następny etap"
          className="flex size-12 shrink-0 items-center justify-center text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SkipForwardIcon />
        </button>
      </div>
    </div>
  )
}
