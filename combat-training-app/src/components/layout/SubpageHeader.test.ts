import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { expect, it } from 'vitest'
import { SubpageHeader } from './SubpageHeader'
import { subpageBackTarget } from './subpageBackTarget'

it('returns to the preceding application entry', () => {
  expect(subpageBackTarget('feedback-entry', 2)).toBe(-1)
})

it.each([
  ['default', 0], ['default', 4], ['entry', 0], ['entry', undefined], ['entry', null], ['entry', '2'],
])('falls back to history without an application entry: %s / %s', (key, index) => {
  expect(subpageBackTarget(String(key), index)).toBe('/workouts?tab=history')
})

it('renders one heading and a named 44px back button', () => {
  const router = createMemoryRouter([{ path: '/', element: createElement(SubpageHeader, { title: 'Podsumowanie' }) }])
  const html = renderToStaticMarkup(createElement(RouterProvider, { router }))
  expect(html).toContain('aria-label="Wstecz"')
  expect(html).toContain('size-touch')
  expect(html.match(/<h1/g)).toHaveLength(1)
  expect(html).toContain('Podsumowanie</h1>')
})
