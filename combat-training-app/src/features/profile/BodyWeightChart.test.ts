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
    expect(html).not.toContain('role="img"')
    expect(html).toContain('Brak pomiarów z ostatnich 12 tygodni.')
    expect(html.match(/Brak danych/g)).toHaveLength(12)
  })
  it('replaces the chart with a short explanation until the second measurement', () => {
    const entry = { date: '2026-11-13', weightKg: 76, createdAt: '2026-11-13T09:00:00Z', updatedAt: '2026-11-13T09:00:00Z' }
    const one = renderToStaticMarkup(createElement(BodyWeightChart, { weeks: calculateWeeklyWeights([entry], '2026-11-13') }))
    expect(one).not.toContain('role="img"')
    expect(one).toContain('Wykres pojawi się po 2 pomiarach')
    const two = renderToStaticMarkup(createElement(BodyWeightChart, { weeks: calculateWeeklyWeights([entry, { ...entry, date: '2026-11-12' }], '2026-11-13') }))
    expect(two).toContain('<svg')
  })
})
