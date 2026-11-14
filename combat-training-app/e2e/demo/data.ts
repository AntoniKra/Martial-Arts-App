import type { WorkoutPlan, WorkoutExercise } from '../../src/domain/workout/workout.types'
import type { FocusSkill } from '../../src/domain/focus-skill/focusSkill.types'
import type { WorkoutSession, PlanWorkoutSession, QuickTimerWorkoutSession } from '../../src/domain/workout-session/workoutSession.types'
import type { AthleteProfile, BodyWeight } from '../../src/domain/profile/profile.types'
import type { WeekPlan } from '../../src/domain/week-plan/weekPlan.types'
import { createWorkoutPlaybackTimeline } from '../../src/domain/workout-playback/createWorkoutPlaybackTimeline'

export const demoInstant = '2026-11-19T17:00:00.000Z'
const createdAt = '2026-09-14T07:00:00.000Z'
const correction = { problem: 'Po prawym prostym opuszczam lewą rękę.', fix: 'Po każdym ciosie dotykam rękawicą policzka.' }
export const demoSkills: FocusSkill[] = [
  { id: 'guard', name: 'Powrót do gardy', criterion: 'Po każdej kombinacji obie rękawice wracają do policzków.' },
  { id: 'low-kick', name: 'Niski kop po kombinacji', criterion: 'Po kopnięciu wracam do stabilnej pozycji i patrzę na cel.' },
  { id: 'exit', name: 'Zejście z linii ataku', criterion: 'Każdą serię kończę krokiem w bok bez krzyżowania nóg.' },
].map((skill) => ({ ...skill, createdAt, updatedAt: createdAt, archivedAt: null, openCorrection: null }))

function exercise(id: string, name: string, focusSkillId: string | null = null): WorkoutExercise {
  return { id, type: 'exercise', combinationId: null, focusSkillId, exerciseNameSnapshot: name,
    instruction: focusSkillId ? demoSkills.find((skill) => skill.id === focusSkillId)!.criterion : 'Spokojny oddech i kontrolowany ruch.',
    configuration: { mode: 'rounds', roundCount: 3, roundDurationSeconds: 180, restBetweenRoundsSeconds: 60 } }
}

const planDefinitions: Pick<WorkoutPlan, 'id' | 'nameSnapshot' | 'mainGoal' | 'blocks'>[] = [
  { id: 'technique', nameSnapshot: 'Garda i wyjście po kombinacji', mainGoal: 'Utrzymać gardę i bezpiecznie wyjść po ataku.',
    blocks: [
      { id: 'warmup', blockType: 'warmup', items: [{ ...exercise('warmup', 'Skakanka i mobilizacja'), configuration: { mode: 'continuous', durationSeconds: 300 } }] },
      { id: 'technique', blockType: 'technique', items: [exercise('guard', 'Lewy prosty – prawy prosty – powrót do gardy', 'guard'),
        exercise('exit', 'Lewy – prawy – lewy sierpowy i zejście', 'exit')] },
      { id: 'bag', blockType: 'bag', items: [exercise('low-kick', 'Dwa proste i niski kop na worku', 'low-kick')] },
      { id: 'cooldown', blockType: 'cooldown', items: [{ ...exercise('cooldown', 'Oddech i rozciąganie'), configuration: { mode: 'continuous', durationSeconds: 180 } }] },
    ] },
  { id: 'pads', nameSnapshot: 'Tarcze: tempo i celność', mainGoal: 'Łączyć pracę rąk z kopnięciami.',
    blocks: [{ id: 'pads', blockType: 'pads', items: [exercise('pads-guard', 'Kombinacje na tarczach', 'guard'), exercise('pads-kick', 'Prosty i kopnięcie na tułów', 'low-kick')] },
      { id: 'conditioning', blockType: 'conditioning', items: [exercise('feet', 'Praca nóg w zmiennym tempie')] }] },
  { id: 'sparring', nameSnapshot: 'Sparing zadaniowy: dystans', mainGoal: 'Kontrolować dystans bez zwiększania siły.',
    blocks: [{ id: 'sparring', blockType: 'sparring', sparringIntensity: 'technical', items: [exercise('sparring-exit', 'Atak i wyjście na bok', 'exit')] },
      { id: 'cooldown', blockType: 'cooldown', items: [{ ...exercise('breathing', 'Wyciszenie po sparingu'), configuration: { mode: 'continuous', durationSeconds: 180 } }] }] },
]
export const demoPlans: WorkoutPlan[] = planDefinitions.map((plan) => ({
  ...plan, customName: plan.nameSnapshot, disciplineKey: 'kickboxing', createdAt, updatedAt: createdAt,
}))

function dateAfter(days: number) {
  return new Date(Date.parse('2026-09-14T12:00:00Z') + days * 86_400_000).toISOString().slice(0, 10)
}

function planSession(week: number, date: string): PlanWorkoutSession {
  const plan = demoPlans[0]
  const partial = week === 2 || week === 7
  const timeline = createWorkoutPlaybackTimeline(plan)
  const stepResults = timeline.steps.map((step, index) => ({
    playbackStepId: step.id, workoutItemId: step.itemId, blockId: step.blockId, blockType: step.blockType,
    kind: step.kind, nameSnapshot: step.name, roundNumber: step.roundNumber, roundCount: step.roundCount,
    plannedDurationSeconds: step.durationSeconds,
    performedDurationSeconds: partial && index >= timeline.steps.length - 2 ? 0 : step.durationSeconds,
    outcome: partial && index >= timeline.steps.length - 2 ? 'skipped' as const : 'completed' as const,
  }))
  const durationSeconds = stepResults.reduce((sum, step) => sum + step.performedDurationSeconds, 0)
  const completedAt = `${date}T17:00:00.000Z`
  return { id: `plan-week-${week}`, source: 'plan', workoutPlanId: plan.id, workoutPlanNameSnapshot: plan.nameSnapshot,
    disciplineKey: 'kickboxing', category: 'mixed', status: partial ? 'partial' : 'completed', workoutDate: date, timezone: 'Europe/Warsaw',
    startedAt: new Date(Date.parse(completedAt) - durationSeconds * 1000).toISOString(), completedAt,
    createdAt: completedAt, updatedAt: completedAt, durationSeconds,
    workSeconds: stepResults.filter((step) => step.kind === 'exercise').reduce((sum, step) => sum + step.performedDurationSeconds, 0),
    sparringSeconds: 0, stepResults, completion: { completed: partial ? 3 : 5, planned: 5, unit: 'exercise' },
    rpe: partial ? 8 : 6, rpeRecordedAt: completedAt, sparring: [], exerciseRatings: [],
    note: week === 0 ? `${correction.problem} Poprawka: ${correction.fix}`
      : 'Sprawdzona poprawka: ręka wraca do policzka. Pod koniec rundy pilnować spokojnego oddechu.',
    focusRatings: demoSkills.map((skill) => ({ workoutItemId: skill.id, focusSkillId: skill.id, skillNameSnapshot: skill.name,
      criterionSnapshot: skill.criterion, blockType: skill.id === 'low-kick' ? 'bag' : 'technique',
      assessment: Math.min(5, 2 + Math.floor(week / 3)), correction: week === 0 && skill.id === 'guard' ? correction : null,
      previousCorrectionCheck: week === 1 && skill.id === 'guard' ? 'better' : null })),
  }
}

function quickSession(week: number, date: string): QuickTimerWorkoutSession {
  const completedAt = `${date}T17:00:00.000Z`, partial = week === 3
  const stepResults = Array.from({ length: 11 }, (_, index) => {
    const work = index % 2 === 0, skipped = partial && index >= 8
    return { playbackStepId: `sparring-${index}`, workoutItemId: 'sparring-rounds', blockId: 'sparring', blockType: 'sparring' as const,
      kind: work ? 'exercise' as const : 'roundRest' as const, nameSnapshot: 'Sparing zadaniowy',
      roundNumber: work ? index / 2 + 1 : null, roundCount: work ? 6 : null,
      plannedDurationSeconds: work ? 180 : 60, performedDurationSeconds: skipped ? 0 : work ? 180 : 60,
      outcome: skipped ? 'skipped' as const : 'completed' as const }
  })
  const durationSeconds = stepResults.reduce((sum, step) => sum + step.performedDurationSeconds, 0)
  const workSeconds = stepResults.filter((step) => step.kind === 'exercise').reduce((sum, step) => sum + step.performedDurationSeconds, 0)
  return { id: `quick-week-${week}`, source: 'quickTimer', disciplineKey: 'kickboxing', category: 'sparring',
    status: partial ? 'partial' : 'completed', workoutDate: date, timezone: 'Europe/Warsaw',
    startedAt: new Date(Date.parse(completedAt) - durationSeconds * 1000).toISOString(), completedAt,
    createdAt: completedAt, updatedAt: completedAt, durationSeconds, workSeconds, sparringSeconds: workSeconds, stepResults,
    completion: { completed: partial ? 4 : 6, planned: 6, unit: 'round' },
    sparring: [{ blockId: 'sparring', intensity: week % 4 === 0 ? 'hard' : 'technical', rounds: partial ? 4 : 6 }],
    rpe: week % 4 === 0 ? 8 : 6, rpeRecordedAt: completedAt,
    note: week % 4 === 0 ? 'Mocniejsze rundy, po treningu spokojna regeneracja.' : 'Sparing techniczny: dystans i wyjście po ataku.' }
}

export const demoSessions: WorkoutSession[] = Array.from({ length: 10 }, (_, week) => {
  if (week === 5) return [] // A deliberate recovery week; charts must show a gap, never zero ratings.
  const date = dateAfter(week * 7 + (week === 9 ? 3 : 4)), instant = `${date}T16:00:00.000Z`
  return [planSession(week, dateAfter(week * 7)), quickSession(week, dateAfter(week * 7 + 2)),
    { id: `club-week-${week}`, source: 'manual' as const, status: 'completed' as const, disciplineKey: 'kickboxing' as const,
      category: 'technique' as const, workoutDate: date, timezone: 'Europe/Warsaw', durationSeconds: 5400,
      workSeconds: null, sparringSeconds: null, completion: null, rpe: 7, rpeRecordedAt: instant,
      focusRatings: [], sparring: [], note: 'Zajęcia w klubie: obrona przed prostymi i odpowiedź niskim kopnięciem.', createdAt: instant, updatedAt: instant }]
}).flat()

export const demoProfile: AthleteProfile = { healthDataConsent: { grantedAt: createdAt, noticeVersion: '2026-11', adultConfirmed: true },
  weightClassLabel: '−75 kg', createdAt, updatedAt: createdAt }
export const demoWeights: BodyWeight[] = Array.from({ length: 20 }, (_, index) => {
  const date = dateAfter(Math.round(index * 66 / 19)), instant = `${date}T07:00:00.000Z`
  return { date, weightKg: Math.round((76.2 - index * 0.045 + [0, 0.2, -0.1][index % 3]) * 10) / 10, createdAt: instant, updatedAt: instant }
})
export const demoWeeks: WeekPlan[] = ['2026-11-09', '2026-11-16'].map((weekStart) => ({ weekStart,
  createdAt: `${weekStart}T07:00:00.000Z`, updatedAt: `${weekStart}T07:00:00.000Z`, editedAfterWeekEnd: false,
  items: [{ id: 'technique', kind: 'plan', workoutPlanId: demoPlans[0].id, planNameSnapshot: demoPlans[0].nameSnapshot },
    { id: 'sparring', kind: 'category', category: 'sparring' }, { id: 'club', kind: 'category', category: 'technique' }] }))
