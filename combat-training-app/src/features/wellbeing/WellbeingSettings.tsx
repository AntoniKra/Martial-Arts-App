import { useState } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { workoutDataLabels } from '@/application/workoutDataLabels'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { hasWellbeingConsent } from '@/domain/wellbeing/wellbeingConsent'
import { ProfileConfirmDialog } from '@/features/profile/ProfileConfirmDialog'
import { profileDataUnavailable } from '@/features/profile/profileDataUnavailable'
import { WellbeingForm } from './WellbeingForm'
import { WellbeingDataState } from './WellbeingDataState'
import { wellbeingLabels as labels } from './wellbeingLabels'

export function WellbeingSettings({ today }: { today: string }) {
  const { profile, wellbeing, wellbeingRepository, retryProfile, retryWellbeing } = useWorkoutData()
  const [withdrawing, setWithdrawing] = useState(false), [editing, setEditing] = useState(false)
  const active = hasWellbeingConsent(profile.items[0]), entry = wellbeing.items.find((item) => item.date === today)
  const unavailable = profileDataUnavailable(profile)
  return <section aria-label={labels.title} className="space-y-4 border border-bd bg-surface p-4">
    <h2 className="font-display text-xl font-semibold">{labels.title}</h2>
    {unavailable ? <WellbeingDataState loading={unavailable === 'loading'} retry={retryProfile} /> : active ? <>
      <label className="flex min-h-touch cursor-pointer items-center gap-3 text-sm font-semibold">
        <input type="checkbox" role="switch" checked aria-label={labels.enabled} onChange={() => setWithdrawing(true)} className="size-5 accent-[var(--app-ink)]" />{labels.enabled}</label>
      {profile.hasPendingWrites && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
      {profileDataUnavailable(wellbeing) ? <WellbeingDataState loading={wellbeing.status === 'loading'} retry={retryWellbeing} /> : entry && <>
        <button type="button" className={getButtonClassName({ variant: 'secondary' })} onClick={() => setEditing(true)}>{labels.edit}</button>
        {editing && <WellbeingForm key={today} date={today} entry={entry} onSave={(value) => wellbeingRepository.save(value)} onClose={() => setEditing(false)} />}
        {wellbeing.pendingIds.has(today) && <p role="status" className="text-sm text-muted">{workoutDataLabels.pending}</p>}
      </>}
    </> : <><p className="text-sm leading-relaxed text-muted">{labels.intro}</p><Link to={routes.wellbeingConsent} className={getButtonClassName({ variant: 'secondary' })}>{labels.enable}</Link></>}
    {withdrawing && <ProfileConfirmDialog title={labels.withdrawTitle} description={labels.withdrawDescription} confirm={labels.withdrawConfirm}
      onClose={() => setWithdrawing(false)} onConfirm={async () => {
        if (!navigator.onLine) throw new Error('Offline')
        await wellbeingRepository.withdrawConsent()
      }} failureMessage={() => navigator.onLine ? labels.withdrawalFailed : labels.onlineRequired} />}
  </section>
}
