import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { Component } from './ProgressPage'

vi.mock('@/application/workoutDataContext', () => ({
  useWorkoutData: () => ({
    currentWeek: '2026-11-09',
    profile: { status: 'ready', items: [] }, bodyWeights: { items: [] }, wellbeing: { items: [] },
    weekPlans: { status: 'ready', items: [], complete: true, rangeStart: '2026-08-17', pendingIds: new Set(), invalidDocumentIds: [] },
    focusSkills: { status: 'ready', items: [{ id: 'guard', name: 'Guard', criterion: 'Chin',
      archivedAt: '2026-11-10T10:00:00.000Z' }], complete: true, pendingIds: new Set(), invalidDocumentIds: [], hasPendingWrites: false },
    sessions: { status: 'ready', items: [], complete: true, invalidDocumentIds: [] },
    plans: { hasPendingWrites: false },
  }),
}))

it('explains the lack of active skills before the archived section without hiding archived skills', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Component)))
  expect(html).toContain('Brak aktywnych elementów do poprawy')
  expect(html.indexOf('Brak aktywnych elementów do poprawy')).toBeLessThan(html.indexOf('class="disclosure-card'))
  expect(html).toContain('Schowane (1)')
  expect(html).toContain('/progress/focus-skills/guard')
})
