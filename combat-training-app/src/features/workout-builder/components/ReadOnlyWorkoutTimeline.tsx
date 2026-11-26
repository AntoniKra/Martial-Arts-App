import { useWorkoutData } from '@/application/workoutDataContext'
import type { WorkoutBlock } from '@/domain/workout/workout.types'
import { getWorkoutBlockLabelPl } from '@/domain/workout/workoutBlockLabels'
import { focusSkillLabels } from '@/features/focus-skills/focusSkillLabels'
import {
  TimelineBlockHeader,
  TimelineBreakMain,
  TimelineExerciseMain,
} from '@/features/workout-builder/components/TimelineParts'
import {
  formatBlockDescriptorGenitive,
  splitTrailingBreaks,
  summarizeBlockTime,
  type PositionedItem,
} from '@/features/workout-builder/utils/timelinePresentation'
import { workoutBuilderLabels as labels } from '@/features/workout-builder/workoutBuilderLabels'

import './workoutTimeline.css'

interface ReadOnlyWorkoutTimelineProps {
  blocks: readonly WorkoutBlock[]
}

/**
 * The builder timeline without menus or add buttons, for plan details and preview.
 * Instructions are shown in the rows because there is no actions panel to hold them.
 */
export function ReadOnlyWorkoutTimeline({ blocks }: ReadOnlyWorkoutTimelineProps) {
  const { focusSkills } = useWorkoutData()

  function focusSkillName(focusSkillId: string | null): string | undefined {
    if (focusSkillId === null) {
      return undefined
    }

    // A marked exercise keeps its "★" while skills load or when the skill is not on the list.
    return focusSkills.items.find((skill) => skill.id === focusSkillId)?.name ?? focusSkillLabels.title
  }

  function renderItem({ item }: PositionedItem) {
    if (item.type === 'break') {
      return (
        <li key={item.id} className="wb-break-item">
          <TimelineBreakMain breakItem={item} showInstruction />
        </li>
      )
    }

    return (
      <li key={item.id} className="wb-row">
        <TimelineExerciseMain exercise={item} focusSkillName={focusSkillName(item.focusSkillId)} showInstruction />
      </li>
    )
  }

  return (
    <ol className="wb-blocks wb-timeline" aria-label={labels.blocksList}>
      {blocks.map((block, index) => {
        const position = index + 1
        const blockLabel = getWorkoutBlockLabelPl(block.blockType)
        const blockDescriptorGenitive = formatBlockDescriptorGenitive(position, blockLabel)
        const { inside, trailing } = splitTrailingBreaks(block.items)

        return (
          <li key={block.id} className="wb-block-entry">
            <section className="wb-block" aria-label={labels.blockHeading(position, blockLabel)}>
              <TimelineBlockHeader position={position} blockLabel={blockLabel} time={summarizeBlockTime(block)} />
              {block.items.length === 0 ? <p className="wb-block-empty">{labels.emptyBlock}</p> : null}
              {inside.length > 0 ? (
                <ul className="wb-items" aria-label={labels.blockItems(blockDescriptorGenitive)}>
                  {inside.map(renderItem)}
                </ul>
              ) : null}
            </section>

            {trailing.length > 0 ? (
              <ul className="wb-trailing" aria-label={labels.breaksAfterBlock(blockDescriptorGenitive)}>
                {trailing.map(renderItem)}
              </ul>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
