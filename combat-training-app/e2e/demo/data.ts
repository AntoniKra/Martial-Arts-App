import type { WorkoutPlan, WorkoutExercise } from '../../src/domain/workout/workout.types'
import type { FocusSkill } from '../../src/domain/focus-skill/focusSkill.types'
import type { WorkoutSession, PlanWorkoutSession, QuickTimerWorkoutSession } from '../../src/domain/workout-session/workoutSession.types'
import type { AthleteProfile, BodyWeight } from '../../src/domain/profile/profile.types'
import type { PersonalExercise } from '../../src/domain/exercise/exercise'
import type { WellbeingEntry } from '../../src/domain/wellbeing/wellbeing'
import { shiftCalendarDate, weekStartForDate } from '../../src/domain/week-plan/weekCalendar'
import { calculateWorkoutDate } from '../../src/domain/workout-session/workoutSessionDefinitions'
import type { RecurringWeek, WeekPlan } from '../../src/domain/week-plan/weekPlan.types'
import { createWorkoutPlaybackTimeline } from '../../src/domain/workout-playback/createWorkoutPlaybackTimeline'
import { createShowcaseData } from './showcaseData'

function createOlaDemoData(now: Date) {
  const today = calculateWorkoutDate(now.toISOString(), 'Europe/Warsaw')
  const currentWeek = weekStartForDate(today)
  const firstWeek = shiftCalendarDate(currentWeek, -14 * 7)
  const createdAt = `${firstWeek}T07:00:00.000Z`
  const demoInstant = now.toISOString()
  const correction = { problem: 'Po prawym prostym opuszczam lewą rękę.', fix: 'Po każdym ciosie dotykam rękawicą policzka.' }
  const demoSkills: FocusSkill[] = [
    { id: 'guard', name: 'Powrót do gardy', criterion: 'Po każdej kombinacji obie rękawice wracają do policzków.' },
    { id: 'low-kick', name: 'Niski kop po kombinacji', criterion: 'Po kopnięciu wracam do stabilnej pozycji i patrzę na cel.' },
    { id: 'exit', name: 'Zejście z linii ataku', criterion: 'Każdą serię kończę krokiem w bok bez krzyżowania nóg.' },
  ].map((skill) => ({ ...skill, createdAt, updatedAt: createdAt, archivedAt: skill.id === 'exit' ? `${shiftCalendarDate(firstWeek, 28)}T07:00:00.000Z` : null, openCorrection: skill.id === 'guard' ? { ...correction, sessionId: 'plan-week-13', workoutDate: shiftCalendarDate(firstWeek, 91) } : null }))

  function exercise(id: string, name: string, focusSkillId: string | null = null): WorkoutExercise {
    if (focusSkillId === 'exit') focusSkillId = null // Archived skills stay in history only.
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
  const demoPlans: WorkoutPlan[] = planDefinitions.map((plan) => ({
    ...plan, customName: plan.nameSnapshot, disciplineKey: 'kickboxing', createdAt, updatedAt: createdAt,
  }))

  function dateAfter(days: number) {
    return shiftCalendarDate(firstWeek, days)
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
      focusRatings: ([0, 1, 2, 3, 7, 9, 11, 13].includes(week) ? demoSkills.filter((skill) => skill.id !== 'exit' || week < 3) : []).map((skill) => ({ workoutItemId: skill.id, focusSkillId: skill.id, skillNameSnapshot: skill.name,
        criterionSnapshot: skill.criterion, blockType: skill.id === 'low-kick' ? 'bag' : 'technique',
        assessment: skill.id === 'guard' ? (week === 13 ? 5 : Math.min(4, 2 + Math.floor(week / 4))) : 3, correction: (week === 0 || week === 13) && skill.id === 'guard' ? correction : null,
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

  function manualSession(week: number, day: number): WorkoutSession {
    const date = dateAfter(week * 7 + day), instant = `${date}T16:00:00.000Z`
    const parts = day === 4 ? ['technique'] as const : ['pads', 'sparring'] as const
    return { id: `club-week-${week}-${day}`, source: 'manual', status: 'completed', disciplineKey: 'kickboxing',
      category: day === 4 ? 'technique' : 'mixed', parts: [...parts], workoutDate: date, timezone: 'Europe/Warsaw', durationSeconds: 5400,
      workSeconds: null, sparringSeconds: null, completion: null, rpe: 7, rpeRecordedAt: instant,
      focusRatings: [], sparring: day === 4 ? [] : [{ blockId: null, rounds: 4, intensity: 'light' }],
      note: `Zajęcia w klubie. Problem: ${correction.problem} Poprawka: ${correction.fix}`, createdAt: instant, updatedAt: instant }
  }
  const demoSessions: WorkoutSession[] = Array.from({ length: 14 }, (_, week) => {
    if (week === 5 || week === 6) return [] // Two complete recovery weeks; never synthesize zero ratings.
    const count = 2 + week % 4
    return [planSession(week, dateAfter(week * 7)), quickSession(week, dateAfter(week * 7 + 2)),
      ...Array.from({ length: count - 2 }, (_, index) => manualSession(week, 4 + index))]
  }).flat()

  const consent = { grantedAt: createdAt, noticeVersion: '2026-11', adultConfirmed: true as const }
  const demoProfile: AthleteProfile = { healthDataConsent: consent, wellbeingConsent: consent,
    weightClassLabel: '−75 kg', createdAt, updatedAt: createdAt }
  const demoWeights: BodyWeight[] = Array.from({ length: 20 }, (_, index) => {
    const date = dateAfter(Math.round(index * 97 / 19)), instant = `${date}T07:00:00.000Z`
    return { date, weightKg: Math.round((76.2 - index * 0.045 + [0, 0.2, -0.1][index % 3]) * 10) / 10, createdAt: instant, updatedAt: instant }
  })
  const demoWellbeing: WellbeingEntry[] = Array.from({ length: 35 }, (_, index) => {
    const date = shiftCalendarDate(today, index - 34), instant = `${date}T06:00:00.000Z`
    return { date, sleep: 3 + index % 3, energy: 3 + index % 2, soreness: 2 + index % 3, stress: 3 + index % 2,
      questionsVersion: 1, note: index % 7 === 0 ? 'Spokojniejszy tydzień, więcej snu.' : null, createdAt: instant, updatedAt: instant }
  })
  const exerciseDefinitions: Pick<PersonalExercise, 'id' | 'namePl' | 'type' | 'blockTypes'>[] = [
    { id: 'my-guard', namePl: 'Dwa proste i powrót do gardy', type: 'drill', blockTypes: ['technique', 'bag'] },
    { id: 'my-feet', namePl: 'Krok w bok po kombinacji', type: 'drill', blockTypes: ['technique'] },
    { id: 'my-rope', namePl: 'Skakanka w spokojnym tempie', type: 'continuous', blockTypes: ['warmup'] },
  ]
  const demoExercises: PersonalExercise[] = exerciseDefinitions.map((item) => ({ ...item, disciplines: ['kickboxing'], favorite: item.id === 'my-guard', archivedAt: null,
    lastUsedAt: createdAt, createdAt, updatedAt: createdAt,
    defaultConfiguration: { mode: 'continuous', durationSeconds: 180 } }))
  const demoRecurring: RecurringWeek = { id: 'default', revision: 1, createdAt, updatedAt: createdAt, items: [
    { id: 'club-mon', kind: 'club', day: 0, disciplineKey: 'kickboxing', startTime: '18:00', endTime: '19:30', parts: ['pads', 'sparring'], clubName: 'Klub pokazowy' },
    { id: 'club-fri', kind: 'club', day: 4, disciplineKey: 'kickboxing', startTime: '18:00', endTime: '19:30', parts: ['technique'], clubName: 'Klub pokazowy' },
    { id: 'own', kind: 'own', day: 0, category: 'mixed', workoutPlanId: demoPlans[0].id, planNameSnapshot: demoPlans[0].nameSnapshot },
    { id: 'flexible', kind: 'own', day: null, category: 'sparring', workoutPlanId: null, planNameSnapshot: null },
  ] }
  const demoWeeks: WeekPlan[] = Array.from({ length: 15 }, (_, index) => {
    const weekStart = dateAfter(index * 7), instant = `${weekStart}T07:00:00.000Z`
    return { weekStart, createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false, items: [], revision: 1,
      targetCount: 4, appliedRecurringRevision: 1, appliedRecurringIds: demoRecurring.items.map((item) => item.id),
      schedule: demoRecurring.items.map((item) => ({ ...item, id: `${weekStart}:${item.id}`, omitted: item.id === 'club-mon',
        // A concrete moved occurrence, with Friday left unmatched and sparring outside the plan.
        ...(index === 13 && item.id === 'flexible' ? { day: 3 as const } : {}) })) }
  })
  return { demoInstant, today, currentWeek, firstWeek, demoPlans, demoSessions, demoSkills, demoProfile, demoWeights,
    demoWeeks, demoWellbeing, demoExercises, demoRecurring }
}

export const demoPersonas = ['kuba', 'ola', 'marek'] as const
export type DemoPersona = typeof demoPersonas[number]
export type DemoData = ReturnType<typeof createOlaDemoData>

export function createDemoData(now = new Date(), persona: DemoPersona = 'ola'): DemoData {
  return persona === 'ola' ? createOlaDemoData(now) : createShowcaseData(now, persona)
}

export const { demoInstant, demoPlans, demoSessions, demoSkills, demoProfile, demoWeights, demoWeeks,
  demoWellbeing, demoExercises, demoRecurring } = createDemoData()
