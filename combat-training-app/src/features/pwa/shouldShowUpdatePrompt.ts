import { isActiveWorkoutPath } from '@/application/auth/resolveAuthRoute'

/** Never offer a reload in any running player (plan or quick timer): it would interrupt the round. */
export function shouldShowUpdatePrompt(needRefresh: boolean, pathname: string): boolean {
  return needRefresh && !isActiveWorkoutPath(pathname.toLowerCase())
}
