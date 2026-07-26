import { formatPolishCount } from '@/features/workout-builder/utils/polishPlural'

export function formatRemainingSecondsAccessiblePl(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const remainderSeconds = seconds % 60

  if (minutes === 0) {
    return `Pozostały czas: ${formatPolishCount(seconds, 'sekunda', 'sekundy', 'sekund')}`
  }

  if (remainderSeconds === 0) {
    return `Pozostały czas: ${formatPolishCount(minutes, 'minuta', 'minuty', 'minut')}`
  }

  return `Pozostały czas: ${formatPolishCount(minutes, 'minuta', 'minuty', 'minut')} i ${formatPolishCount(remainderSeconds, 'sekunda', 'sekundy', 'sekund')}`
}
