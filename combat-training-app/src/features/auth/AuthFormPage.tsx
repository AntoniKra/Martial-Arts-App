import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { AuthFrame } from './AuthFrame'
import { useAuth } from './authContext'
import { authLabels as labels } from './authLabels'

type Mode = 'login' | 'register' | 'forgot-password'
interface Credentials { email: string; password: string }

export function AuthFormPage({ mode }: { mode: Mode }) {
  const auth = useAuth()
  const location = useLocation()
  const [resetSent, setResetSent] = useState(false)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Credentials>()
  const title = mode === 'login' ? labels.login : mode === 'register' ? labels.register : labels.resetTitle
  const busy = isSubmitting || auth.busy

  async function submit(values: Credentials) {
    const email = z.email().safeParse(values.email.trim())
    if (!email.success) { setError('email', { message: labels.invalidEmail }, { shouldFocus: true }); return }
    if (mode !== 'forgot-password' && !values.password) {
      setError('password', { message: labels.passwordRequired }, { shouldFocus: true }); return
    }
    if (mode === 'register' && values.password.length < 8) {
      setError('password', { message: labels.weakPassword }, { shouldFocus: true }); return
    }
    await auth.execute(async () => {
      if (mode === 'register') {
        await auth.service.register(email.data, values.password)
        await auth.sendVerification()
      } else if (mode === 'login') {
        await auth.service.signIn(email.data, values.password)
      } else {
        await auth.service.requestPasswordReset(email.data)
        setResetSent(true)
      }
    })
  }

  return (
    <AuthFrame title={title}>
      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="auth-email" className="mb-2 block text-sm">{labels.email}</label>
          <input {...register('email')} id="auth-email" type="email" autoComplete="email" required
            aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined}
            className="min-h-touch w-full border border-bd bg-input px-3 text-ink" />
          {errors.email && <p id="email-error" className="mt-2 text-sm text-crimson-ink" role="alert">{errors.email.message}</p>}
        </div>
        {mode !== 'forgot-password' && <div>
          <label htmlFor="auth-password" className="mb-2 block text-sm">{labels.password}</label>
          <input {...register('password')} id="auth-password" type="password" required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : mode === 'register' ? 'password-hint' : undefined}
            className="min-h-touch w-full border border-bd bg-input px-3 text-ink" />
          {mode === 'register' && <p id="password-hint" className="mt-2 text-sm text-muted">{labels.passwordHint}</p>}
          {errors.password && <p id="password-error" className="mt-2 text-sm text-crimson-ink" role="alert">{errors.password.message}</p>}
        </div>}
        {auth.error && <p role="alert" className="text-sm text-crimson-ink">{auth.error}</p>}
        {resetSent && <p role="status" className="text-sm">{labels.resetSent}</p>}
        <Button type="submit" loading={busy}>{mode === 'forgot-password' ? labels.reset : title}</Button>
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
