import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { HEALTH_NOTICE_VERSION, hasValidHealthConsent } from '@/domain/profile/bodyWeight'
import { ProfileDataState } from '@/features/profile/ProfileDataState'
import { profileDataUnavailable } from '@/features/profile/profileDataUnavailable'
import { profileLabels as labels } from '@/features/profile/profileLabels'

export function Component() {
  const { profile, profileRepository, retryProfile } = useWorkoutData()
  const [adult, setAdult] = useState(false), [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const pending = useRef(false), navigate = useNavigate()
  const unavailable = profileDataUnavailable(profile), current = profile.items[0]
  if (hasValidHealthConsent(current)) return <Navigate to={routes.profile} replace />
  async function enable() {
    if (!adult || !agreed || pending.current || unavailable) return
    const now = new Date().toISOString()
    pending.current = true; setBusy(true); setError(null)
    try {
      await profileRepository.save({ healthDataConsent: { grantedAt: now, noticeVersion: HEALTH_NOTICE_VERSION, adultConfirmed: true },
        weightClassLabel: null, createdAt: current?.createdAt ?? now, updatedAt: now })
      void navigate(routes.profile, { replace: true })
    } catch { setError(labels.saveFailed); pending.current = false; setBusy(false) }
  }
  const disabled = !adult || !agreed || busy || !!unavailable
  return <div className="space-y-6 px-4 py-6 md:px-0">
    <h1 className="font-display text-3xl font-bold">{labels.consentTitle}</h1>
    <div className="space-y-4 text-sm leading-relaxed text-muted">{labels.notice.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
    {unavailable && <ProfileDataState state={unavailable} retry={retryProfile} />}
    <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void enable() }}>
      <div>
        <label className="flex min-h-touch cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={adult} disabled={busy}
          onChange={(event) => setAdult(event.target.checked)} aria-describedby="adult-hint" className="size-5 shrink-0 accent-crimson" />{labels.adult}</label>
        <p id="adult-hint" className="mt-2 text-xs leading-relaxed text-muted">{labels.adultHint}</p>
      </div>
      <label className="flex min-h-touch cursor-pointer items-start gap-3 py-2 text-sm leading-relaxed"><input type="checkbox" checked={agreed} disabled={busy}
        onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-crimson" />{labels.agree}</label>
      {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={disabled} className={getButtonClassName({ disabled })}>{busy ? labels.saving : labels.grant}</button>
        <Link to={routes.profile} className={getButtonClassName({ variant: 'secondary' })}>{labels.later}</Link>
      </div>
    </form>
  </div>
}
