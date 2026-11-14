import { useState } from 'react'
import type { AccountService } from '@/application/account/accountService'
import { useWorkoutData } from '@/application/workoutDataContext'
import { useAuth } from '@/features/auth/authContext'
import { SignOutButton } from '@/features/auth/SignOutButton'
import { accountLabels } from '@/features/account/accountLabels'
import { PasswordChangeForm } from './PasswordChangeForm'
import { ProfileSettingsSection } from './ProfileSettingsSection'
import { profileSettingsLabels as labels } from './profileSettingsLabels'

export function ProfileAccountSection({ service, error }: { service?: AccountService; error?: boolean }) {
  const { state } = useAuth(), data = useWorkoutData()
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const sources = [data.plans, data.sessions, data.focusSkills, data.weekPlans, data.profile, data.bodyWeights, data.wellbeing]
  return <ProfileSettingsSection title={labels.account}>
    <p className="break-all text-sm text-muted">{state.status === 'ready' ? state.session?.email : ''}</p>
    {service?.providers.includes('password') ? <PasswordChangeForm service={service} />
      : service?.providers.includes('google.com') ? <p className="text-sm text-muted">{labels.googleSignIn}</p> : null}
    {error && <p role="alert" className="text-sm text-crimson-ink">{accountLabels.unavailable}</p>}
    <SignOutButton hasPendingWrites={sources.some((source) => source.hasPendingWrites)}
      disabled={sources.some((source) => source.status === 'loading')} onError={setSignOutError} />
    {signOutError && <p role="alert" className="text-sm text-crimson-ink">{signOutError}</p>}
  </ProfileSettingsSection>
}
