import { afterEach, describe, expect, it, vi } from 'vitest'
import { personalExercise } from '@/test/exerciseBuilders'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'

const sdk = vi.hoisted(() => ({ listeners: new Map<string, (value: unknown) => void>(),
  set: vi.fn<(...args: unknown[]) => Promise<void>>(() => new Promise(() => {})), delete: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  read: vi.fn<(path: string) => Promise<unknown>>(),
  update: vi.fn<(...args: unknown[]) => Promise<void>>(() => new Promise(() => {})),
}))
vi.mock('firebase/app', () => ({ getApp: () => 'app' }))
vi.mock('./firebaseConfig', () => ({ readFirebaseConfig: () => ({ projectId: 'demo-combat-training', firestoreEmulatorHost: '127.0.0.1:8080' }) }))
vi.mock('firebase/firestore', () => ({
  initializeFirestore: () => ({}), connectFirestoreEmulator: vi.fn(), persistentLocalCache: () => ({}), persistentMultipleTabManager: vi.fn(),
  terminate: vi.fn(), clearIndexedDbPersistence: vi.fn(), collection: (_db: unknown, ...parts: string[]) => parts.join('/'),
  doc: (path: string, id: string) => `${path}/${id}`, onSnapshot: (path: string, _options: unknown, change: (value: unknown) => void) => {
    sdk.listeners.set(path, change); return () => sdk.listeners.delete(path)
  }, setDoc: sdk.set, updateDoc: sdk.update, deleteDoc: sdk.delete, getDocsFromServer: sdk.read,
}))
import { clearFirestoreCache, createFirestoreRepositories } from './createFirestoreRepositories'

function emit(items = [personalExercise()], pending = false) {
  sdk.listeners.get('users/athlete/exercises')?.({ docs: items.map((item) => ({ id: item.id, data: () => ({ ...item, schemaVersion: 1 }),
    metadata: { hasPendingWrites: pending } })), metadata: { hasPendingWrites: pending, fromCache: pending } })
}
afterEach(async () => { await clearFirestoreCache(); vi.clearAllMocks(); vi.unstubAllGlobals() })
describe('Firestore personal exercises', () => {
  it('edits only definition fields without overwriting concurrent metadata', async () => {
    const repository = createFirestoreRepositories('athlete').exercises
    repository.subscribe(vi.fn(), vi.fn()); emit()
    const edited = personalExercise({ namePl: 'Edited' })
    const saved = repository.save(edited)
    expect(sdk.update).toHaveBeenCalledWith('users/athlete/exercises/personal-guard', {
      namePl: edited.namePl, disciplines: edited.disciplines, blockTypes: edited.blockTypes,
      defaultConfiguration: edited.defaultConfiguration, updatedAt: edited.updatedAt,
    })
    expect(sdk.set).not.toHaveBeenCalled()
    emit([{ ...edited, favorite: true, archivedAt: edited.updatedAt }], true)
    await expect(saved).resolves.toBeUndefined()
  })
  it.each(['use', 'favorite', 'archive'] as const)('patches only %s metadata and preserves concurrent definition changes before server acknowledgement', async (operation) => {
    const repository = createFirestoreRepositories('athlete').exercises
    repository.subscribe(vi.fn(), vi.fn()); emit()
    const at = '2026-11-15T10:00:00.000Z'
    const fields = operation === 'use' ? { lastUsedAt: at, updatedAt: at }
      : operation === 'favorite' ? { favorite: true, updatedAt: at } : { archivedAt: at, updatedAt: at }
    const saved = operation === 'use' ? repository.markUsed('personal-guard', at)
      : operation === 'favorite' ? repository.setFavorite('personal-guard', true, at) : repository.setArchived('personal-guard', at, at)
    expect(sdk.update).toHaveBeenCalledWith('users/athlete/exercises/personal-guard', fields)
    expect(sdk.set).not.toHaveBeenCalled()
    const concurrent = personalExercise({ namePl: 'Changed remotely', archivedAt: at, defaultConfiguration: { mode: 'continuous', durationSeconds: 600 }, ...fields })
    emit([concurrent], true)
    await expect(saved).resolves.toBeUndefined()
  })
  it('finishes a valid write after the local snapshot while its server write is unresolved', async () => {
    const repository = createFirestoreRepositories('athlete').exercises
    const changes = vi.fn(), error = vi.fn()
    repository.subscribe(changes, error); emit([])
    const saved = repository.save(personalExercise())
    expect(sdk.set).toHaveBeenCalledWith('users/athlete/exercises/personal-guard', { ...personalExercise(), schemaVersion: 1 })
    emit([personalExercise()], true)
    await expect(saved).resolves.toBeUndefined()
    expect(changes.mock.lastCall?.[0].hasPendingWrites).toBe(true)
    expect(error).not.toHaveBeenCalled()
  })
  it('rejects changing type or provenance under the same ID and rejects invalid data before writing', async () => {
    const repository = createFirestoreRepositories('athlete').exercises
    repository.subscribe(vi.fn(), vi.fn()); emit()
    await expect(repository.save(personalExercise({ type: 'combination' }))).rejects.toThrow('identity')
    await expect(repository.save(personalExercise({ copiedFromId: 'builtin' }))).rejects.toThrow('identity')
    await expect(repository.save(personalExercise({ namePl: '' }))).rejects.toThrow()
    expect(sdk.set).not.toHaveBeenCalled()
  })
  it('reads server references before deletion and protects history after its source plan has gone', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    const repository = createFirestoreRepositories('athlete').exercises
    repository.subscribe(vi.fn(), vi.fn()); emit()
    sdk.read.mockImplementation(async (path) => ({ metadata: { hasPendingWrites: false }, docs: path.endsWith('workoutSessions') ? [{
      data: () => ({ ...workoutSession({ stepResults: [sessionStep({ combinationId: 'personal-guard' })] }), schemaVersion: 2 }),
    }] : [] }))
    await expect(repository.deleteUnused('personal-guard')).rejects.toThrow('referenced')
    expect(sdk.delete).not.toHaveBeenCalled()
    sdk.read.mockResolvedValue({ metadata: { hasPendingWrites: false }, docs: [] })
    await expect(repository.deleteUnused('personal-guard')).resolves.toBeUndefined()
    expect(sdk.delete).toHaveBeenCalledOnce()
  })
  it('refuses incomplete, invalid and pending server references and offline deletion', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const repository = createFirestoreRepositories('athlete').exercises
    repository.subscribe(vi.fn(), vi.fn()); emit()
    await expect(repository.deleteUnused('personal-guard')).rejects.toThrow('connection')
    vi.stubGlobal('navigator', { onLine: true })
    sdk.read.mockResolvedValue({ metadata: { hasPendingWrites: true }, docs: [] })
    await expect(repository.deleteUnused('personal-guard')).rejects.toThrow('Pending')
    sdk.read.mockResolvedValue({ metadata: { hasPendingWrites: false }, docs: [{ data: () => ({ schemaVersion: 99 }) }] })
    await expect(repository.deleteUnused('personal-guard')).rejects.toThrow()
    sdk.read.mockRejectedValue(new Error('Unavailable'))
    await expect(repository.deleteUnused('personal-guard')).rejects.toThrow('Unavailable')
    expect(sdk.delete).not.toHaveBeenCalled()
  })
})
