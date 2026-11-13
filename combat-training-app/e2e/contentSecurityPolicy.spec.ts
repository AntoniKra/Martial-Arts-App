import { test, expect } from './fixtures'
import { previewContentSecurityPolicy } from '../config/contentSecurityPolicy'

declare global {
  interface Window {
    recordCspViolation: (violation: { directive: string; blockedURI: string; documentURI: string }) => Promise<void>
  }
}

test.use({ serviceWorkers: 'allow', screenshot: 'off', trace: 'off' })

test('enforces CSP without violations during sign-in, a workout save and offline navigation', async ({ app, page, context }) => {
  const violations: { directive: string; blockedURI: string; documentURI: string }[] = []
  const consoleViolations: string[] = []
  page.on('console', (message) => {
    if (/content.security.policy|violates.*directive/i.test(message.text())) consoleViolations.push(message.text())
  })
  await context.exposeBinding('recordCspViolation', (_source, violation: typeof violations[number]) => {
    violations.push(violation)
  })
  // Record outside the document so a reload (including a SW navigation) cannot erase earlier violations.
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      void window.recordCspViolation({
        directive: event.effectiveDirective, blockedURI: event.blockedURI, documentURI: event.documentURI,
      })
    })
  })

  const response = await page.goto('/login')
  expect(response?.headers()['content-security-policy']).toBe(previewContentSecurityPolicy)
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  await app.createPlan('Plan CSP')
  await app.openPlayer()
  await app.finishWorkout()
  expect(await app.readSessions()).toHaveLength(1)

  await app.prepareOffline()
  await context.setOffline(true)
  try {
    const offlineResponse = await page.goto('/workouts?tab=history')
    expect(offlineResponse?.fromServiceWorker()).toBe(true)
    expect(offlineResponse?.headers()['content-security-policy']).toBe(previewContentSecurityPolicy)
    await expect(page.getByRole('heading', { name: 'Plan CSP', exact: true })).toBeVisible()
    await expect(page.getByRole('main')).toBeVisible()
  } finally {
    await context.setOffline(false)
  }

  // Let queued securitypolicyviolation events and the exposed binding reach the test process.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)))
  expect(violations).toEqual([])
  expect(consoleViolations).toEqual([])
})
