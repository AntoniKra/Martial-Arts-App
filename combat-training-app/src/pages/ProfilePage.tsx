import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { hasValidHealthConsent } from '@/domain/profile/bodyWeight'
import { BodyWeightSection } from '@/features/profile/BodyWeightSection'
import { ProfileDataState } from '@/features/profile/ProfileDataState'
import { profileDataUnavailable } from '@/features/profile/profileDataUnavailable'
import { ProfileStatistics } from '@/features/profile/ProfileStatistics'
import { profileLabels as labels } from '@/features/profile/profileLabels'
import { useProfileToday } from '@/features/profile/useProfileToday'

export function Component() {
  const { profile, retryProfile } = useWorkoutData()
  const today = useProfileToday(), unavailable = profileDataUnavailable(profile)
  const current = profile.items[0]
  return <div className="space-y-6 px-4 py-6 md:px-0">
    <h1 className="font-display text-3xl font-bold">{labels.title}</h1>
    <section aria-label={labels.weight} className="space-y-4 border border-bd bg-surface p-4">
      <h2 className="font-display text-xl font-semibold">{labels.weight}</h2>
      {unavailable ? <ProfileDataState state={unavailable} retry={retryProfile} /> : hasValidHealthConsent(current) ? <BodyWeightSection today={today} profile={current} /> : <>
        <p className="text-sm leading-relaxed text-muted">{labels.intro}</p>
        <Link to={routes.profileConsent} className={getButtonClassName()}>{labels.enable}</Link>
        {/* A withdrawal sent with a weak signal is local until the server confirms it. */}
        {profile.hasPendingWrites && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
      </>}
    </section>
    <ProfileStatistics today={today} />
  </div>
}
