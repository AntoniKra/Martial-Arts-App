import { polishPlural } from '@/domain/language/polishPlural'

export function workoutCountNoun(count: number, grammaticalCase: 'count' | 'genitive' | 'locative' = 'count'): string {
  if (grammaticalCase === 'genitive') return count === 1 ? 'treningu' : 'treningów'
  if (grammaticalCase === 'locative') return count === 1 ? 'treningu' : 'treningach'
  return polishPlural(count, 'trening', 'treningi', 'treningów')
}
