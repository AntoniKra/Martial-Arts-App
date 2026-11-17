import { Switch } from '@/components/ui/Switch'
import { RouteScreenHeader } from '@/components/ScreenHeader'
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
      await profileRepository.save({ ...current, healthDataConsent: { grantedAt: now, noticeVersion: HEALTH_NOTICE_VERSION, adultConfirmed: true },
        weightClassLabel: null, createdAt: current?.createdAt ?? now, updatedAt: now })
      void navigate(routes.profile, { replace: true })
    } catch { setError(labels.saveFailed); pending.current = false; setBusy(false) }
  }
  const disabled = !adult || !agreed || busy || !!unavailable
  return <div className="space-y-6 px-4 py-6 md:px-0">
    <RouteScreenHeader title={labels.consentTitle} fallback={routes.profile} />
    <div className="space-y-4 text-sm leading-relaxed text-muted">{labels.notice.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
    {unavailable && <ProfileDataState state={unavailable} retry={retryProfile} />}
    <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void enable() }}>
      <div>
        <Switch checked={adult} disabled={busy}
          onChange={(event) => setAdult(event.target.checked)} aria-describedby="adult-hint">{labels.adult}</Switch>
        <p id="adult-hint" className="mt-2 text-xs leading-relaxed text-muted">{labels.adultHint}</p>
      </div>
      <Switch checked={agreed} disabled={busy}
        onChange={(event) => setAgreed(event.target.checked)}>{labels.agree}</Switch>
      {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={disabled} className={getButtonClassName({ disabled })}>{busy ? labels.saving : labels.grant}</button>
        <Link to={routes.profile} className={getButtonClassName({ variant: 'secondary' })}>{labels.later}</Link>
      </div>
    </form>
  </div>
}
