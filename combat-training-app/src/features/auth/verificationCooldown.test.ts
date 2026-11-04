import { expect, it } from 'vitest'
import { verificationRetrySeconds } from './verificationCooldown'

it('blocks resending for a full minute using a deadline', () => {
  expect(verificationRetrySeconds(null, 1000)).toBe(0)
  expect(verificationRetrySeconds(1000, 1000)).toBe(60)
  expect(verificationRetrySeconds(1000, 60_999)).toBe(1)
  expect(verificationRetrySeconds(1000, 61_000)).toBe(0)
  expect(verificationRetrySeconds(1000, 100_000)).toBe(0)
  expect(verificationRetrySeconds(1000, 0)).toBe(60)
})
