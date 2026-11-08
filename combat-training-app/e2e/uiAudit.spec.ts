import { block, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'
import { test, expect } from './fixtures'

for (const theme of ['dark', 'light'] as const) {
  test(`verifies audited cards, touch targets and no-work headings in ${theme} theme`, async ({ app, page }, testInfo) => {
    await app.open('/')
    await app.setTheme(theme)
    const exercise = { ...roundsExercise('exercise-1', 2, 60, 30), exerciseNameSnapshot: 'Praca na nogach' }
    const plan = { ...workoutPlan([block('block-1', [exercise])]), nameSnapshot: 'Technika bokserska' }
    await app.seedPlan(plan)
    const screenshot = async (name: string) => {
      if (testInfo.project.name !== 'phone') return
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({ path: testInfo.outputPath(`${name}-${theme}.png`) })
    }

    await app.open('/workouts')
    await expect(page.getByRole('article').getByText('ok. 2:30', { exact: true })).toBeVisible()
    const main = page.getByRole('main')
    const bottomPadding = await main.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingBottom))
    const navigation = page.getByRole('navigation', { name: 'Główna nawigacja', exact: true })
    if ((page.viewportSize()?.width ?? 0) < 768) {
      const navigationHeight = await navigation.evaluate((element) => element.getBoundingClientRect().height)
      expect(bottomPadding - navigationHeight).toBe(12)
    } else {
      expect(bottomPadding).toBe(32)
    }
    await screenshot('plans')
    await app.open('/')
    const featured = page.getByRole('region', { name: plan.nameSnapshot, exact: true })
    await expect(featured.getByText('Czas', { exact: true })).toBeVisible()
    await expect(featured.getByText('2:30', { exact: true })).toBeVisible()
    await screenshot('featured')

    await app.open(`/workouts/${plan.id}`)
    await app.openPlayer()
    await app.freezeClock()
    await app.startWorkout()
    await expect(page.getByText('PRACA', { exact: true })).toHaveClass(/text-crimson-ink/)
    await screenshot('player-work')
    await page.clock.fastForward(90_000)
    await page.getByRole('button', { name: 'Następny etap', exact: true }).click()
    await app.expectWorkoutSaved()

    const history = await app.openHistory()
    const card = history.getByRole('article')
    await expect(card.getByText('0/1 ćwiczeń', { exact: true })).toBeVisible()
    await expect(card.getByText('1/2 rund', { exact: true })).toBeVisible()
    const measureTouchTarget = async (label: string) => {
      const measurement = await card.getByRole('button', { name: label, exact: true }).evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const section = element.parentElement!.getBoundingClientRect()
        return { height: rect.height, width: rect.width, sectionWidth: section.width }
      })
      expect(measurement.height).toBeGreaterThanOrEqual(44)
      expect(measurement.width).toBe(measurement.sectionWidth)
      return { label, ...measurement }
    }
    const measurements = [await measureTouchTarget('Dodaj notatkę'), await measureTouchTarget('Usuń wpis')]
    await screenshot('history')
    await card.getByRole('button', { name: 'Dodaj notatkę', exact: true }).click()
    await card.getByRole('textbox').fill('Zachowaj kontrolę dystansu.')
    await card.getByRole('button', { name: 'Zapisz', exact: true }).click()
    const edit = card.getByRole('button', { name: 'Edytuj notatkę', exact: true })
    await expect(edit).toBeVisible()
    measurements.push(await measureTouchTarget('Edytuj notatkę'))
    await testInfo.attach('touch-targets', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' })
    await card.getByRole('button', { name: 'Usuń wpis', exact: true }).click()
    await expect(card.getByText('Czy na pewno chcesz usunąć ten wpis? Tej operacji nie można cofnąć.')).toBeVisible()
    await card.getByRole('button', { name: 'Anuluj', exact: true }).click()

    await app.open('/')
    const recent = page.getByRole('link').filter({ has: page.getByRole('heading', { name: plan.nameSnapshot, exact: true }) })
    await expect(recent.getByText('0/1 ćwiczeń', { exact: true })).toBeVisible()
    await expect(recent.getByText('1/2 rund', { exact: true })).toBeVisible()
    await recent.scrollIntoViewIfNeeded()
    await screenshot('recent-session')

    await app.open(`/workouts/${plan.id}`)
    await app.openPlayer()
    await app.startWorkout()
    for (let index = 0; index < 3; index += 1) {
      await page.getByRole('button', { name: 'Następny etap', exact: true }).click()
    }
    await expect(page.getByRole('heading', { name: 'Nie zapisano treningu', exact: true })).toBeVisible()
    await expect(page.getByText('Trening niezapisany', { exact: true })).toBeVisible()
    await screenshot('no-work')
  })
}
