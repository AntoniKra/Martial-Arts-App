import type { WorkoutPlaybackStep } from '@/domain/workout-playback/workoutPlayback.types'

export function countRemainingExerciseRounds(steps: readonly WorkoutPlaybackStep[], currentIndex: number): number {
  const current = steps[currentIndex]
  if (!current || current.kind === 'break') return 0
  let count = 0
  for (let index = currentIndex; index < steps.length; index += 1) {
    const step = steps[index]
    if (step.blockId !== current.blockId || step.itemId !== current.itemId) break
    if (step.kind === 'exercise') count += 1
  }
  return count
}
