import { ScreenHeader } from '@/components/ScreenHeader'
import { AccountDataSection } from '@/features/account/AccountDataSection'
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
import { WellbeingSettings } from '@/features/wellbeing/WellbeingSettings'
import { hasWellbeingConsent } from '@/domain/wellbeing/wellbeingConsent'
import { useState } from 'react'
import { useAuth } from '@/features/auth/authContext'
import { useAccountService } from '@/features/account/useAccountService'
import { accountLabels } from '@/features/account/accountLabels'
import { calculateSevenDayWeight } from '@/domain/profile/bodyWeight'
import { weightKgLabel } from '@/features/profile/profileLabels'
import { useTheme } from '@/features/theme/useTheme'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ProfileDisclosure } from '@/features/profile/ProfileDisclosure'
import { ProfileSettingsSection } from '@/features/profile/ProfileSettingsSection'
import { ProfileAccountSection } from '@/features/profile/ProfileAccountSection'
import { TrainingSettings } from '@/features/profile/TrainingSettings'
import { profileSettingsLabels as settings } from '@/features/profile/profileSettingsLabels'

export function Component() {
  const { profile, bodyWeights, retryProfile } = useWorkoutData()
  const { state } = useAuth(), account = useAccountService()
  const { preference, setTheme } = useTheme()
  const [weightOpen, setWeightOpen] = useState(false), [wellbeingOpen, setWellbeingOpen] = useState(false)
  const today = useProfileToday(), unavailable = profileDataUnavailable(profile)
  const current = profile.items[0]
  const weightEnabled = hasValidHealthConsent(current), wellbeingEnabled = hasWellbeingConsent(current)
  const weight = calculateSevenDayWeight(bodyWeights.items, today)
  const weightsUnavailable = profileDataUnavailable(bodyWeights)
  const weightSummary = !weightEnabled ? settings.noWeightConsent : weightsUnavailable ? labels[weightsUnavailable]
    : weight.averageKg !== null ? `${weightKgLabel(weight.averageKg)} · średnia z 7 dni`
    : weight.latest ? `Ostatni pomiar: ${weightKgLabel(weight.latest.weightKg)}` : labels.noWeights
  return <div className="space-y-6 px-4 py-6 md:px-0">
    <ScreenHeader variant="main" title={labels.title} subtitle={<>
      <p className="break-all text-sm text-muted">{state.status === 'ready' ? state.session?.email : ''}</p>
      {account.service && <p className="text-sm text-muted">{account.service.providers.map((provider) => provider === 'password' ? settings.passwordProvider : provider === 'google.com' ? settings.googleProvider : '').filter(Boolean).join(' · ')}</p>}
    </>} />
    <ProfileDisclosure id="profile-weight" title={labels.weight} summary={unavailable ? labels[unavailable] : weightSummary} open={weightOpen} onToggle={() => setWeightOpen(!weightOpen)}>
      {unavailable ? <ProfileDataState state={unavailable} retry={retryProfile} /> : hasValidHealthConsent(current) ? <BodyWeightSection today={today} profile={current} /> : <>
        <p className="text-sm leading-relaxed text-muted">{labels.intro}</p>
        <Link to={routes.profileConsent} className={getButtonClassName()}>{labels.enable}</Link>
        {/* A withdrawal sent with a weak signal is local until the server confirms it. */}
        {profile.hasPendingWrites && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
      </>}
    </ProfileDisclosure>
    <WellbeingSettings today={today} open={wellbeingOpen} onToggle={() => setWellbeingOpen(!wellbeingOpen)} />
    <ProfileStatistics today={today} />
    <h2 className="font-display text-xl font-semibold">{settings.settings}</h2>
    <TrainingSettings />
    <ProfileSettingsSection title={settings.health}>
      <div className="space-y-2">
        <a href="#profile-weight" onClick={() => setWeightOpen(true)} className="inline-flex min-h-touch items-center gap-2 text-sm font-semibold underline">{settings.manageWeight}</a>
        <p className="text-sm">{weightEnabled ? settings.enabled : settings.disabled}</p>
        <p className="text-sm leading-relaxed text-muted">{settings.weightPurpose}</p>
      </div>
      <div className="space-y-2">
        <a href="#profile-wellbeing" onClick={() => setWellbeingOpen(true)} className="inline-flex min-h-touch items-center gap-2 text-sm font-semibold underline">{settings.manageWellbeing}</a>
        <p className="text-sm">{wellbeingEnabled ? settings.enabled : settings.disabled}</p>
        <p className="text-sm leading-relaxed text-muted">{settings.wellbeingPurpose}</p>
      </div>
    </ProfileSettingsSection>
    <ProfileSettingsSection title={settings.appearance}>
      <SegmentedControl label={settings.theme} value={preference} onChange={setTheme} options={[
        { value: 'system', label: settings.system }, { value: 'light', label: settings.light }, { value: 'dark', label: settings.dark },
      ]} />
    </ProfileSettingsSection>
    <AccountDataSection health={weightEnabled || wellbeingEnabled} />
    <ProfileAccountSection service={account.service} error={account.error} />
    <section aria-label={accountLabels.delete} className="space-y-4 border-t border-bd pt-6">
      <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{accountLabels.delete}</h2>
      <p className="text-sm text-muted">{settings.deleteHint}</p>
      <Link to={routes.deleteAccount} className={getButtonClassName({ variant: 'danger' })}>{accountLabels.delete}</Link>
    </section>
  </div>
}
