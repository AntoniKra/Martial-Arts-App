import AxeBuilder from '@axe-core/playwright'

import { test, expect } from './fixtures'

const BLOCKING_IMPACTS: readonly string[] = ['critical', 'serious', 'moderate']

for (const theme of ['dark', 'light'] as const) {
  for (const screen of ['start', 'workouts', 'builder', 'player'] as const) {
    test(`has no moderate, serious or critical axe violations on ${screen} in ${theme} theme`, async ({ app, page }, testInfo) => {
      if (screen === 'player') {
        await app.createPlan('Plan dostępności')
        await app.setTheme(theme)
        await app.openPlayer()
        await app.startWorkout()
      } else {
        const path = screen === 'start' ? '/' : screen === 'workouts' ? '/workouts' : '/workouts/new'
        await app.open(path)
        await app.setTheme(theme)
        const heading = screen === 'workouts' ? 'Treningi' : screen === 'builder' ? 'Nowy trening' : undefined
        if (heading) await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
      }

      await page.evaluate(() => document.fonts.ready)
      const { violations } = await new AxeBuilder({ page }).analyze()
      await testInfo.attach('axe-violations', {
        body: JSON.stringify({ project: testInfo.project.name, screen, theme, violations }, null, 2),
        contentType: 'application/json',
      })
      await testInfo.attach(`${screen}-${theme}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      })
      // Contrast and landmark issues were fixed, so anything from moderate up now blocks the test.
      const blocking = violations.filter(({ impact }) => impact && BLOCKING_IMPACTS.includes(impact))
      const minor = violations.filter((violation) => !blocking.includes(violation))
      if (minor.length > 0) {
        console.warn(JSON.stringify({ screen, theme, violations: minor.map(({ id, impact, nodes }) => ({
          id, impact, elements: nodes.length,
        })) }))
      }
      expect(blocking.map(({ id, impact, nodes }) => ({ id, impact, elements: nodes.length }))).toEqual([])
    })
  }
}
