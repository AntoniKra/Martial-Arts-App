import { completedSessionFixtures } from '@/mocks/workoutFixtures'
import type { HomeViewData } from '@/features/home/types/homeView.types'

export const homeMockData: HomeViewData = {
  sessionLabelPl: 'Sesja treningowa',
  recentSessions: completedSessionFixtures.slice(0, 3).map((session) => ({
    id: session.id,
    name: session.name,
    disciplineKey: session.disciplineKey,
    dateLabelPl: session.dateLabelPl,
    durationLabelPl: session.durationLabelPl,
    exerciseCompletionPercent: session.exerciseCompletionPercent,
    rpe: session.rpe,
    averageRatingLabel: session.averageRatingLabel,
  })),
}
