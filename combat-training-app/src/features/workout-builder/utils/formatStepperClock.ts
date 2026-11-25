/** Stepper and structure-bar time as mm:ss, e.g. 03:00. Minutes keep counting above an hour. */
export function formatStepperClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
