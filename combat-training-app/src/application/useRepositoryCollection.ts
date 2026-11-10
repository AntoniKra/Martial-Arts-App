import { useEffect, useState } from 'react'
import type { RepositorySnapshot, SubscribableRepository } from './repositorySubscription'

export interface CollectionState<T> extends RepositorySnapshot<T> {
  status: 'loading' | 'ready' | 'error'
  complete?: boolean
}

function loadingState<T>(): CollectionState<T> {
  return {
    status: 'loading', items: [], pendingIds: new Set(), hasPendingWrites: false, fromCache: true, invalidDocumentIds: [],
  }
}

export function useRepositoryCollection<T>(repository: SubscribableRepository<T>, attempt = 0): CollectionState<T> {
  const [result, setResult] = useState(() => ({ repository, attempt, state: loadingState<T>() }))
  useEffect(() => repository.subscribe(
    (snapshot) => setResult((current) => ({ repository, attempt, state: { ...snapshot, status: 'ready',
      complete: current.repository === repository && current.attempt === attempt && current.state.complete === true || !snapshot.fromCache } })),
    () => setResult((current) => ({ repository, attempt, state: {
      ...(current.repository === repository && current.attempt === attempt ? current.state : loadingState<T>()), status: 'error',
    } })),
  ), [repository, attempt])
  return result.repository === repository && result.attempt === attempt ? result.state : loadingState<T>()
}
