import type { ReactNode, Ref } from 'react'

import { formatSecondsAsClock } from '@/domain/time/formatDuration'
import type { WorkoutBreak, WorkoutExercise } from '@/domain/workout/workout.types'
import { formatBreakDuration } from '@/features/workout-builder/utils/formatBreakDuration'
import {
  formatExerciseParams,
  type BlockTimeSummary,
} from '@/features/workout-builder/utils/timelinePresentation'
import { workoutBuilderLabels as labels } from '@/features/workout-builder/workoutBuilderLabels'

interface TimelineBlockHeaderProps {
  position: number
  blockLabel: string
  time: BlockTimeSummary
  /** The builder puts the block menu next to the total; read-only screens leave it out. */
  action?: ReactNode
}

/** Block card header (2C): name, total time and the work / rest ratio bar. */
export function TimelineBlockHeader({ position, blockLabel, time, action }: TimelineBlockHeaderProps) {
  const work = formatSecondsAsClock(time.workSeconds)
  const rest = formatSecondsAsClock(time.restSeconds)

  return (
    <header className="wb-block-header">
      <div className="wb-block-header-top">
        <h3 className="wb-block-name">{labels.blockHeading(position, blockLabel)}</h3>
        <span className="wb-block-total">
          {formatSecondsAsClock(time.totalSeconds)}
          {action}
        </span>
      </div>
      <div className="wb-ratio-bar" role="img" aria-label={labels.blockRatio(work, rest)}>
        <div className="wb-ratio-work" style={{ width: `${time.workPercent}%` }} />
        <div className="wb-ratio-rest" style={{ width: `${time.restPercent}%` }} />
      </div>
      <div className="wb-ratio-labels" aria-hidden="true">
        <span>{labels.blockWork(work)}</span>
        <span>{labels.blockRest(rest)}</span>
      </div>
    </header>
  )
}

interface TimelineExerciseMainProps {
  exercise: WorkoutExercise
  /** Name shown after "★"; nothing is shown when undefined. */
  focusSkillName: string | undefined
  /** Read-only screens show the instruction in the row; the builder shows it in the actions panel. */
  showInstruction?: boolean
  headingRef?: Ref<HTMLHeadingElement>
  action?: ReactNode
}

/** Exercise row content (1C): node, name, "3 × 3:00 / 1:00" and the focus skill mark. */
export function TimelineExerciseMain({
  exercise,
  focusSkillName,
  showInstruction = false,
  headingRef,
  action,
}: TimelineExerciseMainProps) {
  return (
    <div className="wb-row-main">
      <span className="wb-node" aria-hidden="true" />
      <div className="wb-row-text">
        <h4 ref={headingRef} tabIndex={headingRef ? -1 : undefined} className="wb-row-name">
          {exercise.exerciseNameSnapshot}
        </h4>
        <p className="wb-row-details">
          <span className="wb-row-params">{formatExerciseParams(exercise.configuration, labels.continuous)}</span>
          {focusSkillName !== undefined ? <span className="wb-row-focus">· {labels.focusMark} {focusSkillName}</span> : null}
        </p>
        {showInstruction && exercise.instruction ? <p className="wb-row-note">{exercise.instruction}</p> : null}
      </div>
      {action}
    </div>
  )
}

interface TimelineBreakMainProps {
  breakItem: WorkoutBreak
  showInstruction?: boolean
  action?: ReactNode
}

/** Break on the axis (N2 B): diamond, "PRZERWA" and its duration in one line. */
export function TimelineBreakMain({ breakItem, showInstruction = false, action }: TimelineBreakMainProps) {
  return (
    <div className="wb-break">
      <span className="wb-diamond" aria-hidden="true" />
      <div className="wb-break-body">
        <p className="wb-break-text">
          <span className="wb-break-title">{labels.breakLabel}</span>
          <span className="wb-break-time">{formatBreakDuration(breakItem.durationSeconds)}</span>
        </p>
        {showInstruction && breakItem.instruction ? <p className="wb-row-note">{breakItem.instruction}</p> : null}
      </div>
      {action}
    </div>
  )
}
