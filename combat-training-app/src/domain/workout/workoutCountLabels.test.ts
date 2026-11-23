import { expect, it } from 'vitest'
import { workoutCountNoun } from './workoutCountLabels'

it.each([
  [0, 'treningów'], [1, 'trening'], [2, 'treningi'], [3, 'treningi'], [4, 'treningi'],
  [5, 'treningów'], [11, 'treningów'], [12, 'treningów'], [13, 'treningów'],
  [14, 'treningów'], [21, 'treningów'], [22, 'treningi'], [104, 'treningi'], [112, 'treningów'],
])('declines a count of %i as %s', (count, label) => {
  expect(workoutCountNoun(count)).toBe(label)
})

it('uses the grammatical case required by totals and location phrases', () => {
  expect(workoutCountNoun(1, 'genitive')).toBe('treningu')
  expect(workoutCountNoun(2, 'genitive')).toBe('treningów')
  expect(workoutCountNoun(1, 'locative')).toBe('treningu')
  expect(workoutCountNoun(2, 'locative')).toBe('treningach')
})
