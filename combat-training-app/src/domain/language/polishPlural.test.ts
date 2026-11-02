import { describe, expect, it } from 'vitest'

import { formatPolishCount, polishPlural } from '@/domain/language/polishPlural'

describe('polishPlural', () => {
  it.each([
    [0, 'ćwiczeń'],
    [1, 'ćwiczenie'],
    [2, 'ćwiczenia'],
    [4, 'ćwiczenia'],
    [5, 'ćwiczeń'],
    [11, 'ćwiczeń'],
    [12, 'ćwiczeń'],
    [14, 'ćwiczeń'],
    [21, 'ćwiczeń'],
    [22, 'ćwiczenia'],
    [25, 'ćwiczeń'],
    [101, 'ćwiczeń'],
    [112, 'ćwiczeń'],
    [122, 'ćwiczenia'],
  ])('uses the correct form for %i', (count, expected) => {
    expect(polishPlural(count, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')).toBe(expected)
  })
})

describe('formatPolishCount', () => {
  it('prefixes the count to the matching form', () => {
    expect(formatPolishCount(1, 'runda', 'rundy', 'rund')).toBe('1 runda')
    expect(formatPolishCount(3, 'runda', 'rundy', 'rund')).toBe('3 rundy')
    expect(formatPolishCount(5, 'runda', 'rundy', 'rund')).toBe('5 rund')
  })
})
