import { Switch } from '@/components/ui/Switch'
import { RouteScreenHeader } from '@/components/ScreenHeader'
import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { routes } from '@/app/routes'
import { useWorkoutData } from '@/application/workoutDataContext'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { hasWellbeingConsent, WELLBEING_NOTICE_VERSION } from '@/domain/wellbeing/wellbeingConsent'
import { profileDataUnavailable } from '@/features/profile/profileDataUnavailable'
import { WellbeingDataState } from '@/features/wellbeing/WellbeingDataState'
import { wellbeingLabels as labels } from '@/features/wellbeing/wellbeingLabels'

export function Component() {
  const { profile, profileRepository, retryProfile } = useWorkoutData()
  const [adult, setAdult] = useState(false), [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false), [failed, setFailed] = useState(false)
  const pending = useRef(false), navigate = useNavigate(), current = profile.items[0]
  const unavailable = profileDataUnavailable(profile)
  if (hasWellbeingConsent(current)) return <Navigate to={routes.profile} replace />
  const disabled = !adult || !agreed || busy || !!unavailable
  return <div className="space-y-6 px-4 py-6 md:px-0">
    <RouteScreenHeader title={labels.consentTitle} fallback={routes.profile} />
    <div className="space-y-4 text-sm leading-relaxed text-muted">{labels.notice.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
    {unavailable && <WellbeingDataState loading={unavailable === 'loading'} retry={retryProfile} />}
    <form className="space-y-5" onSubmit={(event) => {
      event.preventDefault()
      if (disabled || pending.current) return
      pending.current = true; setBusy(true); setFailed(false)
      const now = new Date().toISOString()
      void profileRepository.save({ ...(current ?? { healthDataConsent: null, weightClassLabel: null, createdAt: now }),
        wellbeingConsent: { grantedAt: now, noticeVersion: WELLBEING_NOTICE_VERSION, adultConfirmed: true }, updatedAt: now })
        .then(() => navigate(routes.profile, { replace: true })).catch(() => { setFailed(true); setBusy(false); pending.current = false })
    }}>
      <Switch checked={adult} disabled={busy} onChange={(event) => setAdult(event.target.checked)}>{labels.adult}</Switch>
      <Switch checked={agreed} disabled={busy} onChange={(event) => setAgreed(event.target.checked)}>{labels.agree}</Switch>
      {failed && <p role="alert" className="text-sm">{labels.failed}</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={disabled} className={getButtonClassName({ variant: 'secondary', disabled })}>{labels.enable}</button>
        <Link to={routes.profile} className={getButtonClassName({ variant: 'ghost' })}>{labels.later}</Link></div>
    </form>
  </div>
}
