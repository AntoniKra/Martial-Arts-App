import { useId, useRef, useState, type FormEvent } from 'react'
import type { AccountService } from '@/application/account/accountService'
import { getButtonClassName } from '@/components/ui/buttonStyles'
import { authLabels } from '@/features/auth/authLabels'
import { mapAuthError } from '@/features/auth/mapAuthError'
import { profileSettingsLabels as labels } from './profileSettingsLabels'
import { validatePasswordChange, type PasswordChangeErrors } from './validatePasswordChange'

export function PasswordChangeForm({ service }: { service: AccountService }) {
  const id = useId(), form = useRef<HTMLFormElement>(null), inFlight = useRef(false)
  const [values, setValues] = useState({ currentPassword: '', newPassword: '' })
  const [errors, setErrors] = useState<PasswordChangeErrors>({})
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null), [success, setSuccess] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    const errors = validatePasswordChange(values)
    setErrors(errors); setMessage(null); setSuccess(false)
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    inFlight.current = true; setBusy(true)
    try {
      await service.changePassword(values.currentPassword, values.newPassword)
      setValues({ currentPassword: '', newPassword: '' }); setSuccess(true); setMessage(labels.passwordChanged)
    } catch (cause) {
      const code = typeof cause === 'object' && cause !== null && 'code' in cause ? cause.code : null
      setMessage(code === 'auth/invalid-credential' || code === 'auth/wrong-password' ? labels.wrongPassword : mapAuthError(cause))
    } finally { inFlight.current = false; setBusy(false) }
  }
  return <form ref={form} noValidate onSubmit={(event) => void submit(event)} aria-label={labels.changePassword} className="space-y-4">
    {(['currentPassword', 'newPassword'] as const).map((field) => <div key={field} className="space-y-2">
      <label htmlFor={`${id}-${field}`} className="block text-sm font-semibold">{field === 'currentPassword' ? labels.currentPassword : labels.newPassword}</label>
      <input id={`${id}-${field}`} type="password" value={values[field]} disabled={busy} autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'}
        aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `${id}-${field}-error` : field === 'newPassword' ? `${id}-hint` : undefined}
        onChange={(event) => { setValues({ ...values, [field]: event.target.value }); setErrors({ ...errors, [field]: undefined }); setMessage(null) }}
        className="min-h-touch w-full border border-bd bg-input px-3 text-base text-ink" />
      {errors[field] && <p id={`${id}-${field}-error`} role="alert" className="text-sm text-crimson-ink">{errors[field]}</p>}
    </div>)}
    <p id={`${id}-hint`} className="text-sm text-muted">{authLabels.passwordHint}</p>
    <button type="submit" disabled={busy} className={getButtonClassName({ variant: 'secondary', disabled: busy })}>{busy ? labels.changingPassword : labels.changePassword}</button>
    {message && <p role={success ? 'status' : 'alert'} className={`text-sm ${success ? 'text-muted' : 'text-crimson-ink'}`}>{message}</p>}
  </form>
}
