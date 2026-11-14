import { authLabels } from '@/features/auth/authLabels'
import { minPasswordLength } from '@/features/auth/validateAuthForm'
import { profileSettingsLabels as labels } from './profileSettingsLabels'

export interface PasswordChangeValues { currentPassword: string; newPassword: string }
export type PasswordChangeErrors = Partial<Record<keyof PasswordChangeValues, string>>

export function validatePasswordChange(values: PasswordChangeValues): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {}
  if (!values.currentPassword) errors.currentPassword = labels.currentRequired
  if (values.newPassword.length < minPasswordLength) errors.newPassword = authLabels.weakPassword
  return errors
}
