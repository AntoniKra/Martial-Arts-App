import { useId, type ReactNode } from 'react'

import type { WorkoutBlockType } from '@/domain/workout/workout.types'
import { getWorkoutBlockLabelPl, WORKOUT_BLOCK_TYPES } from '@/domain/workout/workoutBlockLabels'
import { BlockTypeIcon, TimelinePlusIcon } from '@/features/workout-builder/components/BlockTypeIcon'

interface BlockTypeTilesProps {
  heading: string
  /** The empty plan highlights the warm-up as the usual first block; the picker keeps all tiles equal. */
  featureWarmup: boolean
  onSelect: (blockType: WorkoutBlockType) => void
  headerAction?: ReactNode
}

const WIDE_BLOCK_TYPES: readonly WorkoutBlockType[] = ['warmup', 'cooldown']

export function BlockTypeTiles({ heading, featureWarmup, onSelect, headerAction }: BlockTypeTilesProps) {
  const headingId = useId()

  return (
    <div className="wb-tiles-section">
      <div className="wb-tiles-head">
        <span className="wb-tiles-node" aria-hidden="true" />
        <h3 id={headingId} className="wb-kicker">{heading}</h3>
        {headerAction}
      </div>
      <div role="group" aria-labelledby={headingId} className="wb-tiles">
        {WORKOUT_BLOCK_TYPES.map((blockType) => {
          const isWide = WIDE_BLOCK_TYPES.includes(blockType)
          const isFeatured = featureWarmup && blockType === 'warmup'
          const className = `wb-tile${isWide ? ' is-wide' : ''}${isFeatured ? ' is-featured' : ''}`

          return (
            <button key={blockType} type="button" className={className} onClick={() => onSelect(blockType)}>
              <span className="wb-tile-icon"><BlockTypeIcon blockType={blockType} /></span>
              <span className="wb-tile-label">{getWorkoutBlockLabelPl(blockType)}</span>
              <span className="wb-tile-add"><TimelinePlusIcon /></span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
