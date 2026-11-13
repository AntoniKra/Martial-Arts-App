import { describe, expect, it, vi } from 'vitest'
import type { AccountService } from './accountService'
import { AccountDeletionError, deleteAccount, deletionBatches, reauthenticationOptions } from './deleteAccount'

const names = ['workoutPlans', 'workoutSessions', 'focusSkills', 'weekPlans', 'bodyWeights']
function fixture() {
  const calls: string[] = []
  const service: AccountService = {
    collections: names, providers: ['password'], readData: vi.fn(), reauthenticatePassword: vi.fn(), reauthenticateGoogle: vi.fn(),
    confirmationAgeMs: vi.fn(async () => 10_000),
    deleteCollection: vi.fn(async (name) => { calls.push(name) }),
    deleteProfile: vi.fn(async () => { calls.push('profile') }),
    deleteAuthUser: vi.fn(async () => { calls.push('auth') }),
    cleanupDevice: vi.fn(async () => { calls.push('cleanup') }),
  }
  const notice = { set: vi.fn(() => { calls.push('notice') }), clear: vi.fn(), cleanupFailed: vi.fn() }
  return { service, notice, calls }
}
describe('account deletion', () => {
  it('deletes health data first, all data before Auth, and cleans up after Auth', async () => {
    const { service, notice, calls } = fixture()
    await deleteAccount(service, names, notice)
    expect(calls).toEqual(['bodyWeights', 'workoutSessions', 'focusSkills', 'weekPlans', 'workoutPlans', 'profile', 'notice', 'auth', 'cleanup'])
  })
  it('does not delete Auth or profile after an interrupted collection and can be repeated', async () => {
    const { service, notice } = fixture()
    vi.mocked(service.deleteCollection).mockRejectedValueOnce(new Error('Network failed'))
    await expect(deleteAccount(service, names, notice)).rejects.toMatchObject({ stage: 'data' })
    expect(service.deleteProfile).not.toHaveBeenCalled()
    expect(service.deleteAuthUser).not.toHaveBeenCalled()
    expect(notice.set).not.toHaveBeenCalled()
    await expect(deleteAccount(service, names, notice)).resolves.toBeUndefined()
  })
  it.each([-1, 240_001, NaN])('does not remove any data with a confirmation age of %s ms', async (age) => {
    const { service, notice } = fixture()
    vi.mocked(service.confirmationAgeMs).mockResolvedValue(age)
    await expect(deleteAccount(service, names, notice)).rejects.toMatchObject({ stage: 'confirmation' })
    expect(service.deleteCollection).not.toHaveBeenCalled()
    expect(service.deleteAuthUser).not.toHaveBeenCalled()
  })
  it.each([0, 240_000])('accepts a confirmation age of %s ms', async (age) => {
    const { service, notice } = fixture()
    vi.mocked(service.confirmationAgeMs).mockResolvedValue(age)
    await expect(deleteAccount(service, names, notice)).resolves.toBeUndefined()
  })
  it('does not remove data when token refresh fails', async () => {
    const { service, notice } = fixture()
    vi.mocked(service.confirmationAgeMs).mockRejectedValue(new Error('Offline'))
    await expect(deleteAccount(service, names, notice)).rejects.toBeInstanceOf(AccountDeletionError)
    expect(service.deleteCollection).not.toHaveBeenCalled()
  })
  it('clears the success notice when Auth rejects deletion', async () => {
    const { service, notice } = fixture()
    vi.mocked(service.deleteAuthUser).mockRejectedValue({ code: 'auth/requires-recent-login' })
    await expect(deleteAccount(service, names, notice)).rejects.toMatchObject({ stage: 'data' })
    expect(notice.clear).toHaveBeenCalledOnce()
    expect(service.cleanupDevice).not.toHaveBeenCalled()
  })
  it('reports cleanup failure through a notice after Auth has gone', async () => {
    const { service, notice } = fixture()
    vi.mocked(service.cleanupDevice).mockRejectedValue(new Error('Another tab'))
    await expect(deleteAccount(service, names, notice)).rejects.toMatchObject({ stage: 'cleanup' })
    expect(notice.cleanupFailed).toHaveBeenCalledOnce()
  })
  it('still deletes the Auth account when the success message cannot be stored', async () => {
    const { service, notice } = fixture()
    notice.set.mockImplementation(() => { throw new DOMException('Storage disabled', 'SecurityError') })
    await expect(deleteAccount(service, names, notice)).resolves.toBeUndefined()
    expect(service.deleteAuthUser).toHaveBeenCalledOnce()
  })
  it.each([[0, []], [1, [1]], [500, [500]], [501, [500, 1]]] as const)('batches %s records without an empty commit', (count, sizes) => {
    const items = Array.from({ length: count }, (_, index) => index)
    const result = deletionBatches(items)
    expect(result.map((batch) => batch.length)).toEqual(sizes)
    expect(result.flat()).toEqual(items)
  })
  it.each([
    [[], { password: false, google: false }],
    [['password'], { password: true, google: false }],
    [['google.com'], { password: false, google: true }],
    [['password', 'google.com'], { password: true, google: true }],
  ])('selects reauthentication options for providers %j', (providers, expected) => {
    expect(reauthenticationOptions(providers as string[])).toEqual(expected)
  })
})
