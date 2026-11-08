import { describe, expect, it } from 'vitest'

import { blocksUnsavedPlanLeave, hasUnsavedPlanChanges } from '@/features/workout-builder/unsavedPlanChanges'

describe('unsaved plan changes', () => {
  it('warns only while the builder is dirty and leave has not been allowed', () => {
    expect(hasUnsavedPlanChanges(true, false)).toBe(true)
    expect(hasUnsavedPlanChanges(false, false)).toBe(false)
    expect(hasUnsavedPlanChanges(true, true)).toBe(false)
  })

  it('blocks in-app leave and lets an auth redirect through', () => {
    expect(blocksUnsavedPlanLeave(true, false, '/')).toBe(true)
    expect(blocksUnsavedPlanLeave(true, false, '/workouts')).toBe(true)
    expect(blocksUnsavedPlanLeave(true, false, '/workouts/plan-1')).toBe(true)
    expect(blocksUnsavedPlanLeave(false, false, '/workouts')).toBe(false)
    expect(blocksUnsavedPlanLeave(true, true, '/workouts')).toBe(false)
    expect(blocksUnsavedPlanLeave(true, false, '/login')).toBe(false)
    expect(blocksUnsavedPlanLeave(true, false, '/register')).toBe(false)
    expect(blocksUnsavedPlanLeave(true, false, '/forgot-password')).toBe(false)
    expect(blocksUnsavedPlanLeave(true, false, '/verify-email')).toBe(false)
  })
})
