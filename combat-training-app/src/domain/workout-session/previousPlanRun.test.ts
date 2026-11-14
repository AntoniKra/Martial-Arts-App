import { describe, expect, it } from 'vitest'
import type { QuickTimerWorkoutSession } from './workoutSession.types'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import { manualWorkoutSession } from '@/test/manualWorkoutBuilder'
import { block, continuousExercise, workoutPlan } from '@/test/workoutBuilders'
import { findPreviousPlanRun } from './previousPlanRun'

const current = workoutSession({ id: 'current', startedAt: '2026-11-13T10:00:00.000Z', completedAt: '2026-11-13T11:00:00.000Z' })
const older = workoutSession({ id: 'older', startedAt: '2026-11-06T10:00:00.000Z', completedAt: '2026-11-06T11:00:00.000Z' })
const { workoutPlanId: _planId, workoutPlanNameSnapshot: _name, focusRatings: _focus, exerciseRatings: _ratings, ...timed } = older
const quick: QuickTimerWorkoutSession = { ...timed, id: 'quick', source: 'quickTimer', completion: { completed: 1, planned: 1, unit: 'round' } }

describe('previous execution of the same plan', () => {
  it('selects the newest earlier start regardless of completion time, array order, or partial status', () => {
    const latest = { ...older, id: 'latest', status: 'partial' as const, startedAt: '2026-11-13T09:00:00.000Z', completedAt: '2026-11-13T09:15:00.000Z' }
    const entries = [current, latest, { ...older, completedAt: current.completedAt },
      workoutSession({ id: 'other-plan', workoutPlanId: 'other', startedAt: '2026-11-13T09:30:00.000Z' }),
      manualWorkoutSession(), quick, { ...current, id: 'future', startedAt: '2026-11-13T11:00:00.000Z' }]
    for (const sessions of [entries, [...entries].reverse()]) expect(findPreviousPlanRun(current, sessions)?.session).toBe(latest)
    expect(entries[0]).toBe(current)
  })

  it('orders starts on the same day by time, and equal instants by ID', () => {
    const earlier = { ...current, id: 'z-earlier', startedAt: '2026-11-13T09:59:59.000Z' }
    const firstTie = { ...current, id: 'a' }, lastTie = { ...current, id: 'b' }, laterTie = { ...current, id: 'z' }
    expect(findPreviousPlanRun(current, [laterTie, earlier, current])?.session).toBe(earlier)
    expect(findPreviousPlanRun(current, [firstTie, laterTie, earlier, lastTie, current])?.session).toBe(lastTie)
    expect(findPreviousPlanRun(firstTie, [lastTie, current, firstTie])).toBeNull()
  })

  it('excludes self by ID even when the same session has a different start in the collection', () => {
    expect(findPreviousPlanRun(current, [{ ...older, id: current.id }])).toBeNull()
  })

  it('returns no comparison without an earlier run or for other sources', () => {
    expect(findPreviousPlanRun(current, [])).toBeNull()
    expect(findPreviousPlanRun(current, [current, quick, manualWorkoutSession()])).toBeNull()
    expect(findPreviousPlanRun(quick, [older])).toBeNull()
    expect(findPreviousPlanRun(manualWorkoutSession(), [older])).toBeNull()
  })

  const steps = [
    sessionStep({ roundNumber: 1, roundCount: 2 }),
    sessionStep({ playbackStepId: 'step-2', roundNumber: 2, roundCount: 2 }),
    sessionStep({ playbackStepId: 'step-3', workoutItemId: 'exercise-2' }),
  ]
  const previousRun = { ...older, stepResults: steps }
  const currentRun = { ...current, stepResults: steps }
  const editedPlan = { ...workoutPlan([]), updatedAt: '2026-11-07T10:00:00.000Z' }

  it.each([
    { blockId: 'other-block' },
    { workoutItemId: 'other-exercise' },
    { kind: 'roundRest' as const },
    { roundNumber: 3 },
    { roundCount: 3 },
  ])('detects changed layout fields without a surviving plan: %j', (change) => {
    const changed = { ...currentRun, stepResults: steps.map((step, index) => index === 0 ? { ...step, ...change } : step) }
    expect(findPreviousPlanRun(changed, [previousRun])?.planChanged).toBe(true)
    expect(findPreviousPlanRun(changed, [previousRun], workoutPlan([]))?.planChanged).toBe(true)
  })

  it.each([
    ['added exercise', [...steps, sessionStep({ workoutItemId: 'exercise-3' })]],
    ['removed exercise', steps.slice(0, 2)],
    ['reordered exercises', [steps[2], steps[0], steps[1]]],
    ['added round', [...steps, sessionStep({ roundNumber: 3, roundCount: 3 })]],
    ['removed round', [steps[0], steps[2]]],
    ['reordered rounds', [steps[1], steps[0], steps[2]]],
  ])('detects layout changes (%s) with or without a surviving plan', (_label, stepResults) => {
    const changed = { ...currentRun, stepResults }
    expect(findPreviousPlanRun(changed, [previousRun])?.planChanged).toBe(true)
    expect(findPreviousPlanRun(changed, [previousRun], editedPlan)?.planChanged).toBe(true)
  })

  it.each([
    ['2026-11-06T10:59:59.999Z', false],
    [older.completedAt, false],
    ['2026-11-06T11:00:00.001Z', true],
  ])('requires a later plan edit for changed step durations at %s: %s', (updatedAt, planChanged) => {
    const changed = { ...currentRun, stepResults: steps.map((step, index) => index === 1 ? { ...step, plannedDurationSeconds: 75 } : step) }
    expect(findPreviousPlanRun(changed, [previousRun], { ...editedPlan, updatedAt })).toEqual({ session: previousRun, planChanged })
  })

  it.each([45, 75])('ignores a timer correction to %s seconds without a later plan edit', (plannedDurationSeconds) => {
    const adjusted = { ...currentRun, stepResults: steps.map((step) => ({ ...step, plannedDurationSeconds })) }
    expect(findPreviousPlanRun(adjusted, [previousRun], workoutPlan([]))?.planChanged).toBe(false)
    expect(findPreviousPlanRun(adjusted, [previousRun])?.planChanged).toBe(false)
    expect(findPreviousPlanRun(adjusted, [previousRun], { ...editedPlan, id: 'other' })?.planChanged).toBe(false)
  })

  it('ignores edits after both runs when the recorded layouts and durations match', () => {
    expect(findPreviousPlanRun(currentRun, [previousRun], { ...editedPlan, updatedAt: '2026-11-14T10:00:00.000Z' })?.planChanged).toBe(false)
  })

  it('ignores renamed plans and exercises, detached focus skills, and execution results', () => {
    const exercise = { ...continuousExercise('exercise-1', 60), focusSkillId: 'focus-1' }
    const planBefore = { ...workoutPlan([block('block-1', [exercise])]), updatedAt: older.completedAt }
    const renamedPlan = { ...planBefore, nameSnapshot: 'New plan name', customName: 'New plan name', updatedAt: editedPlan.updatedAt }
    const detachedPlan = { ...planBefore, blocks: [block('block-1', [{ ...exercise, focusSkillId: null }])], updatedAt: editedPlan.updatedAt }
    const changed = { ...currentRun, workoutPlanNameSnapshot: 'New plan name', focusRatings: [], stepResults: steps.map((step) => ({
      ...step, nameSnapshot: 'New exercise name', playbackStepId: `new-${step.playbackStepId}`,
      outcome: 'skipped' as const, performedDurationSeconds: 0,
    })) }
    for (const plan of [renamedPlan, detachedPlan]) {
      expect(findPreviousPlanRun(changed, [previousRun], plan)?.planChanged).toBe(false)
    }
  })

  it('compares deleted plans without the changed-plan notice and ignores another plan', () => {
    expect(findPreviousPlanRun(current, [older])).toEqual({ session: older, planChanged: false })
    expect(findPreviousPlanRun(current, [older], { ...workoutPlan([]), id: 'other', updatedAt: current.completedAt })?.planChanged).toBe(false)
  })
})
