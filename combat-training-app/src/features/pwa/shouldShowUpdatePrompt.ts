export function shouldShowUpdatePrompt(needRefresh: boolean, pathname: string): boolean {
  return needRefresh && !/^\/workouts\/[^/]+\/active\/?$/i.test(pathname)
}
