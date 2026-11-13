/** Closed model registry; names alone do not enable rules, subscriptions or account operations. */
export const USER_COLLECTIONS = [
  'workoutPlans', 'workoutSessions', 'focusSkills', 'weekPlans',
  'readiness', 'bodyWeights', 'controlTests', 'controlTestResults',
] as const

export const IMPLEMENTED_USER_COLLECTIONS = ['workoutPlans', 'workoutSessions', 'focusSkills', 'weekPlans', 'bodyWeights'] as const satisfies readonly (typeof USER_COLLECTIONS[number])[]
