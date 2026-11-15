import type { PersonalExercise } from '@/domain/exercise/exercise'

export function personalExercise(changes: Partial<PersonalExercise> = {}): PersonalExercise {
  return { id: 'personal-guard', namePl: 'Powrot do gardy', type: 'drill', disciplines: ['boxing'], blockTypes: ['technique', 'bag'],
    defaultConfiguration: { mode: 'rounds', roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 },
    archivedAt: null, favorite: false, lastUsedAt: null, createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z', ...changes }
}
