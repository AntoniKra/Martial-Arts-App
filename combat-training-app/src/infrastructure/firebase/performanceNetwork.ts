import { disableNetwork, enableNetwork } from 'firebase/firestore'
import { getAccountDatabase } from './createFirestoreRepositories'

export async function setPerformanceNetworkEnabled(enabled: boolean): Promise<void> {
  const database = getAccountDatabase()
  await (enabled ? enableNetwork(database) : disableNetwork(database))
}
