export interface RepositorySnapshot<T> {
  items: T[]
  pendingIds: ReadonlySet<string>
  hasPendingWrites: boolean
  invalidDocumentIds: string[]
}

export interface SubscribableRepository<T> {
  subscribe(onChange: (snapshot: RepositorySnapshot<T>) => void, onError: (error: unknown) => void): () => void
}
