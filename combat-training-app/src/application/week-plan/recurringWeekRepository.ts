import type { SubscribableRepository } from '@/application/repositorySubscription'
import type { RecurringWeek } from '@/domain/week-plan/weekPlan.types'

export interface RecurringWeekRepository extends SubscribableRepository<RecurringWeek> {
  save: (week: RecurringWeek) => Promise<void>
}
