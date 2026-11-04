import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { AuthFrame } from './AuthFrame'
import { useAuth } from './authContext'
import { authLabels as labels } from './authLabels'
import { SignOutButton } from './SignOutButton'
import { verificationRetrySeconds } from './verificationCooldown'

export function VerifyEmailPage() {
  const auth = useAuth()
  const [now, setNow] = useState(Date.now)
  const [unverified, setUnverified] = useState(false)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const seconds = verificationRetrySeconds(auth.verificationSentAt, now)

  return (
    <AuthFrame title={labels.verifyTitle}>
      <p className="mb-4 text-sm text-muted">{labels.verifyInfo}</p>
      {auth.state.status === 'ready' && <p className="mb-4 break-all text-sm">{auth.state.session?.email}</p>}
      {auth.error && <p role="alert" className="mb-4 text-sm text-crimson-ink">{auth.error}</p>}
      {auth.verificationSentAt !== null && <p role="status" className="mb-4 text-sm">{labels.verificationSent}</p>}
      {unverified && <p role="status" className="mb-4 text-sm">{labels.stillUnverified}</p>}
      <div className="flex flex-col gap-3">
        <Button loading={auth.busy} onClick={() => void auth.execute(async () => {
          setUnverified(!(await auth.refreshVerification()))
        })}>{labels.checkVerification}</Button>
        <Button variant="secondary" disabled={seconds > 0 || auth.busy}
          onClick={() => void auth.execute(auth.sendVerification)}>{seconds > 0 ? labels.resendWait(seconds) : labels.resend}</Button>
        <SignOutButton />
      </div>
    </AuthFrame>
  )
}
