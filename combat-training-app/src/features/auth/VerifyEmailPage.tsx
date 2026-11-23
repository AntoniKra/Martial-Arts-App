import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { AuthFrame } from './AuthFrame'
import { useAuth } from './authContext'
import { authLabels as labels } from './authLabels'
import { SignOutButton } from './SignOutButton'
import { subscribeToVerificationOnReturn } from './subscribeToVerificationOnReturn'
import { verificationRetrySeconds } from './verificationCooldown'

export function VerifyEmailPage() {
  const auth = useAuth()
  const [now, setNow] = useState(Date.now)
  const [unverified, setUnverified] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const { refreshVerification } = auth
  const session = auth.state.status === 'ready' ? auth.state.session : null
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => subscribeToVerificationOnReturn(session, refreshVerification), [session, refreshVerification])
  const seconds = verificationRetrySeconds(auth.verificationSentAt, now)

  return (
    <AuthFrame title={labels.verifyTitle}>
      <p className="mb-4 text-sm text-muted">{labels.verifyInfo}</p>
      {session && <p className="mb-4 break-all text-sm">{session.email}</p>}
      {auth.verificationError && <p role="alert" className="mb-4 text-sm text-crimson-ink">{auth.verificationError}</p>}
      {actionError && <p role="alert" className="mb-4 text-sm text-crimson-ink">{actionError}</p>}
      {auth.verificationSentAt !== null && <p role="status" className="mb-4 text-sm">{labels.verificationSent}</p>}
      {unverified && <p role="status" className="mb-4 text-sm">{labels.stillUnverified}</p>}
      <div className="flex flex-col gap-3">
        <Button loading={auth.busy} onClick={async () => {
          setActionError(await auth.execute(async () => {
            setUnverified(!(await refreshVerification()))
          }))
        }}>{labels.checkVerification}</Button>
        <Button variant="secondary" disabled={seconds > 0 || auth.busy}
          onClick={() => void auth.sendVerification()}>{seconds > 0 ? labels.resendWait(seconds) : labels.resend}</Button>
        <SignOutButton onError={setActionError} />
      </div>
    </AuthFrame>
  )
}
