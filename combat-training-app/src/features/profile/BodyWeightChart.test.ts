import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { calculateWeeklyWeights } from '@/domain/profile/bodyWeight'
import { BodyWeightChart } from './BodyWeightChart'

describe('body weight SVG', () => {
  it('connects adjacent weeks only, fits Y to data with margin and exposes every week as text', () => {
    const instant = '2026-11-13T09:00:00.000Z'
    const weeks = calculateWeeklyWeights(['2026-10-19', '2026-10-26', '2026-11-09'].map((date) =>
      ({ date, weightKg: 76, createdAt: instant, updatedAt: instant })), '2026-11-13')
    const html = renderToStaticMarkup(createElement(BodyWeightChart, { weeks }))
    expect(html.match(/<circle /g)).toHaveLength(3)
    expect(html.match(/<line /g)).toHaveLength(3) // Two axes and exactly one adjacent pair.
    expect(html).toContain('75,5 kg')
    expect(html).toContain('76,5 kg')
    expect(html).toContain('role="img"')
    expect(html).toContain('przerwą, nie zerem')
    expect(html.match(/<th scope="row"/g)).toHaveLength(12)
    expect(html).toContain('trwa')
  })
  it('does not draw a zero-valued chart when there are no measurements', () => {
    const html = renderToStaticMarkup(createElement(BodyWeightChart, { weeks: calculateWeeklyWeights([], '2026-11-13') }))
    expect(html).not.toContain('<svg')
    expect(html).toContain('Brak pomiarów z ostatnich 12 tygodni.')
    expect(html.match(/Brak danych/g)).toHaveLength(12)
  })
})
