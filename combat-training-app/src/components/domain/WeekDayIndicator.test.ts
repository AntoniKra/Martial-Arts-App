import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WeekDayIndicator } from './WeekDayIndicator'
import { weekDayState, type WeekDayState } from './weekDayPresentation'

describe('week day presentation', () => {
  it('shares the checkmark and status between Start and Progress', () => {
    const props = { state: 'done' as const, name: 'Sobota', short: 'So', today: true }
    const home = renderToStaticMarkup(createElement(WeekDayIndicator, { ...props, variant: 'home' }))
    const progress = renderToStaticMarkup(createElement(WeekDayIndicator, props))
    expect(home).toContain('home-week-day')
    expect(home).toContain('aria-hidden="true">✓</span>')
    expect(home).toContain('sobota: wykonany, dziś')
    expect(home).not.toContain('motion-status-change')
    expect(progress).toContain('progress-week-day')
    expect(progress).toContain('aria-hidden="true">✓</span>')
    expect(progress).toContain('sobota: wykonany, dziś')
  })
  it.each([
    [{ done: true, planned: true, missed: true }, 'done'],
    [{ done: false, planned: true, missed: true }, 'missed'],
    [{ done: false, planned: true, missed: false }, 'planned'],
    [{ done: false, planned: false, missed: false }, 'free'],
    [{ done: false, planned: false, missed: false, available: false }, 'unavailable'],
  ] as const)('maps existing day flags to their visual state', (flags, expected) => {
    expect(weekDayState(flags)).toBe(expected)
  })
  it.each<[WeekDayState, string, boolean]>([
    ['done', 'wykonany', true], ['planned', 'zaplanowany', false], ['free', 'wolne', false],
    ['missed', 'nie byłem', true], ['unavailable', 'plan niedostępny', false],
  ])('announces %s independently of colour', (state, description, symbol) => {
    const markup = renderToStaticMarkup(createElement(WeekDayIndicator, { state, name: 'Czwartek', short: 'Cz' }))
    expect(markup).toContain(`role="img" aria-label="czwartek: ${description}"`)
    expect(markup).toContain(`week-day-dot is-${state}`)
    expect(markup.includes(state === 'done' ? '✓' : '<svg')).toBe(symbol)
  })

  it('announces today together with the status', () => {
    const markup = renderToStaticMarkup(createElement(WeekDayIndicator, { state: 'planned', name: 'Czwartek', short: 'Cz', today: true }))
    expect(markup).toContain('czwartek: zaplanowany, dziś')
    expect(markup).toContain('bg-crimson-ink')
  })
})
