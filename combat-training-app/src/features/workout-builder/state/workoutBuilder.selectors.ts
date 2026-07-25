import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'
import type { WorkoutBuilderState } from '@/features/workout-builder/state/workoutBuilder.types'

export function selectDisplayPlanName(state: WorkoutBuilderState): string {
  const trimmedCustomName = state.draft.customName?.trim() ?? ''

  if (trimmedCustomName.length > 0) {
    return trimmedCustomName
  }

  if (state.draft.disciplineKey !== null) {
    return `${getDisciplineLabelPl(state.draft.disciplineKey)} — plan treningu`
  }

  return 'Nowy plan treningowy'
}

export function selectCanEditDiscipline(state: WorkoutBuilderState): boolean {
  return !state.disciplineLocked
}
