import type { SubscribableRepository } from '../repositorySubscription'
import type { AthleteProfile, BodyWeight } from '@/domain/profile/profile.types'

export interface ProfileRepository extends SubscribableRepository<AthleteProfile> {
  save(profile: AthleteProfile): Promise<void>
  withdrawConsent(): Promise<void>
}

export interface BodyWeightRepository extends SubscribableRepository<BodyWeight> {
  save(weight: BodyWeight): Promise<void>
  delete(date: string): Promise<void>
}
