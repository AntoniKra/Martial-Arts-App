import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

test.use({ screenshot: 'off' })

async function capture(page: Page, info: TestInfo, name: string) {
  if (info.project.name !== 'phone' || info.repeatEachIndex !== 0) return
  const folder = path.resolve('docs/screenshots/issue-105')
  await mkdir(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  const file = path.join(folder, `${name}.png`)
  await page.screenshot({ path: file })
  await info.attach(name, { path: file, contentType: 'image/png' })
}

async function settings(page: Page, category = 'Worek') {
  await page.getByRole('button', { name: category, exact: true }).click()
  await page.getByRole('combobox', { name: 'Dyscyplina', exact: true }).selectOption('boxing')
  await page.getByRole('button', { name: '3 × 2:00 · przerwa 1:00', exact: true }).click()
}

async function openPlayer(page: Page) {
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page).toHaveURL('/quick-timer/active')
  await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toBeVisible()
  await expect(page.getByText('PRZYGOTUJ SIĘ', { exact: true })).toHaveCount(0)
}

test('opens New, configures three two-minute bag rounds and saves RPE and a note to history', async ({ app, page }, info) => {
  await app.open()
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' }).filter({ visible: true })
  await nav.getByRole('button', { name: 'Nowy', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nowy trening', exact: true })
  await expect(dialog.getByRole('link')).toHaveCount(3)
  for (const link of await dialog.getByRole('link').all()) {
    const box = await link.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
    expect(box?.width).toBeGreaterThanOrEqual(44)
  }
  for (const theme of ['dark', 'light'] as const) {
    await page.keyboard.press('Escape')
    await app.setTheme(theme)
    await nav.getByRole('button', { name: 'Nowy', exact: true }).click()
    await capture(page, info, `choice-${theme}-360x800`)
  }
  await dialog.getByRole('link', { name: /Szybki stoper/ }).click()
  await expect(page).toHaveURL('/quick-timer')
  await expect(nav.getByRole('button', { name: 'Nowy', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByText('Wybierz rodzaj treningu', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'Wybierz dyscyplinę' })).toBeVisible()
  await settings(page)
  await expect(page.getByText('8:00', { exact: true })).toBeVisible()
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await page.evaluate(() => scrollTo(0, 0))
    await capture(page, info, `settings-${theme}-360x800`)
  }
  await openPlayer(page)
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(480_000)
  await app.expectWorkoutSaved()
  const entry = (await app.readSessions())[0]
  expect(entry).toMatchObject({ source: 'quickTimer', category: 'bag', durationSeconds: 480, workSeconds: 360,
    completion: { completed: 3, planned: 3, unit: 'round' } })
  expect(await app.readPlans()).toHaveLength(0)
  const note = page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true })
  await note.fill('Trzy rundy na worku.')
  await page.getByRole('button', { name: 'Oceń teraz', exact: true }).click()
  await page.getByRole('radiogroup', { name: 'RPE od 0 do 10', exact: true }).getByRole('radio', { name: '6', exact: true }).check()
  await page.getByRole('button', { name: 'Zapisz RPE 6', exact: true }).click()
  await expect(note).toHaveValue('Trzy rundy na worku.')
  await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
  await expect(page).toHaveURL('/workouts?tab=history')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Szybki stoper', exact: true }) })
  await expect(card).toContainText('3/3 rund')
  await expect(card).not.toContainText('ćwiczeń')
  await expect(card.getByRole('link', { name: 'Podsumowanie', exact: true })).toBeVisible()
  await expect.poll(async () => (await app.readSessions())[0]?.note).toBe('Trzy rundy na worku.')
  expect((await app.readSessions())[0].rpe).toBe(6)
  await nav.getByRole('button', { name: 'Nowy', exact: true }).click()
  await dialog.getByRole('link', { name: /Szybki stoper/ }).click()
  await expect(page.getByRole('button', { name: 'Worek', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('combobox', { name: 'Dyscyplina', exact: true })).toHaveValue('boxing')
  await expect(page.getByRole('button', { name: '3 × 2:00 · przerwa 1:00', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('summarizes sparring in both themes, saves optional intensity and removes it when changed to pads', async ({ app, page }, info) => {
  await app.open('/quick-timer')
  await settings(page, 'Sparing')
  await openPlayer(page)
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(480_000)
  await app.expectWorkoutSaved()
  await expect(page.getByRole('group', { name: /Intensywność sparingu/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Ćwiczenia celu', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: /^Techniczny —/ }).click()
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await page.evaluate(() => scrollTo(0, 0))
    await page.getByRole('group', { name: /Intensywność sparingu/ }).scrollIntoViewIfNeeded()
    await capture(page, info, `sparring-summary-${theme}-360x800`)
    const violations = (await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))
    expect(violations).toEqual([])
  }
  await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
  await expect.poll(async () => (await app.readSessions())[0]?.sparring[0]?.intensity).toBe('technical')
  await page.getByRole('link', { name: 'Podsumowanie', exact: true }).click()
  await page.getByRole('button', { name: 'Tarcze', exact: true }).click()
  await expect(page.getByRole('group', { name: /Intensywność sparingu/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
  await expect.poll(async () => (await app.readSessions())[0]?.category).toBe('pads')
  const entry = (await app.readSessions())[0]
  expect(entry.sparring).toEqual([])
  expect(entry.sparringSeconds).toBe(0)
  if (entry.source !== 'quickTimer') throw new Error('Expected quick timer')
  expect(entry.stepResults.every((step) => step.blockType === 'pads' && step.nameSnapshot === 'Tarcze')).toBe(true)
})

test('reloads an active round with its correct remaining time and redirects home to the same timer', async ({ app, page }) => {
  await app.open('/quick-timer')
  await settings(page)
  await openPlayer(page)
  const time = Date.parse('2026-11-13T10:00:00.000Z')
  await page.clock.setFixedTime(new Date(time))
  await app.startWorkout()
  await page.clock.setFixedTime(new Date(time + 190_000))
  await expect(page.getByText('Runda 2 z 3', { exact: true })).toBeVisible()
  await expect(page.getByText('Pozostały czas: 1 minuta i 50 sekund', { exact: true })).toBeAttached()
  await page.reload()
  await expect(page).toHaveURL('/quick-timer/active')
  await expect(page.getByText('Pozostały czas: 1 minuta i 50 sekund', { exact: true })).toBeAttached()
  await page.goto('about:blank')
  await page.clock.setFixedTime(new Date(time + 230_000))
  await page.goto('/')
  await expect(page).toHaveURL('/quick-timer/active')
  await expect(page.getByText('Pozostały czas: 1 minuta i 10 sekund', { exact: true })).toBeAttached()
  await expect(page.getByRole('button', { name: 'Dźwięk wyłączony — stuknij, aby włączyć', exact: true })).toBeVisible()
})

test('opens New with the keyboard, traps focus, restores it on Escape and works in desktop navigation', async ({ app, page }, info) => {
  await app.open()
  for (const desktop of [false, true]) {
    if (desktop) await page.setViewportSize({ width: 1280, height: 800 })
    const nav = page.getByRole('navigation', { name: 'Główna nawigacja' }).filter({ visible: true })
    await expect(nav.getByRole('link')).toHaveText(['Start', 'Treningi', 'Postęp', 'Profil'])
    const trigger = nav.getByRole('button', { name: 'Nowy', exact: true })
    for (const control of [...await nav.getByRole('link').all(), trigger]) {
      const box = await control.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Nowy trening', exact: true })
    await expect(dialog).toBeVisible()
    const first = dialog.getByRole('link', { name: /Szybki stoper/ })
    const close = dialog.getByRole('button', { name: 'Zamknij', exact: true })
    await expect(first).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(close).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(first).toBeFocused()
    if (desktop) await capture(page, info, 'choice-desktop-1280x800')
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
  }
})

test('requires an active quick timer for direct entry and supports custom counters without a saved plan', async ({ app, page }) => {
  await app.open('/quick-timer/active')
  await expect(page).toHaveURL('/quick-timer')
  await settings(page)
  await page.getByRole('button', { name: 'Własny', exact: true }).click()
  await page.getByRole('button', { name: 'Zmniejsz: Liczba rund', exact: true }).click()
  await page.getByRole('button', { name: 'Zmniejsz: Czas pracy', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Liczba rund', exact: true })).toHaveText('2')
  await expect(page.getByRole('status', { name: 'Czas pracy', exact: true })).toHaveText('1:45')
  await openPlayer(page)
  await expect(page.getByText('Runda 1 z 2', { exact: true })).toBeVisible()
  expect(await app.readPlans()).toHaveLength(0)
})

test.describe('offline with precache', () => {
  test.use({ serviceWorkers: 'allow' })
  test('opens an unvisited quick timer offline, starts and queues the entry until reconnecting', async ({ app, page, context }) => {
    await app.open()
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await context.setOffline(true)
    try {
      const response = await page.goto('/quick-timer')
      expect(response?.fromServiceWorker()).toBe(true)
      await expect(page.getByRole('heading', { name: 'Szybki stoper', exact: true })).toBeVisible()
      await settings(page)
      await openPlayer(page)
      await app.freezeClock()
      await app.startWorkout()
      await page.clock.fastForward(480_000)
      await app.expectWorkoutSaved()
      await expect(page.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
      expect(await app.readSessions()).toHaveLength(0)
      await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
      await expect(page).toHaveURL('/workouts?tab=history')
      const history = page.getByRole('region', { name: 'Historia treningów', exact: true })
      await expect(history.getByRole('heading', { name: 'Szybki stoper', exact: true })).toBeVisible()
      await expect(history.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
      await context.setOffline(false)
      await expect.poll(async () => (await app.readSessions()).length).toBe(1)
      await expect(history.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
      expect((await app.readSessions())[0].source).toBe('quickTimer')
    } finally { await context.setOffline(false) }
  })
})
