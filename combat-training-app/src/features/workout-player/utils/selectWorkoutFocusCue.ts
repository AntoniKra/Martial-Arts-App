import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { WorkoutPlaybackStatus, WorkoutPlaybackStep } from '@/domain/workout-playback/workoutPlayback.types'
import type { WorkoutBlock } from '@/domain/workout/workout.types'

export function selectWorkoutFocusCue(
  status: WorkoutPlaybackStatus,
  currentStep: WorkoutPlaybackStep,
  nextStep: WorkoutPlaybackStep | null,
  blocks: readonly WorkoutBlock[],
  skills: readonly FocusSkill[],
) {
  if (status === 'idle' || status === 'completed' || skills.length === 0) return null

  // In preparation the preview already points to the first actual step.
  const showCard = status === 'preparing' || currentStep.kind !== 'exercise'
  const round = showCard ? nextStep : currentStep
  if (round?.kind !== 'exercise' || round.roundNumber === null) return null

  const item = blocks[round.blockIndex]?.items.find(({ id }) => id === round.itemId)
  if (item?.type !== 'exercise' || !item.focusSkillId) return null

  const skill = skills.find(({ id, archivedAt }) => id === item.focusSkillId && archivedAt === null)
  return skill ? { kind: showCard ? 'card' as const : 'badge' as const, skill } : null
}
