import { expect, it } from 'vitest'
import { chooseGoogleSignInMethod } from './chooseGoogleSignInMethod'

it.each([
  [{ standalone: false, touchPrimary: false }, 'popup'],
  [{ standalone: false, touchPrimary: true }, 'redirect'],
  [{ standalone: true, touchPrimary: false }, 'redirect'],
  [{ standalone: true, touchPrimary: true }, 'redirect'],
] as const)('chooses the Google sign-in method for %j', (environment, method) => {
  expect(chooseGoogleSignInMethod(environment)).toBe(method)
})
