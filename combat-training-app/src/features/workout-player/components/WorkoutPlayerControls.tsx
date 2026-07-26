import { PauseIcon } from '@/components/icons/PauseIcon'
import { PlayIcon } from '@/components/icons/PlayIcon'
import { SkipBackIcon } from '@/components/icons/SkipBackIcon'
import { SkipForwardIcon } from '@/components/icons/SkipForwardIcon'
import type { WorkoutPlaybackStatus } from '@/features/workout-player/types/workoutPlayback.types'

interface WorkoutPlayerControlsProps {
  status: WorkoutPlaybackStatus
  canGoPrevious: boolean
  canGoNext: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onPrevious: () => void
  onNext: () => void
}

function getPrimaryControlLabel(status: WorkoutPlaybackStatus): string {
  switch (status) {
    case 'idle':
      return 'Rozpocznij trening'
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
  onPause,
  onResume,
  onPrevious,
  onNext,
}: WorkoutPlayerControlsProps) {
  function handlePrimaryAction() {
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
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          aria-label="Poprzedni etap"
          className="flex size-12 shrink-0 items-center justify-center text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SkipBackIcon />
        </button>

        <button
          type="button"
          onClick={handlePrimaryAction}
          aria-label={getPrimaryControlLabel(status)}
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-crimson text-on-accent transition-colors hover:bg-crimson-hi active:bg-crimson"
        >
          {showPause ? <PauseIcon /> : <PlayIcon />}
        </button>

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
