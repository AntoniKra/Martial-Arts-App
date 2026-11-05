import { test, expect } from './fixtures'

test.use({ serviceWorkers: 'allow' })

test('opens workouts offline after the first visit with a service worker', async ({ app, page, context }) => {
  // Visit only the start page online: /workouts must come from the cached app shell.
  await app.open()
  // Do not wait for this page to become controlled. open() navigates twice; if the worker activates
  // while the second document is still loading, clients.claim() skips it and the page stays
  // uncontrolled for good. Once ready resolves, every new navigation is handled by the worker.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await context.setOffline(true)
  try {
    const response = await page.goto('/workouts')
    expect(response?.fromServiceWorker()).toBe(true)
    await expect(page.getByRole('heading', { name: 'Treningi', exact: true })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Plany', exact: true })).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
})
