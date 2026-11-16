export type WeekDayState = 'done' | 'planned' | 'free' | 'missed' | 'unavailable'

/** Presentation priority only; completion and plan matching remain in the domain. */
export function weekDayState({ done, planned, missed, available = true }: { done: boolean; planned: boolean; missed: boolean; available?: boolean }): WeekDayState {
  return done ? 'done' : missed ? 'missed' : planned ? 'planned' : available ? 'free' : 'unavailable'
}
