const AUTH_LEAVE_PATHS = new Set(['/login', '/register', '/forgot-password', '/verify-email'])

export function hasUnsavedPlanChanges(isDirty: boolean, allowLeave: boolean): boolean {
  return isDirty && !allowLeave
}

/**
 * Auth screens replace the route after sign-out. Blocking that redirect would
 * leave a signed-out builder on screen, so those paths are not confirmed here.
 */
export function blocksUnsavedPlanLeave(isDirty: boolean, allowLeave: boolean, nextPathname: string): boolean {
  if (!hasUnsavedPlanChanges(isDirty, allowLeave)) {
    return false
  }

  return !AUTH_LEAVE_PATHS.has(nextPathname)
}
