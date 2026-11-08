import type { WorkoutBlock } from '@/domain/workout/workout.types'
import type { FocusSkill } from './focusSkill.types'

export function countFocusExercises(blocks: readonly WorkoutBlock[]): number {
  return blocks.reduce((total, block) => total + block.items.filter(
    (item) => item.type === 'exercise' && item.focusSkillId !== null,
  ).length, 0)
}

export function selectAvailableFocusSkills<T extends Pick<FocusSkill, 'name' | 'archivedAt'>>(skills: readonly T[]): T[] {
  return skills.filter((skill) => skill.archivedAt === null).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
}

export function selectPlanCorrections(blocks: readonly WorkoutBlock[], skills: readonly FocusSkill[]) {
  const seen = new Set<string>()
  return blocks.flatMap((block) => block.items.flatMap((item) => {
    if (item.type !== 'exercise' || !item.focusSkillId || seen.has(item.focusSkillId)) return []
    seen.add(item.focusSkillId)
    const skill = skills.find((value) => value.id === item.focusSkillId)
    return skill?.openCorrection ? [{ focusSkillId: skill.id, name: skill.name, correction: skill.openCorrection }] : []
  }))
}
