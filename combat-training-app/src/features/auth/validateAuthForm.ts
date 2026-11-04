import * as z from 'zod/mini'
import { authLabels as labels } from './authLabels'

export type AuthFormMode = 'login' | 'register' | 'forgot-password'

export interface AuthFormValues {
  email: string
  password: string
}

export type AuthFormErrors = Partial<Record<keyof AuthFormValues, string>>

export type AuthFormResult =
  | { ok: true; values: AuthFormValues }
  | { ok: false; errors: AuthFormErrors }

export const minPasswordLength = 8

const emailSchema = z.email()

export function validateAuthForm(mode: AuthFormMode, values: AuthFormValues): AuthFormResult {
  const email = values.email.trim()
  const errors: AuthFormErrors = {}

  if (!emailSchema.safeParse(email).success) errors.email = labels.invalidEmail

  if (mode !== 'forgot-password') {
    if (!values.password) errors.password = labels.passwordRequired
    else if (mode === 'register' && values.password.length < minPasswordLength) errors.password = labels.weakPassword
  }

  if (errors.email || errors.password) return { ok: false, errors }
  return { ok: true, values: { email, password: values.password } }
}
