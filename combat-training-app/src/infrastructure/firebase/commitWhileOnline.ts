/** Stop waiting when connectivity is lost; queued Firestore writes may still commit later. */
export async function commitWhileOnline<T>(action: () => Promise<T>): Promise<T> {
  let onOffline = () => {}
  const offline = new Promise<never>((_, reject) => {
    onOffline = () => reject(new Error('Offline account operation'))
    addEventListener('offline', onOffline)
  })
  try {
    if (!navigator.onLine) throw new Error('Offline account operation')
    return await Promise.race([action(), offline])
  } finally { removeEventListener('offline', onOffline) }
}
