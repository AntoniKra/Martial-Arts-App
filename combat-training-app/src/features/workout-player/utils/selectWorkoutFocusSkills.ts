import type { CollectionState } from '@/application/useRepositoryCollection'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { WorkoutBlock } from '@/domain/workout/workout.types'

export const WORKOUT_FOCUS_SKILLS_WAIT_MS = 10_000

/** Null means that referenced skills may still arrive; an array admits the player. */
export function selectWorkoutFocusSkills(
  blocks: readonly WorkoutBlock[],
  collection: Pick<CollectionState<FocusSkill>, 'items' | 'status' | 'fromCache'>,
  waitExpired: boolean,
): FocusSkill[] | null {
  const referencedIds = new Set(blocks.flatMap((block) => block.items.flatMap((item) =>
    item.type === 'exercise' && item.focusSkillId ? [item.focusSkillId] : [])))
  const skills = collection.items.filter((skill) => referencedIds.has(skill.id))
  const complete = [...referencedIds].every((id) => skills.some((skill) => skill.id === id))
  const serverConfirmed = collection.status === 'ready' && !collection.fromCache
  return complete || serverConfirmed || waitExpired ? skills : null
}
