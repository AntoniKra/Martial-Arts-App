import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { RecurringWeek, WeekActivity, Weekday, WeekPlan } from '@/domain/week-plan/weekPlan.types'
import type { WellbeingEntry } from '@/domain/wellbeing/wellbeing'
import type { SparringIntensity, WorkoutBlock, WorkoutExercise, WorkoutPlan } from '@/domain/workout/workout.types'
import { recurringOccurrenceId } from '@/domain/week-plan/scheduledWeek'
import { shiftCalendarDate, weekStartForDate } from '@/domain/week-plan/weekCalendar'
import { createWorkoutPlaybackTimeline } from '@/domain/workout-playback/createWorkoutPlaybackTimeline'
import { calculateWorkoutDate, calculateWorkoutSessionDurations, definePlanWorkoutSession } from '@/domain/workout-session/workoutSessionDefinitions'
import { mapPlaybackStepToSessionStepResult } from '@/features/workout-player/mappers/mapPlaybackStepToSessionStepResult'
import type { DemoData, DemoPersona } from './data'

const timezone = 'Europe/Warsaw'
type SessionKind =
  | { category: 'technique' | 'pads' | 'bag' | 'conditioning' }
  | { category: 'sparring'; intensity: SparringIntensity }

type WorkoutTemplate = SessionKind & {
  id: string
  day: Weekday
  name: string
  exercise: string
  rounds: number
  rpe: readonly number[]
  notes: readonly string[]
  focus?: { name: string; criterion: string; assessments: readonly number[] }
}

const kubaWorkouts: readonly WorkoutTemplate[] = [
  { id: 'boxing-technique', day: 0, category: 'technique', name: 'Podstawy boksu: garda i proste', exercise: 'Lewy i prawy prosty z powrotem do gardy', rounds: 4, rpe: [4, 5, 4],
    notes: ['Patrzeć przed siebie po każdym ciosie.', 'Garda wraca szybciej przy wolniejszym tempie.', 'Lepiej trzymam łokcie przy tułowiu.'],
    focus: { name: 'Powrót do gardy', criterion: 'Po prawym prostym prawa rękawica wraca do policzka.', assessments: [1, 2, 2, 3, 4, 4, 5, 5] } },
  { id: 'boxing-pads', day: 3, category: 'pads', name: 'Tarcze: proste i krok w bok', exercise: 'Dwa proste i zejście w lewo', rounds: 5, rpe: [6, 7, 5],
    notes: ['Po serii robię mały krok zamiast podskoku.', 'Ostatnie dwie rundy były najtrudniejsze.', 'Krótsze serie dały celniejsze trafienia.'],
    focus: { name: 'Krok w bok po serii', criterion: 'Po dwóch prostych schodzę w lewo bez krzyżowania nóg.', assessments: [1, 2, 2, 3, 3, 4, 4, 5] } },
]

const marekWorkouts: readonly WorkoutTemplate[] = [
  { id: 'kickboxing-technique', day: 0, category: 'technique', name: 'Kontra po zejściu z linii', exercise: 'Zejście na zewnątrz, prawy prosty i lewy hak', rounds: 6, rpe: [6, 7, 6],
    notes: ['Krótsze zejście pozwala szybciej wrócić z kontrą.', 'W ostatniej rundzie za wcześnie obracam biodro.', 'Działa kontra od razu po zejściu.'],
    focus: { name: 'Kontra po zejściu', criterion: 'Kończę zejście w pozycji, z której mogę od razu skontrować.', assessments: [4, 5, 4, 5, 5, 4, 5, 3] } },
  { id: 'kickboxing-pads', day: 1, category: 'pads', name: 'Tarcze: presja pod koniec rundy', exercise: 'Kombinacje ręczne zakończone kopnięciem na tułów', rounds: 7, rpe: [7, 8, 7],
    notes: ['Dobra celność mimo szybszej końcówki.', 'Mniej siły w pierwszej minucie, więcej zapasu na finisz.', 'Lewy sierpowy trafia po krótkim przygotowaniu.'] },
  { id: 'kickboxing-bag', day: 2, category: 'bag', name: 'Worek: zmiana wysokości', exercise: 'Proste, prawy na tułów i niski kop', rounds: 7, rpe: [6, 7, 8],
    notes: ['Po niskim kopie wracam na środek.', 'Seria wychodzi lepiej bez zatrzymania po prostych.', 'Moc utrzymana bez usztywniania barków.'],
    focus: { name: 'Równowaga po niskim kopie', criterion: 'Po kopnięciu odstawiam stopę pod biodrem i utrzymuję gardę.', assessments: [5, 4, 4, 5, 4, 5, 5, 4] } },
  { id: 'kickboxing-sparring', day: 4, category: 'sparring', intensity: 'hard', name: 'Mocny sparing: wyjścia spod presji', exercise: 'Rundy sparingowe', rounds: 8, rpe: [9, 8, 9, 10],
    notes: ['Pod presją pomaga wyjście w bok po kontrze.', 'Ostatnie rundy bez ustępowania prosto do tyłu.', 'Trudny partner, dobrze działał lewy prosty na dystans.'] },
  { id: 'kickboxing-conditioning', day: 6, category: 'conditioning', name: 'Kondycja: równe tempo', exercise: 'Skakanka z mocniejszą końcówką rundy', rounds: 6, rpe: [6, 7, 7],
    notes: ['Równe tempo, bez trudności w ostatniej rundzie.', 'Spokojniejszy początek po piątkowym sparingu.', 'Tętno szybciej spadało w przerwach.'] },
]

const technicalSparring: WorkoutTemplate = {
  id: 'kickboxing-technical-sparring', day: 4, category: 'sparring', intensity: 'technical',
  name: 'Lekki tydzień: sparing zadaniowy', exercise: 'Dystans i kontrolowana kontra', rounds: 5, rpe: [5, 6, 6],
  notes: ['Lekki kontakt, skupienie na dystansie.', 'Kontra bez przyspieszania za wszelką cenę.', 'Po wymianie wracam do spokojnego oddechu.'],
}

function makePlan(template: WorkoutTemplate, disciplineKey: DisciplineKey, createdAt: string): WorkoutPlan {
  const continuous = (id: string, name: string, durationSeconds: number): WorkoutExercise => ({
    id, type: 'exercise', exerciseNameSnapshot: name, combinationId: null, focusSkillId: null, instruction: null,
    configuration: { mode: 'continuous', durationSeconds },
  })
  const main = {
    id: template.category,
    items: [{
      id: 'main', type: 'exercise' as const, combinationId: null, exerciseNameSnapshot: template.exercise,
      focusSkillId: template.focus ? template.id : null, instruction: template.focus?.criterion ?? null,
      configuration: { mode: 'rounds' as const, roundCount: template.rounds,
        roundDurationSeconds: disciplineKey === 'boxing' ? 120 : 180, restBetweenRoundsSeconds: 60 },
    }],
  }
  const mainBlock: WorkoutBlock = template.category === 'sparring'
    ? { ...main, blockType: 'sparring', sparringIntensity: template.intensity }
    : { ...main, blockType: template.category }
  return {
    id: template.id, disciplineKey, nameSnapshot: template.name, customName: template.name, mainGoal: template.focus?.criterion ?? null,
    createdAt, updatedAt: createdAt,
    blocks: [
      { id: 'warmup', blockType: 'warmup', items: [continuous('warmup', 'Skakanka i rozgrzewka stawów', 480)] },
      mainBlock,
      { id: 'cooldown', blockType: 'cooldown', items: [continuous('cooldown', 'Spokojny oddech i rozciąganie', 240)] },
    ],
  }
}

function makeSession(template: WorkoutTemplate, plan: WorkoutPlan, date: string, week: number, light: boolean, focusSkills: FocusSkill[]) {
  const timeline = createWorkoutPlaybackTimeline(plan)
  const completedAt = `${date}T17:00:00.000Z`
  const steps = timeline.steps.map((step) => mapPlaybackStepToSessionStepResult(step, step.durationSeconds, 'completed'))
  const durations = calculateWorkoutSessionDurations(steps.map((step) => ({
    ...step, performedDurationMs: step.performedDurationSeconds * 1000,
  })))
  const session = definePlanWorkoutSession({
    id: `${template.id}-${week}`, workoutPlanId: plan.id, workoutPlanNameSnapshot: plan.nameSnapshot,
    disciplineKey: plan.disciplineKey, completedAt, startedAt: new Date(Date.parse(completedAt) - timeline.totalDurationSeconds * 1000).toISOString(),
    stepResults: steps, note: template.notes[week % template.notes.length],
  }, { timezone, blocks: plan.blocks, blockTypes: plan.blocks.map((block) => block.blockType), endedEarly: false, durations, focusSkills })
  const rpe = template.rpe[week % template.rpe.length]
  const assessments = template.focus?.assessments ?? []
  return {
    ...session, rpe: light && template.category !== 'sparring' ? rpe - 2 : rpe,
    rpeRecordedAt: new Date(Date.parse(completedAt) + 10 * 60_000).toISOString(),
    focusRatings: session.focusRatings.map((rating) => ({ ...rating, assessment: assessments[week % assessments.length] })),
  }
}

export function createShowcaseData(now: Date, persona: Exclude<DemoPersona, 'ola'>): DemoData {
  const demoInstant = now.toISOString()
  const today = calculateWorkoutDate(demoInstant, timezone)
  const currentWeek = weekStartForDate(today)
  const isKuba = persona === 'kuba'
  const weekCount = isKuba ? 8 : 16
  const firstWeek = shiftCalendarDate(currentWeek, -weekCount * 7)
  const createdAt = `${firstWeek}T07:00:00.000Z`
  const discipline = isKuba ? 'boxing' : 'kickboxing'
  const regularWorkouts = isKuba ? kubaWorkouts : marekWorkouts
  const templates = isKuba ? regularWorkouts : [...regularWorkouts, technicalSparring]
  const demoPlans = templates.map((template) => makePlan(template, discipline, createdAt))
  const plansById = new Map(demoPlans.map((plan) => [plan.id, plan]))
  const demoSkills: FocusSkill[] = templates.flatMap(({ id, focus }) => focus ? [{
    id, name: focus.name, criterion: focus.criterion, createdAt, updatedAt: createdAt, archivedAt: null, openCorrection: null,
  }] : [])
  const activity = (template: WorkoutTemplate, id = template.id): WeekActivity => ({
    id, kind: 'own', day: template.day, category: template.category,
    workoutPlanId: template.id, planNameSnapshot: template.name,
  })
  const demoRecurring: RecurringWeek = {
    id: 'default', revision: 1, createdAt, updatedAt: createdAt,
    items: isKuba ? [] : marekWorkouts.map((template) => activity(template)),
  }
  const demoSessions: DemoData['demoSessions'] = []
  const demoWeeks: WeekPlan[] = Array.from({ length: weekCount + 1 }, (_, week) => {
    const weekStart = shiftCalendarDate(firstWeek, week * 7)
    const light = !isKuba && week % 4 === 3
    // Midnight in Warsaw can fall on the preceding UTC date.
    const instant = `${shiftCalendarDate(weekStart, -1)}T22:00:00.000Z`
    const schedule = regularWorkouts.map((regular) => {
      const template = light && regular.category === 'sparring' ? technicalSparring : regular
      const day = week * 7 + template.day
      const date = shiftCalendarDate(firstWeek, day)
      // Thursday of week 9 through Saturday of week 10, inclusive.
      const recovery = !isKuba && ((day >= 59 && day <= 68) || (light && template.day === 6))
      const omitted = recovery || (week === weekCount && date < today)
      const missed = isKuba && template.day === 3 && [1, 4, 6].includes(week)
      if (week < weekCount && !omitted && !missed) {
        const plan = plansById.get(template.id)!
        demoSessions.push(makeSession(template, plan, date, week, light, demoSkills))
      }
      return { ...activity(template, recurringOccurrenceId(weekStart, regular.id)), omitted }
    })
    return {
      weekStart, schedule, items: [], revision: 1, editedAfterWeekEnd: false,
      targetCount: schedule.filter((item) => !item.omitted).length, createdAt: instant, updatedAt: instant,
      appliedRecurringRevision: isKuba ? 0 : 1, appliedRecurringIds: demoRecurring.items.map((item) => item.id),
    }
  })
  const demoWellbeing: WellbeingEntry[] = isKuba ? [2, 17, 31, 52].map((day, index) => {
    const date = shiftCalendarDate(firstWeek, day)
    const instant = `${date}T07:00:00.000Z`
    return { date, sleep: 3 + index % 3, energy: 3 + index % 2, soreness: 4, stress: 3,
      questionsVersion: 1, note: index === 2 ? 'Krótszy sen po późnym powrocie.' : null, createdAt: instant, updatedAt: instant }
  }) : []
  const demoProfile = {
    healthDataConsent: null, weightClassLabel: null, createdAt, updatedAt: createdAt,
    wellbeingConsent: isKuba ? { grantedAt: createdAt, noticeVersion: '2026-11', adultConfirmed: true as const } : null,
  }
  return { demoInstant, today, currentWeek, firstWeek, demoPlans, demoSessions, demoSkills, demoProfile,
    demoWeights: [], demoWeeks, demoWellbeing, demoExercises: [], demoRecurring }
}
