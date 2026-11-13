import type { DeletionNotice } from '@/application/account/accountService'

const noticeKey = 'combat-training.accountDeleted'
const cleanupKey = 'combat-training.accountDeletionCleanupError'
const cleanupEvent = 'account-deletion-cleanup'

export const deletionNotice: DeletionNotice = {
  set: () => { sessionStorage.removeItem(cleanupKey); sessionStorage.setItem(noticeKey, 'deleted') },
  clear: () => sessionStorage.removeItem(noticeKey),
  cleanupFailed: () => { sessionStorage.setItem(cleanupKey, 'failed'); window.dispatchEvent(new Event(cleanupEvent)) },
}
export function readDeletionNotice(): boolean {
  try { return sessionStorage.getItem(noticeKey) === 'deleted' } catch { return false }
}
export function readCleanupError(): boolean {
  try { return sessionStorage.getItem(cleanupKey) === 'failed' } catch { return false }
}
export function subscribeCleanup(onChange: () => void) {
  window.addEventListener(cleanupEvent, onChange)
  return () => window.removeEventListener(cleanupEvent, onChange)
}
