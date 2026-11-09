import { useEffect, useState } from 'react'
import type { RepositorySnapshot, SubscribableRepository } from './repositorySubscription'

export interface CollectionState<T> extends RepositorySnapshot<T> {
  status: 'loading' | 'ready' | 'error'
}

export function useRepositoryCollection<T>(repository: SubscribableRepository<T>): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({
    status: 'loading', items: [], pendingIds: new Set(), hasPendingWrites: false, fromCache: true, invalidDocumentIds: [],
  })
  useEffect(() => repository.subscribe(
    (snapshot) => setState({ ...snapshot, status: 'ready' }),
    () => setState((current) => ({ ...current, status: 'error' })),
  ), [repository])
  return state
}
