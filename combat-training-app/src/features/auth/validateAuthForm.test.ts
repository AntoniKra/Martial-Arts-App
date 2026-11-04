import { describe, expect, it } from 'vitest'
import { authLabels as labels } from './authLabels'
import { validateAuthForm } from './validateAuthForm'

describe('validateAuthForm', () => {
  it('trims the email and keeps the password unchanged', () => {
    expect(validateAuthForm('login', { email: '  zawodnik@example.com ', password: ' secret ' })).toEqual({
      ok: true,
      values: { email: 'zawodnik@example.com', password: ' secret ' },
    })
  })

  it.each(['', 'zawodnik', 'zawodnik@', '@example.com', 'zawodnik@example'])('rejects the email %j', (email) => {
    expect(validateAuthForm('forgot-password', { email, password: '' })).toEqual({
      ok: false,
      errors: { email: labels.invalidEmail },
    })
  })

  it('reports every invalid field at once', () => {
    expect(validateAuthForm('register', { email: '', password: '' })).toEqual({
      ok: false,
      errors: { email: labels.invalidEmail, password: labels.passwordRequired },
    })
  })

  it('requires a password to sign in but does not reveal the length policy', () => {
    const email = 'zawodnik@example.com'
    expect(validateAuthForm('login', { email, password: '' })).toEqual({
      ok: false,
      errors: { password: labels.passwordRequired },
    })
    expect(validateAuthForm('login', { email, password: 'short' }).ok).toBe(true)
  })

  it('requires at least eight characters when registering', () => {
    const email = 'zawodnik@example.com'
    expect(validateAuthForm('register', { email, password: '1234567' })).toEqual({
      ok: false,
      errors: { password: labels.weakPassword },
    })
    expect(validateAuthForm('register', { email, password: '12345678' }).ok).toBe(true)
  })

  it('ignores the password when requesting a reset link', () => {
    expect(validateAuthForm('forgot-password', { email: 'zawodnik@example.com', password: '' }).ok).toBe(true)
  })
})
