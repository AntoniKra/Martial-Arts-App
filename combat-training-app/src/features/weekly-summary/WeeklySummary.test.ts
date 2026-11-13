import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutData } from '@/application/workoutDataContext'
import type { ManualWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { workoutSession } from '@/test/workoutSessionBuilders'
import { WeeklySummary } from './WeeklySummary'

const { useWorkoutData } = vi.hoisted(() => ({ useWorkoutData: vi.fn() }))
vi.mock('@/application/workoutDataContext', () => ({ useWorkoutData }))
const weekStart = '2026-11-09'
const entry = workoutSession({ workoutDate: weekStart, durationSeconds: 30.4, workSeconds: 0, sparringSeconds: 0 })
const timed = (id: string, workoutDate: string, minutes: number, rpe: number | null) =>
  workoutSession({ id, workoutDate, durationSeconds: minutes * 60, workoutPlanNameSnapshot: `Plan ${id}`, rpe })
let data: Pick<WorkoutData, 'sessions' | 'retrySessions' | 'currentWeek'>
const render = () => renderToStaticMarkup(createElement(WeeklySummary, { weekStart }))
const row = (html: string, label: string) => html.match(new RegExp(`<dt[^>]*>${label}</dt><dd[^>]*>([^<]*)</dd>`))?.[1]
const details = (html: string) => html.slice(html.indexOf('<details'))

beforeEach(() => {
  data = { sessions: { status: 'ready', complete: true, items: [entry], pendingIds: new Set(),
    hasPendingWrites: false, fromCache: false, invalidDocumentIds: [] }, retrySessions: vi.fn(), currentWeek: weekStart }
  useWorkoutData.mockImplementation(() => data)
})

describe('WeeklySummary collection states', () => {
  it.each([
    ['loading', { status: 'loading' as const }, 'Wczytywanie podsumowania', false],
    ['error with stale data', { status: 'error' as const }, 'Nie udało się wczytać treningów', true],
    ['incomplete cache', { complete: false, fromCache: true }, 'Historia treningów jest niepełna', true],
    ['unconfirmed completeness', { complete: undefined }, 'Historia treningów jest niepełna', true],
    ['invalid document', { invalidDocumentIds: ['bad'] }, 'Historia treningów jest niepełna', true],
  ])('does not show partial totals or a false zero for %s', (_name, overrides, message, retry) => {
    data.sessions = { ...data.sessions, items: [timed('a', weekStart, 60, 5)], ...overrides }
    const html = render()
    expect(html).toContain(message)
    expect(html.includes('Ponów odczyt podsumowania')).toBe(retry)
    expect(html).not.toContain('Treningi:')
    expect(html).not.toContain('Czas treningu')
    expect(html).not.toContain('Brak treningów w tym tygodniu')
    expect(html).not.toContain('RPE w')
    expect(html).not.toContain('j.u.')
    expect(html).not.toContain('Szczegóły obciążenia')
    expect(html).not.toContain('Ostatnie 12 tygodni')
    expect(html).not.toContain('role="img"')
    expect(html).not.toContain('Na tle 3 poprzednich tygodni')
    expect(html).not.toContain('Porównanie pojawi się')
  })

  it('renders recovered data, then recalculates when the collection changes', () => {
    data.sessions.status = 'error'
    expect(render()).not.toContain('Treningi:')
    data.sessions.status = 'ready'
    expect(render()).toContain('Treningi: 1')
    expect(render()).toContain('RPE w 0 z 1 treningów')
    data.sessions.items = [entry, { ...entry, id: 'second', rpe: 0 }]
    expect(render()).toContain('Treningi: 2')
    expect(render()).toContain('RPE w 1 z 2 treningów')
    // Two fractional sessions are formatted once after summing, using the journal convention.
    expect(render()).toContain('2 min')
  })

  it('renders an accessible chart with twelve data rows and rounds summed minutes like the summary', () => {
    data.sessions.items = [entry, { ...entry, id: 'second' }]
    const html = render()
    expect(html).toContain('Ostatnie 12 tygodni')
    expect(html).toContain('role="img" aria-label="Wykres słupkowy 12 tygodni. Treningi')
    expect(html).toContain('aria-pressed="true"')
    expect(html.match(/<th scope="row"/g)).toHaveLength(12)
    expect(html).toContain('<td>2</td><td>2</td>')
    expect(html).toContain('wybrany')
    expect(html).toContain('trwa')
  })

  it('shows full cached data with the existing pending-write indication without requiring week plans', () => {
    data.sessions.fromCache = true
    data.sessions.hasPendingWrites = true
    expect(render()).toContain('Treningi: 1')
    expect(render()).toContain('Czeka na wysłanie')
  })

  it('shows a truly empty week as zero without missing RPE or time coverage warnings', () => {
    data.sessions.items = []
    const html = render()
    expect(html).toContain('Brak treningów w tym tygodniu')
    expect(html).toContain('Treningi: 0')
    expect(html.match(/>0 s</g)).toHaveLength(4)
    expect(row(html, 'Obciążenie tygodnia')).toBe('0 j.u.')
    expect(row(html, 'Czas treningów z RPE')).toBe('0 s')
    expect(html).not.toContain('RPE w')
    expect(html).not.toContain('Dane w')
    expect(html).not.toContain('Brak danych')
    expect(html).not.toContain('Suma obejmuje')
    expect(html).not.toContain('Szczegóły obciążenia')
    expect(html).toContain('Pokaż dane')
  })
})

describe('WeeklySummary typical week comparison', () => {
  const comparison = (html: string) => html.match(/<table[^>]*><caption[^>]*>Na tle 3 poprzednich tygodni[\s\S]*?<\/table>/)?.[0]
  const cells = (html: string) => [...(comparison(html) ?? '').matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((match) => match[1])
  const previous = [timed('first', '2026-10-19', 60, 5), timed('second', '2026-10-26', 30, 4),
    timed('third', '2026-11-02', 30, 3), timed('fourth', '2026-11-08', 60, 0)]

  it('shows only the explanatory sentence for short or empty history', () => {
    expect(render()).toContain('Porównanie pojawi się po 3 pełnych tygodniach treningów.')
    expect(comparison(render())).toBeUndefined()
    data.sessions.items = []
    expect(render()).toContain('Porównanie pojawi się po 3 pełnych tygodniach treningów.')
  })

  it('renders caption and scoped headers before load details, with shared formatting and a neutral explanation', () => {
    data.sessions.items = [...previous, timed('current', weekStart, 130, 3)]
    const html = render()
    const table = comparison(html) ?? ''
    expect(table).toContain('<th scope="col" class="pb-2 pr-2">Ten tydzień (trwa)</th>')
    expect(table).toContain('Zwykle</th>')
    expect(table.match(/scope="row"/g)).toHaveLength(3)
    expect(cells(html)).toEqual(['1', '1,3', '130 min', '60 min', '390 j.u.', '170 j.u.'])
    expect(cells(html)[2]).toBe(row(html, 'Czas treningu'))
    expect(cells(html)[4]).toBe(row(html, 'Obciążenie tygodnia'))
    expect(html.indexOf(table)).toBeLessThan(html.indexOf('Szczegóły obciążenia'))
    expect(html).toContain('Zwykle = średnia z 3 tygodni przed tym tygodniem. Tygodnie bez treningów liczą się jako 0. To opis, nie ocena.')
    data.currentWeek = '2026-11-16'
    expect(comparison(render())).toContain('>Ten tydzień</th>')
    expect(comparison(render())).not.toContain('(trwa)')
  })

  it('distinguishes incomplete usual load and unknown current load from known zero', () => {
    data.sessions.items = [...previous, timed('missing', '2026-10-27', 30, null), timed('current', weekStart, 30, null)]
    expect(cells(render())).toEqual(['1', '1,7', '30 min', '70 min', 'Brak danych', 'Brak pełnych danych'])
    data.sessions.items = [...previous, timed('current', weekStart, 30, 0)]
    expect(cells(render())[4]).toBe('0 j.u.')
    data.sessions.items = [...previous, timed('known', weekStart, 30, 3), timed('unknown', weekStart, 10, null)]
    expect(cells(render())[4]).toBe(row(render(), 'Zarejestrowane obciążenie'))
  })

  it('retains zero for a genuinely empty selected week and for three empty previous weeks', () => {
    data.sessions.items = [timed('old', '2026-10-18', 30, null)]
    expect(cells(render())).toEqual(['0', '0,0', '0 s', '0 s', '0 j.u.', '0 j.u.'])
  })
})

describe('WeeklySummary training load', () => {
  it('labels partial coverage as recorded load, keeps total time separate, then shows full load after the missing RPE', () => {
    data.sessions.items = [timed('a', weekStart, 60, 5), timed('b', weekStart, 30, 3), timed('c', weekStart, 40, null)]
    let html = render()
    expect(row(html, 'Czas treningu')).toBe('130 min')
    expect(row(html, 'Zarejestrowane obciążenie')).toBe('390 j.u.')
    expect(row(html, 'Czas treningów z RPE')).toBe('90 min')
    expect(html).toContain('Jednostki umowne: minuty treningu × RPE')
    expect(html).toContain('Suma obejmuje tylko treningi z RPE.')
    expect(html.match(/RPE w 2 z 3 treningów/g)).toHaveLength(1)
    expect(html).not.toContain('Obciążenie tygodnia')
    data.sessions.items = [...data.sessions.items.slice(0, 2), timed('c', weekStart, 40, 4)]
    html = render()
    expect(row(html, 'Obciążenie tygodnia')).toBe('550 j.u.')
    expect(row(html, 'Czas treningów z RPE')).toBe('130 min')
    expect(html).toContain('RPE w 3 z 3 treningów')
    expect(html).not.toContain('Zarejestrowane obciążenie')
    expect(html).not.toContain('Suma obejmuje')
  })

  it('shows missing data instead of zero when no workout has RPE', () => {
    data.sessions.items = [timed('a', weekStart, 60, null), timed('b', weekStart, 30, null)]
    const html = render()
    expect(row(html, 'Zarejestrowane obciążenie')).toBe('Brak danych')
    expect(row(html, 'Czas treningów z RPE')).toBe('Brak danych')
    expect(html).toContain('RPE w 0 z 2 treningów')
    expect(html).not.toContain('Suma obejmuje')
    expect(html).not.toContain('>0 j.u.<')
  })

  it('lists session details newest first with explicit missing values and visible zeros', () => {
    const manual: ManualWorkoutSession = { id: 'manual', source: 'manual', status: 'completed', disciplineKey: 'boxing',
      category: 'bag', workoutDate: '2026-11-15', timezone: 'Europe/Warsaw', durationSeconds: 60, workSeconds: null,
      sparringSeconds: null, completion: null, note: null, rpe: 7, rpeRecordedAt: '2026-11-15T10:00:00.000Z', focusRatings: [], sparring: [],
      createdAt: '2026-11-15T10:00:00.000Z', updatedAt: '2026-11-15T10:00:00.000Z' }
    data.sessions.items = [timed('zero', '2026-11-10', 45, 0), manual, timed('none', '2026-11-10', 20, null), timed('old', '2026-11-08', 50, 9)]
    const html = details(render())
    expect(html).toContain('Szczegóły obciążenia')
    expect([...html.matchAll(/<li[^>]*><div><p[^>]*>([^<]*)<\/p><p[^>]*>([^<]*)<\/p>/g)].map((match) => [match[1], match[2]])).toEqual([
      ['Trening poza aplikacją · Worek', '15 lis'], ['Plan none', '10 lis'], ['Plan zero', '10 lis'],
    ])
    expect(row(html, 'RPE')).toBe('7')
    expect(row(html, 'Obciążenie')).toBe('7 j.u.')
    const items = html.split('<li').slice(1)
    expect(row(items[1], 'Czas treningu')).toBe('20 min')
    expect(row(items[1], 'RPE')).toBe('Brak RPE')
    expect(row(items[1], 'Obciążenie')).toBe('Brak obciążenia')
    expect(row(items[2], 'RPE')).toBe('0')
    expect(row(items[2], 'Obciążenie')).toBe('0 j.u.')
    expect(html).not.toContain('Plan old')
  })

  it('does not carry totals or details over to a different account collection', () => {
    data.sessions.items = [timed('a', weekStart, 60, 5)]
    expect(render()).toContain('300 j.u.')
    data.sessions = { ...data.sessions, status: 'loading', items: [] }
    expect(render()).not.toContain('j.u.')
    data.sessions = { ...data.sessions, status: 'ready', items: [] }
    const html = render()
    expect(html).not.toContain('300 j.u.')
    expect(html).not.toContain('Plan a')
  })
})
