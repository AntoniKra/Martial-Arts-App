import type { Ref } from 'react'

import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import { formatEstimatedDuration } from '@/domain/time/formatDuration'
import { workoutBuilderLabels as labels } from '@/features/workout-builder/workoutBuilderLabels'

interface WorkoutPlanCardProps {
  disciplineKey: DisciplineKey | null
  planName: string
  mainGoal: string | null
  totalSeconds: number
  onOpen: () => void
  buttonRef?: Ref<HTMLButtonElement>
}

/** Plan summary on the timeline; opens the "Dane planu" subscreen. */
export function WorkoutPlanCard({ disciplineKey, planName, mainGoal, totalSeconds, onOpen, buttonRef }: WorkoutPlanCardProps) {
  const goal = mainGoal?.trim() ?? ''
  const disciplineClass = disciplineKey === null ? '' : ` wb-discipline-${disciplineKey}`

  return (
    // The visible text is the accessible name (WCAG 2.5.3); the hidden prefix says where the card leads.
    <button ref={buttonRef} type="button" onClick={onOpen} className={`wb-plan-card${disciplineClass}`}>
      <span className="sr-only">{labels.planCardPrefix}</span>
      <span className="wb-plan-card-top">
        <span className="wb-discipline-chip">
          {disciplineKey === null ? labels.noDiscipline : getDisciplineLabelPl(disciplineKey)}
        </span>
        <span className="wb-plan-time">{labels.planDuration(formatEstimatedDuration(totalSeconds))}</span>
      </span>
      <span className="wb-plan-name">{planName}</span>
      {goal.length > 0 ? <span className="wb-plan-goal">{labels.planGoal(goal)}</span> : null}
    </button>
  )
}
