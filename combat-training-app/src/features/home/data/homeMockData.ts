import {
  completedSessionFixtures,
  workoutPlanFixtures,
} from '@/mocks/workoutFixtures'
import type { HomeViewData } from '@/features/home/types/homeView.types'

const featuredPlanFixture = workoutPlanFixtures.find((plan) => plan.id === 'p1')

if (!featuredPlanFixture) {
  throw new Error('Missing featured plan fixture p1')
}

export const homeMockData: HomeViewData = {
  sessionLabelPl: 'Sesja treningowa',
  featuredPlan: {
    id: featuredPlanFixture.id,
    name: featuredPlanFixture.name,
    disciplineKey: featuredPlanFixture.disciplineKey,
    goal: featuredPlanFixture.goal,
    exerciseCount: featuredPlanFixture.exerciseCount,
    roundCount: featuredPlanFixture.roundCount,
    estimatedMinutes: featuredPlanFixture.estimatedMinutes,
  },
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
