import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { finalizeWorkoutPlan } from '@/domain/workout/finalizeWorkoutPlan'
import { workoutPlanToBuilderState } from '@/features/workout-builder/state/workoutPlanToBuilderState'
import { workoutBuilderReducer } from '@/features/workout-builder/state/workoutBuilder.reducer'
import { WorkoutHistoryCard } from '@/features/workouts/components/WorkoutHistoryCard'
import { mapWorkoutSessionsToHistoryListItems } from '@/features/workouts/mappers/workoutSessionHistoryListItemMapper'
import { DEFAULT_WORKOUT_PLAN_STORAGE_KEY, LocalStorageWorkoutPlanRepository } from '@/infrastructure/storage/localStorageWorkoutPlanRepository'
import { DEFAULT_WORKOUT_SESSION_STORAGE_KEY, LocalStorageWorkoutSessionRepository } from '@/infrastructure/storage/localStorageWorkoutSessionRepository'
import { createMemoryStorage } from '@/test/memoryStorage'
import { block, continuousExercise, workoutPlan } from '@/test/workoutBuilders'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'

function createPlan() {
  return workoutPlan([block('block-1', [continuousExercise('exercise-1', 60)])])
}

describe('LocalStorageWorkoutPlanRepository', () => {
  it('overwrites the same id without changing createdAt or adding a second plan', async () => {
    const storage = createMemoryStorage()
    const repository = new LocalStorageWorkoutPlanRepository(storage)
    const plan = createPlan()
    await repository.save(plan)
    const updated = { ...plan, customName: 'Zmieniony plan', nameSnapshot: 'Zmieniony plan' }
    await repository.save(updated)
    expect(await repository.list()).toEqual([updated])
    expect(await repository.getById(plan.id)).toEqual(updated)
    expect(JSON.parse(storage.getItem(DEFAULT_WORKOUT_PLAN_STORAGE_KEY) ?? '')).toEqual({ schemaVersion: 1, plans: [updated] })
  })

  it('deletes only the selected plan and persists the deletion', async () => {
    const storage = createMemoryStorage()
    const repository = new LocalStorageWorkoutPlanRepository(storage)
    const plan = createPlan()
    const other = { ...plan, id: 'other-plan' }
    await repository.save(plan)
    await repository.save(other)
    await repository.delete(plan.id)
    const reloaded = new LocalStorageWorkoutPlanRepository(storage)
    expect(await reloaded.getById(plan.id)).toBeNull()
    expect(await reloaded.list()).toEqual([other])
  })

  it('does not throw or write when deleting a missing plan, including empty storage', async () => {
    const storage = createMemoryStorage()
    const repository = new LocalStorageWorkoutPlanRepository(storage)
    const write = vi.spyOn(storage, 'setItem')
    await expect(repository.delete('missing')).resolves.toBeUndefined()
    expect(write).not.toHaveBeenCalled()
    await repository.save(createPlan())
    write.mockClear()
    await expect(repository.delete('missing')).resolves.toBeUndefined()
    expect(write).not.toHaveBeenCalled()
    expect(await repository.list()).toEqual([createPlan()])
  })

  it('keeps all plans when deletion cannot be written', async () => {
    const storage = createMemoryStorage()
    const repository = new LocalStorageWorkoutPlanRepository(storage)
    await repository.save(createPlan())
    const before = storage.getItem(DEFAULT_WORKOUT_PLAN_STORAGE_KEY)
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('Storage full') })
    await expect(repository.delete('plan-1')).rejects.toMatchObject({ code: 'write_failed' })
    expect(storage.getItem(DEFAULT_WORKOUT_PLAN_STORAGE_KEY)).toBe(before)
    expect(await repository.getById('plan-1')).toEqual(createPlan())
  })

  it.each(['{', '{"schemaVersion":2,"plans":[]}', '{"schemaVersion":1,"plans":[{}]}'])(
    'does not overwrite unreadable storage during deletion: %s', async (raw) => {
      const storage = createMemoryStorage()
      storage.setItem(DEFAULT_WORKOUT_PLAN_STORAGE_KEY, raw)
      const repository = new LocalStorageWorkoutPlanRepository(storage)
      await expect(repository.delete('plan-1')).rejects.toThrow()
      expect(storage.getItem(DEFAULT_WORKOUT_PLAN_STORAGE_KEY)).toBe(raw)
    },
  )

  it('reports read failures during deletion', async () => {
    const storage = createMemoryStorage()
    vi.spyOn(storage, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable') })
    await expect(new LocalStorageWorkoutPlanRepository(storage).delete('plan-1')).rejects.toMatchObject({ code: 'read_failed' })
  })

  it('preserves history bytes and snapshot rendering after editing and deleting a plan', async () => {
    const storage = createMemoryStorage()
    const plans = new LocalStorageWorkoutPlanRepository(storage)
    const sessions = new LocalStorageWorkoutSessionRepository(storage)
    const plan = createPlan()
    const session = workoutSession({
      workoutPlanNameSnapshot: plan.nameSnapshot,
      stepResults: [sessionStep({ nameSnapshot: 'Original exercise' })],
    })
    await plans.save(plan)
    await sessions.save(session)
    const historyBefore = storage.getItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY)

    const edited = workoutBuilderReducer(workoutPlanToBuilderState(plan), { type: 'setCustomName', customName: 'Nowa nazwa planu' })
    const result = finalizeWorkoutPlan(edited.draft)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected a valid plan')
    await plans.save(result.plan)
    expect(storage.getItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY)).toBe(historyBefore)
    expect(await sessions.getById(session.id)).toEqual(session)

    await plans.delete(plan.id)
    expect(storage.getItem(DEFAULT_WORKOUT_SESSION_STORAGE_KEY)).toBe(historyBefore)
    expect(await sessions.list()).toEqual([session])
    const [historyItem] = mapWorkoutSessionsToHistoryListItems(await sessions.list())
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(WorkoutHistoryCard, {
      session: historyItem,
      onUpdateNote: async () => 'applied' as const,
      onDelete: async () => 'applied' as const,
    })))
    expect(html).toContain(plan.nameSnapshot)
    expect(html).not.toContain('Nowa nazwa planu')
  })
})
