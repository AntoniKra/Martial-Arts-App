import type { AccountService, DeletionNotice } from './accountService'

export class AccountDeletionError extends Error {
  constructor(readonly stage: 'confirmation' | 'data' | 'cleanup', readonly cause: unknown) {
    super('Account deletion failed')
  }
}

/** Runs independently of the route: deleting Auth unmounts the account screens. */
export async function deleteAccount(service: AccountService, collections: readonly string[], notice: DeletionNotice, now = Date.now): Promise<void> {
  try {
    const authTime = await service.refreshedAuthTime()
    const age = now() - authTime
    if (!Number.isFinite(age) || age < 0 || age > 4 * 60_000) throw new Error('Confirmation expired')
  } catch (cause) {
    throw new AccountDeletionError('confirmation', cause)
  }
  try {
    // Health records first; all remaining implemented collections must still be included.
    const ordered = ['bodyWeights', 'workoutSessions', 'focusSkills', 'weekPlans', 'workoutPlans']
    for (const name of [...ordered.filter((name) => collections.includes(name)), ...collections.filter((name) => !ordered.includes(name))]) {
      await service.deleteCollection(name)
    }
    await service.deleteProfile()
    notice.set()
    try { await service.deleteAuthUser() } catch (cause) { notice.clear(); throw cause }
  } catch (cause) {
    throw new AccountDeletionError('data', cause)
  }
  try { await service.cleanupDevice() } catch (cause) { notice.cleanupFailed(); throw new AccountDeletionError('cleanup', cause) }
}

export function deletionBatches<T>(items: readonly T[]): T[][] {
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += 500) batches.push(items.slice(index, index + 500))
  return batches
}

export function reauthenticationOptions(providers: readonly string[]) {
  return { password: providers.includes('password'), google: providers.includes('google.com') }
}
