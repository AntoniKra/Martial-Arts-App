import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/app/routes'
import { deleteAccount, AccountDeletionError, reauthenticationOptions } from '@/application/account/deleteAccount'
import { useWorkoutData } from '@/application/workoutDataContext'
import { hasValidHealthConsent } from '@/domain/profile/bodyWeight'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { useAuth } from '@/features/auth/authContext'
import { authLabels } from '@/features/auth/authLabels'
import { accountLabels as labels } from '@/features/account/accountLabels'
import { useAccountAvailability } from '@/features/account/useAccountAvailability'
import { useAccountService } from '@/features/account/useAccountService'
import { AccountExportButtons } from '@/features/account/AccountExportButtons'
import { deletionNotice } from '@/infrastructure/storage/accountDeletionNotice'
import { resumeDeletionRedirect } from '@/infrastructure/storage/accountDeletionStorage'

export function Component() {
  const auth = useAuth(), account = useAccountService(), availability = useAccountAvailability()
  const { profile } = useWorkoutData()
  const session = auth.state.status === 'ready' ? auth.state.session : null
  const [password, setPassword] = useState(''), [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false), redirectChecked = useRef(false)
  const finalButton = useRef<HTMLButtonElement>(null)
  const options = reauthenticationOptions(account.service?.providers ?? [])
  useEffect(() => {
    if (!session || auth.redirectOperation === undefined || redirectChecked.current) return
    redirectChecked.current = true
    if (resumeDeletionRedirect(session.uid, auth.redirectOperation)) {
      void Promise.resolve().then(() => setConfirmed(true))
    }
  }, [session, auth.redirectOperation])
  useEffect(() => { if (confirmed) finalButton.current?.focus() }, [confirmed])

  async function confirm(method: 'password' | 'google', event?: FormEvent) {
    event?.preventDefault()
    if (!account.service || inFlight.current || availability.blocked) return
    inFlight.current = true; setBusy(true); setError(null)
    const service = account.service
    try {
      setError(await auth.execute(async () => {
        if (method === 'password') {
          await service.reauthenticatePassword(password)
          setConfirmed(true)
        } else if (await service.reauthenticateGoogle() === 'popup') setConfirmed(true)
      }))
    } finally { setPassword(''); setBusy(false); inFlight.current = false }
  }
  async function remove() {
    if (!account.service || inFlight.current || availability.blocked) return
    inFlight.current = true; setBusy(true); setError(null)
    try { await deleteAccount(account.service, account.service.collections, deletionNotice) }
    catch (cause) {
      if (cause instanceof AccountDeletionError && cause.stage === 'cleanup') {
        // The application service has already notified the login screen.
      } else {
        setConfirmed(false)
        setError(cause instanceof AccountDeletionError && cause.stage === 'confirmation' ? labels.recent
          : cause instanceof AccountDeletionError && typeof cause.cause === 'object' && cause.cause !== null && 'code' in cause.cause && cause.cause.code === 'auth/requires-recent-login' ? labels.recent : labels.interrupted)
      }
    } finally { setBusy(false); inFlight.current = false }
  }
  const blocked = busy || availability.blocked || !account.service
  return <div className="space-y-5 px-4 py-6 md:px-0">
    <h1 className="font-display text-3xl font-bold">{labels.delete}</h1>
    <p className="text-sm leading-relaxed">{labels.deleteIntro(session?.email ?? '')}</p>
    <p className="text-sm leading-relaxed text-muted">{labels.otherDevices}</p>
    <p className="text-sm text-muted">{labels.keepData}</p>
    <AccountExportButtons jsonOnly health={hasValidHealthConsent(profile.items[0])} disabled={busy} />
    {!confirmed ? <div className="space-y-4">
      {options.password && <form onSubmit={(event) => void confirm('password', event)} className="space-y-3">
        <label className="block text-sm" htmlFor="delete-password">{authLabels.password}</label>
        <input id="delete-password" type="password" autoComplete="current-password" required value={password}
          disabled={busy} onChange={(event) => setPassword(event.target.value)}
          className="min-h-touch w-full border border-bd bg-input px-3 text-ink" />
        <button type="submit" disabled={blocked || !password} className={getButtonClassName({ disabled: blocked || !password })}>{labels.confirmPassword}</button>
      </form>}
      {options.google && <button type="button" disabled={blocked} className={getButtonClassName({ variant: 'secondary', disabled: blocked })}
        onClick={() => void confirm('google')}>{options.password ? labels.alternativeGoogle : labels.confirmGoogle}</button>}
    </div> : <button ref={finalButton} type="button" disabled={blocked}
      className={getButtonClassName({ variant: 'danger', disabled: blocked })} onClick={() => void remove()}>{labels.forever}</button>}
    {busy && <p role="status">{confirmed ? labels.deleting : authLabels.loading}</p>}
    {(error || auth.redirectError || account.error) && <p role="alert" className="text-sm text-crimson-ink">{error ?? auth.redirectError ?? labels.unavailable}</p>}
    {busy ? <span className="block text-sm text-muted">{labels.cancel}</span>
      : <Link to={routes.profile} className={getButtonClassName({ variant: 'secondary' })}>{labels.cancel}</Link>}
  </div>
}
