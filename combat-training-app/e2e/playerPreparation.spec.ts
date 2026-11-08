import AxeBuilder from '@axe-core/playwright'

import { test, expect } from './fixtures'

for (const theme of ['dark', 'light'] as const) {
  test(`remembers five seconds, counts down and excludes preparation from the saved workout in ${theme} theme`, async ({ app, page }, testInfo) => {
    await app.createPlan('Przygotowanie do treningu')
    await app.setTheme(theme)
    const setting = page.getByRole('radiogroup', { name: 'Przygotowanie przed startem', exact: true })
    await expect(setting.getByRole('radio', { name: '10 s', exact: true })).toBeChecked()
    await setting.getByRole('radio', { name: '5 s', exact: true }).click()
    await page.reload()
    await expect(setting.getByRole('radio', { name: '5 s', exact: true })).toBeChecked()
    await page.evaluate(() => document.fonts.ready)
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
    if (testInfo.project.name === 'phone') {
      const path = testInfo.outputPath(`preparation-setting-${theme}.png`)
      await page.screenshot({ path })
      await testInfo.attach(`preparation-setting-${theme}`, { path, contentType: 'image/png' })
    }

    await app.openPlayer()
    await app.freezeClock()
    await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
    await expect(page.getByText('PRZYGOTUJ SIĘ', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Zacznij teraz', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Poprzedni etap', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Następny etap', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Menu treningu', exact: true })).toBeDisabled()
    expect(await app.readSessions()).toHaveLength(0)
    await page.evaluate(() => document.fonts.ready)
    if (testInfo.project.name === 'phone') {
      const path = testInfo.outputPath(`preparation-player-${theme}.png`)
      await page.screenshot({ path })
      await testInfo.attach(`preparation-player-${theme}`, { path, contentType: 'image/png' })
    }
    const viewport = page.viewportSize()!
    const buttonBox = (await page.getByRole('button', { name: 'Zacznij teraz', exact: true }).boundingBox())!
    expect(buttonBox.height).toBe(128)
    expect(Math.min(viewport.height, buttonBox.y + buttonBox.height) - buttonBox.y).toBeGreaterThanOrEqual(100)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)

    const digits = page.locator('span[aria-hidden="true"]')
    for (let remaining = 5; remaining > 0; remaining -= 1) {
      await expect(digits.filter({ hasText: new RegExp(`^${remaining}$`) })).toBeVisible()
      await page.clock.runFor(1000)
    }
    await expect(page.getByText('PRACA', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pauza', exact: true })).toBeVisible()
    await expect(page.getByText('Pozostały czas: 1 minuta', { exact: true })).toBeAttached()
    await page.clock.fastForward(210_000)
    await app.expectWorkoutSaved()
    const sessions = await app.readSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      startedAt: '2026-11-03T10:00:05.000Z', durationSeconds: 210, workSeconds: 180,
      stepResults: [{ kind: 'exercise' }, { kind: 'roundRest' }, { kind: 'exercise' }, { kind: 'exercise' }],
    })
  })

  test(`has accessible preparation controls and timer in ${theme} theme`, async ({ app, page }) => {
    await app.createPlan('Dostepne przygotowanie')
    await app.setTheme(theme)
    await app.openPlayer()
    // Keep the preparation deadline fixed while allowing axe's own timers to run.
    await page.clock.setFixedTime(new Date('2026-11-03T10:00:00Z'))
    await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
    await expect(page.getByText('PRZYGOTUJ SIĘ', { exact: true })).toBeVisible()
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
    await expect(page.getByText('Pozostały czas: 10 sekund', { exact: true })).toBeAttached()
  })
}

test('catches up from hidden preparation and never repeats it after pause or rest', async ({ app, page }) => {
  await app.createPlan('Przygotowanie w tle')
  await app.openPlayer()
  await app.freezeClock()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  // fastForward invokes each overdue interval once, simulating a suspended tab.
  await page.clock.fastForward(20_000)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByText('PRACA', { exact: true })).toBeVisible()
  await expect(page.getByText('Pozostały czas: 50 sekund', { exact: true })).toBeAttached()
  await page.getByRole('button', { name: 'Pauza', exact: true }).click()
  await page.clock.fastForward(90_000)
  await page.getByRole('button', { name: 'Wznów', exact: true }).click()
  await expect(page.getByText('PRZYGOTUJ SIĘ', { exact: true })).toHaveCount(0)
  await page.clock.runFor(50_000)
  await expect(page.getByText('ODPOCZYNEK', { exact: true })).toBeVisible()
  await page.clock.runFor(30_000)
  await expect(page.getByText('PRACA', { exact: true })).toBeVisible()
  await page.clock.fastForward(120_000)
  await app.expectWorkoutSaved()
  expect((await app.readSessions())[0]).toMatchObject({
    startedAt: '2026-11-03T10:00:10.000Z', durationSeconds: 210, workSeconds: 180,
  })
})

test('starts now at the actual click time and prepares again for a new session', async ({ app, page }) => {
  await app.createPlan('Pominiete przygotowanie')
  await app.openPlayer()
  await app.freezeClock()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  await page.clock.runFor(2500)
  await page.getByRole('button', { name: 'Zacznij teraz', exact: true }).click()
  await expect(page.getByText('Pozostały czas: 1 minuta', { exact: true })).toBeAttached()
  await page.clock.fastForward(210_000)
  await app.expectWorkoutSaved()
  expect((await app.readSessions())[0]).toMatchObject({
    startedAt: '2026-11-03T10:00:02.500Z', durationSeconds: 210, workSeconds: 180,
  })
  await app.freezeClock()
  await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
  await app.openPlayer()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  await expect(page.getByText('PRZYGOTUJ SIĘ', { exact: true })).toBeVisible()
  await expect(page.getByText('Pozostały czas: 10 sekund', { exact: true })).toBeAttached()
  await page.clock.runFor(10_000)
  await expect(page.getByText('PRACA', { exact: true })).toBeVisible()
  await page.clock.fastForward(210_000)
  await app.expectWorkoutSaved()
  await expect.poll(async () => (await app.readSessions()).length).toBe(2)
  expect((await app.readSessions()).map(({ durationSeconds }) => durationSeconds)).toEqual([210, 210])
})

test('leaves preparation without saving or creating an exit confirmation', async ({ app, page }) => {
  const planUrl = await app.createPlan('Wyjscie przed startem')
  await app.openPlayer()
  await app.freezeClock()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  await page.clock.runFor(5000)
  await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
  await expect(page).toHaveURL(planUrl)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.clock.fastForward(300_000)
  expect(await app.readSessions()).toHaveLength(0)
})

test('uses ten seconds in both the setting and player after a failed preference write', async ({ app, page }) => {
  await app.createPlan('Niedostepna pamiec ustawien')
  const setting = page.getByRole('radiogroup', { name: 'Przygotowanie przed startem', exact: true })
  await setting.getByRole('radio', { name: '30 s', exact: true }).click()
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'combat-training.preparationSeconds') throw new DOMException('Storage full', 'QuotaExceededError')
      setItem.call(this, key, value)
    }
  })
  await setting.getByRole('radio', { name: '5 s', exact: true }).click()
  await expect(setting.getByRole('radio', { name: '10 s', exact: true })).toBeChecked()
  await app.openPlayer()
  await app.freezeClock()
  await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
  await expect(page.getByText('PRZYGOTUJ SIĘ', { exact: true })).toBeVisible()
  await expect(page.getByText('Pozostały czas: 10 sekund', { exact: true })).toBeAttached()
  await page.clock.runFor(10_000)
  await expect(page.getByText('PRACA', { exact: true })).toBeVisible()
})
