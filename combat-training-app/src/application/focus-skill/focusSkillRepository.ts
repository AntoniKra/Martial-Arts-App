import type { SubscribableRepository } from '@/application/repositorySubscription'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'

export interface FocusSkillRepository extends SubscribableRepository<FocusSkill> {
  save(skill: FocusSkill): Promise<void>
}
