import { describe, expect, it } from 'vitest'
import { rpeLabels } from './rpeLabels'

describe('RPE descriptions', () => {
  it('distinguishes the intermediate descriptions of eight and nine', () => {
    expect(rpeLabels.between[8]).toBe('Między bardzo ciężko a maksymalnie')
    expect(rpeLabels.between[9]).toBe('Prawie maksymalnie')
    expect(rpeLabels.between[8]).not.toBe(rpeLabels.between[9])
  })

  it('preserves the Foster anchors and the intermediate description of six', () => {
    expect(rpeLabels.descriptions).toEqual(['Odpoczynek', 'Bardzo, bardzo lekko', 'Lekko', 'Umiarkowanie', 'Dość ciężko', 'Ciężko', '', 'Bardzo ciężko', '', '', 'Maksymalnie'])
    expect(rpeLabels.between[6]).toBe('Między ciężko a bardzo ciężko')
  })
})
