import type { SubscribableRepository } from '../repositorySubscription'
import type { WellbeingEntry } from '@/domain/wellbeing/wellbeing'

export interface WellbeingRepository extends SubscribableRepository<WellbeingEntry> {
  save(entry: WellbeingEntry): Promise<void>
  withdrawConsent(): Promise<void>
}
