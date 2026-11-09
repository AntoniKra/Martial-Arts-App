import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { WorkoutBlock } from '@/domain/workout/workout.types'
import type { FocusRating } from './workoutSession.types'

export function createWorkoutFocusRatings(blocks: readonly WorkoutBlock[], skills: readonly FocusSkill[]): FocusRating[] {
  return blocks.flatMap((block) => block.items.flatMap((item): FocusRating[] => {
    if (item.type !== 'exercise' || !item.focusSkillId) return []
    const skill = skills.find((value) => value.id === item.focusSkillId)
    if (!skill) return []
    return [{
      workoutItemId: item.id, focusSkillId: skill.id, skillNameSnapshot: skill.name,
      criterionSnapshot: skill.criterion, blockType: block.blockType,
      assessment: null, correction: null, previousCorrectionCheck: null,
    }]
  }))
}
