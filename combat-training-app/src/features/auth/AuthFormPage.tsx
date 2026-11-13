import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { deletionNotice, readDeletionNotice, readCleanupError, subscribeCleanup } from '@/infrastructure/storage/accountDeletionNotice'
import { AuthFrame } from './AuthFrame'
import { useAuth } from './authContext'
import { GoogleMark } from './GoogleMark'
import { authLabels as labels } from './authLabels'
import { minPasswordLength, validateAuthForm, type AuthFormErrors, type AuthFormMode, type AuthFormValues } from './validateAuthForm'

export function AuthFormPage({ mode }: { mode: AuthFormMode }) {
  const [accountDeleted] = useState(() => mode === 'login' && readDeletionNotice())
  useEffect(() => { if (accountDeleted) deletionNotice.clear() }, [accountDeleted])
  const cleanupError = useSyncExternalStore(subscribeCleanup, readCleanupError)
  const auth = useAuth()
  const location = useLocation()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)
  const [values, setValues] = useState<AuthFormValues>({ email: '', password: '' })
  const [errors, setErrors] = useState<AuthFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [googlePending, setGooglePending] = useState(false)
  const title = mode === 'login' ? labels.login : mode === 'register' ? labels.register : labels.resetTitle

  function change(field: keyof AuthFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setValues((current) => ({ ...current, [field]: value }))
      setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    const result = validateAuthForm(mode, values)
    if (!result.ok) {
      setErrors(result.errors)
      ;(result.errors.email ? emailRef : passwordRef).current?.focus()
      return
    }
    setErrors({})
    const { email, password } = result.values
    inFlight.current = true
    try {
      const error = await auth.execute(async () => {
        if (mode === 'register') await auth.service.register(email, password)
        else if (mode === 'login') await auth.service.signIn(email, password)
        else await auth.service.requestPasswordReset(email)
      })
      setFormError(error)
      if (error !== null) return
      if (mode === 'forgot-password') setResetSent(true)
      // The new account is already signed in and redirected to /verify-email, which shows the sending result.
      if (mode === 'register') await auth.sendVerification()
    } finally {
      inFlight.current = false
    }
  }

  async function continueWithGoogle() {
    if (inFlight.current) return
    inFlight.current = true
    setGooglePending(true)
    try {
      setFormError(await auth.execute(() => auth.service.signInWithGoogle()))
    } finally {
      inFlight.current = false
      setGooglePending(false)
    }
  }

  const shownError = formError ?? (mode === 'forgot-password' ? null : auth.redirectError)

  return (
    <AuthFrame title={title}>
      {cleanupError && <p role="alert" className="mb-4 text-sm text-crimson-ink">{labels.cleanupError}</p>}
      {accountDeleted && <p role="status" className="mb-4 text-sm">{labels.accountDeleted}</p>}
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="auth-email" className="mb-2 block text-sm">{labels.email}</label>
          <input ref={emailRef} id="auth-email" name="email" type="email" autoComplete="email" required
            value={values.email} onChange={change('email')}
            aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? 'email-error' : undefined}
            className="min-h-touch w-full border border-bd bg-input px-3 text-ink" />
          {errors.email && <p id="email-error" className="mt-2 text-sm text-crimson-ink" role="alert">{errors.email}</p>}
        </div>
        {mode !== 'forgot-password' && <div>
          <label htmlFor="auth-password" className="mb-2 block text-sm">{labels.password}</label>
          <input ref={passwordRef} id="auth-password" name="password" type="password" required
            minLength={mode === 'register' ? minPasswordLength : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={values.password} onChange={change('password')}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : mode === 'register' ? 'password-hint' : undefined}
            className="min-h-touch w-full border border-bd bg-input px-3 text-ink" />
          {mode === 'register' && <p id="password-hint" className="mt-2 text-sm text-muted">{labels.passwordHint}</p>}
          {errors.password && <p id="password-error" className="mt-2 text-sm text-crimson-ink" role="alert">{errors.password}</p>}
        </div>}
        {shownError && <p role="alert" className="text-sm text-crimson-ink">{shownError}</p>}
        {resetSent && <p role="status" className="text-sm">{labels.resetSent}</p>}
        <Button type="submit" loading={auth.busy && !googlePending} disabled={googlePending}>{mode === 'forgot-password' ? labels.reset : title}</Button>
      </form>
      {mode !== 'forgot-password' && <>
        <div className="my-4 flex items-center gap-3 text-sm text-muted">
          <span aria-hidden="true" className="h-px flex-1 bg-bd" />
          {labels.alternativeSignIn}
          <span aria-hidden="true" className="h-px flex-1 bg-bd" />
        </div>
        <Button variant="secondary" className="w-full" loading={googlePending} disabled={auth.busy} onClick={continueWithGoogle}>
          <span className="inline-flex items-center gap-3"><GoogleMark />{labels.continueWithGoogle}</span>
        </Button>
      </>}
      <nav aria-label={labels.login} className="mt-4 flex flex-col items-start">
        {mode !== 'login' && <Link className="flex min-h-touch items-center text-sm underline" to="/login" state={location.state}>{labels.login}</Link>}
        {mode === 'login' && <>
          <Link className="flex min-h-touch items-center text-sm underline" to="/register" state={location.state}>{labels.register}</Link>
          <Link className="flex min-h-touch items-center text-sm underline" to="/forgot-password" state={location.state}>{labels.forgotPassword}</Link>
        </>}
      </nav>
    </AuthFrame>
  )
}
