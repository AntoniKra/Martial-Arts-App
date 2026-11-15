import { describe, expect, it } from 'vitest'
import { validatePasswordChange } from './validatePasswordChange'

describe('password change validation', () => {
  it('requires the current password and a new password with eight characters', () => {
    expect(validatePasswordChange({ currentPassword: '', newPassword: '' })).toEqual({
      currentPassword: 'Wpisz obecne hasło.', newPassword: 'Hasło musi mieć co najmniej 8 znaków.',
    })
    expect(validatePasswordChange({ currentPassword: 'current-test-only', newPassword: '1234567' })).toHaveProperty('newPassword')
  })
  it('accepts legacy short current passwords and preserves significant whitespace', () => {
    expect(validatePasswordChange({ currentPassword: 'old', newPassword: ' 123456 ' })).toEqual({})
  })
})
