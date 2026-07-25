import type { DisciplineKey } from '@/domain/discipline/discipline.types'

export interface WorkoutPlanFixture {
  id: string
  name: string
  disciplineKey: DisciplineKey
  goal: string
  exerciseCount: number
  roundCount: number
  estimatedMinutes: number
  createdAt: string
}

export interface CompletedSessionFixture {
  id: string
  name: string
  disciplineKey: DisciplineKey
  dateLabelPl: string
  completedAt: string
  durationLabelPl: string
  completedRounds: number
  plannedRounds: number
  exerciseCompletionPercent: number
  rpe: number | null
  averageRatingLabel: string | null
}

export const workoutPlanFixtures: readonly WorkoutPlanFixture[] = [
  {
    id: 'p1',
    name: 'Podstawy ortodoksu',
    disciplineKey: 'boxing',
    goal: 'Wyostrzenie timingu jab–cross i pracy głową',
    exerciseCount: 7,
    roundCount: 22,
    estimatedMinutes: 73,
    createdAt: '2026-07-15T10:00:00Z',
  },
  {
    id: 'p2',
    name: 'Artyleria Muay Thai',
    disciplineKey: 'muay_thai',
    goal: 'Budowa mocnego low kicka i płynności kombinacji z teepem',
    exerciseCount: 7,
    roundCount: 20,
    estimatedMinutes: 68,
    createdAt: '2026-07-18T09:00:00Z',
  },
  {
    id: 'p3',
    name: 'Integracja MMA stójka',
    disciplineKey: 'mma_striking',
    goal: 'Integracja strikingu ze zmianami poziomu i zagrożeniem takedownem',
    exerciseCount: 7,
    roundCount: 18,
    estimatedMinutes: 62,
    createdAt: '2026-07-20T08:00:00Z',
  },
] as const

export const completedSessionFixtures: readonly CompletedSessionFixture[] = [
  {
    id: 'h1',
    name: 'Podstawy ortodoksu',
    disciplineKey: 'boxing',
    dateLabelPl: '20 lip',
    completedAt: '2026-07-20T10:15:00Z',
    durationLabelPl: '51 min',
    completedRounds: 20,
    plannedRounds: 22,
    exerciseCompletionPercent: 86,
    rpe: 7,
    averageRatingLabel: '4,0',
  },
  {
    id: 'h2',
    name: 'Artyleria Muay Thai',
    disciplineKey: 'muay_thai',
    dateLabelPl: '18 lip',
    completedAt: '2026-07-18T09:30:00Z',
    durationLabelPl: '58 min',
    completedRounds: 20,
    plannedRounds: 20,
    exerciseCompletionPercent: 100,
    rpe: 8,
    averageRatingLabel: '4,3',
  },
  {
    id: 'h3',
    name: 'Integracja MMA stójka',
    disciplineKey: 'mma_striking',
    dateLabelPl: '15 lip',
    completedAt: '2026-07-15T08:00:00Z',
    durationLabelPl: '47 min',
    completedRounds: 14,
    plannedRounds: 18,
    exerciseCompletionPercent: 71,
    rpe: 9,
    averageRatingLabel: '3,2',
  },
  {
    id: 'h4',
    name: 'K-1 tempo i presja',
    disciplineKey: 'k1',
    dateLabelPl: '12 lip',
    completedAt: '2026-07-12T17:00:00Z',
    durationLabelPl: '54 min',
    completedRounds: 18,
    plannedRounds: 20,
    exerciseCompletionPercent: 90,
    rpe: 8,
    averageRatingLabel: '3,8',
  },
  {
    id: 'h5',
    name: 'Kickboxing kontra i kontra',
    disciplineKey: 'kickboxing',
    dateLabelPl: '10 lip',
    completedAt: '2026-07-10T11:00:00Z',
    durationLabelPl: '45 min',
    completedRounds: 16,
    plannedRounds: 18,
    exerciseCompletionPercent: 78,
    rpe: 6,
    averageRatingLabel: '4,1',
  },
] as const
