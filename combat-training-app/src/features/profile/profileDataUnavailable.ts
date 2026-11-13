import type { CollectionState } from '@/application/useRepositoryCollection'

export function profileDataUnavailable<T>(state: CollectionState<T>) {
  return state.status === 'loading' ? 'loading' : state.status === 'error' ? 'error'
    : !state.complete || state.invalidDocumentIds.length ? 'incomplete' : null
}
