import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { expect, it } from 'vitest'
import { RouteScreenHeader } from './ScreenHeader'

it('renders one heading and a named 44px back button for a subscreen', () => {
  const router = createMemoryRouter([{ path: '/', element: createElement(RouteScreenHeader, { title: 'Podsumowanie', fallback: '/workouts?tab=history' }) }])
  const html = renderToStaticMarkup(createElement(RouterProvider, { router }))
  expect(html).toContain('aria-label="Wstecz"')
  expect(html).toContain('size-11')
  expect(html.match(/<h1/g)).toHaveLength(1)
  expect(html).toContain('Podsumowanie</h1>')
})
