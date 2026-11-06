import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { AuthFrame } from './AuthFrame'
import { useAuth } from './authContext'
import { authLabels as labels } from './authLabels'
import { minPasswordLength, validateAuthForm, type AuthFormErrors, type AuthFormMode, type AuthFormValues } from './validateAuthForm'

export function AuthFormPage({ mode }: { mode: AuthFormMode }) {
  const auth = useAuth()
  const location = useLocation()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)
  const [values, setValues] = useState<AuthFormValues>({ email: '', password: '' })
  const [errors, setErrors] = useState<AuthFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
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

  return (
    <AuthFrame title={title}>
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
        {formError && <p role="alert" className="text-sm text-crimson-ink">{formError}</p>}
        {resetSent && <p role="status" className="text-sm">{labels.resetSent}</p>}
        <Button type="submit" loading={auth.busy}>{mode === 'forgot-password' ? labels.reset : title}</Button>
      </form>
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
