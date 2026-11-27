import { selectRpe } from './rpeSlider'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createWorkoutPlaybackTimeline } from '../src/domain/workout-playback/createWorkoutPlaybackTimeline'
import { buildRecordedWorkoutSession } from '../src/features/workout-player/utils/workoutSessionRecording'
import { quickTimerPlan, quickTimerRecording } from '../src/test/quickTimerBuilders'
import { test, expect } from './fixtures'

test.use({ screenshot: 'off' })

async function capture(page: Page, info: TestInfo, name: string) {
  if (process.env.CAPTURE_QUICK_TIMER_SCREENSHOTS !== '1' || info.project.name !== 'phone' || info.repeatEachIndex !== 0) return
  const folder = path.resolve('docs/screenshots/issue-105')
  await mkdir(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  const file = path.join(folder, `${name}.png`)
  await page.screenshot({ path: file })
  await info.attach(name, { path: file, contentType: 'image/png' })
}

async function settings(page: Page) {
  await page.getByRole('button', { name: '3 × 2:00 przerwa 1:00', exact: true }).click()
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
  await nav.getByRole('button', { name: 'Trening', exact: true }).click()
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
    await nav.getByRole('button', { name: 'Trening', exact: true }).click()
    await capture(page, info, `choice-${theme}-360x800`)
  }
  await dialog.getByRole('link', { name: /Szybki stoper/ }).click()
  await expect(page).toHaveURL('/quick-timer')
  await expect(nav.getByRole('button', { name: 'Trening', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('group', { name: 'Rodzaj treningu', exact: true })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Dyscyplina', exact: true })).toHaveCount(0)
  await settings(page)
  await expect(page.getByRole('status', { name: 'Łączny czas', exact: true })).toHaveText('8:00')
  if (info.project.name === 'phone') {
    for (const theme of ['dark', 'light'] as const) {
      await app.setTheme(theme)
      for (const width of [360, 390]) {
        await page.setViewportSize({ width, height: 800 })
        const controls = page.getByRole('button', { name: /^(Zmniejsz|Zwiększ):/ })
        await expect(controls).toHaveCount(6)
        const positions = await controls.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top))
        expect(new Set(positions).size).toBe(1)
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      }
    }
  }
  await openPlayer(page)
  await expect(page.getByText('Worek · Boks', { exact: true })).toBeVisible()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(480_000)
  await app.expectWorkoutSaved()
  const entry = (await app.readSessions())[0]
  expect(entry).toMatchObject({ source: 'quickTimer', category: 'bag', disciplineKey: 'boxing', durationSeconds: 480, workSeconds: 360,
    completion: { completed: 3, planned: 3, unit: 'round' } })
  await expect(page.getByText('Ustawione domyślnie – zmień, jeśli trzeba', { exact: true })).toBeVisible()
  expect(await app.readPlans()).toHaveLength(0)
  const note = page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true })
  await note.fill('Trzy rundy na worku.')
  await page.getByRole('button', { name: 'Oceń teraz', exact: true }).click()
  await selectRpe(page, 6)
  await page.getByRole('button', { name: 'Zapisz RPE 6', exact: true }).click()
  // A value assertion also matches the hidden textarea while RPE is saving.
  // Wait for the visible result and server acknowledgement: removing the
  // pending banner during a pointer click moves Done away from that click.
  await expect(page.getByRole('status').filter({ hasText: 'Zapisano RPE 6' })).toBeVisible()
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await expect(note).toBeVisible()
  await expect(note).toHaveValue('Trzy rundy na worku.')
  await page.getByRole('button', { name: 'Zapisz oceny', exact: true }).click()
  await expect(page).toHaveURL('/progress?tab=history')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Szybki stoper', exact: true }) })
  await card.getByRole('button', { name: /Szczegóły wpisu/ }).first().click()
  await expect(card).toContainText('3/3 rund')
  await expect(card).not.toContainText('ćwiczeń')
  await expect(card.getByRole('link', { name: 'Podsumowanie', exact: true })).toBeVisible()
  await expect.poll(async () => (await app.readSessions())[0]?.note).toBe('Trzy rundy na worku.')
  expect((await app.readSessions())[0].rpe).toBe(6)
  await nav.getByRole('button', { name: 'Trening', exact: true }).click()
  await dialog.getByRole('link', { name: /Szybki stoper/ }).click()
  await expect(page.getByRole('button', { name: '3 × 2:00 przerwa 1:00', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('summarizes sparring in both themes and saves changed category and discipline together', async ({ app, page }, info) => {
  await app.open()
  const plan = quickTimerPlan({ category: 'sparring' })
  const startedAt = '2026-11-02T10:00:00.000Z'
  const recording = { ...quickTimerRecording(plan), startedAt }
  const previous = buildRecordedWorkoutSession(plan, createWorkoutPlaybackTimeline(plan).steps, recording, Date.parse(startedAt) + 660_000, false, 'quickTimer')
  if (previous.kind !== 'save') throw new Error('Expected a previous quick timer entry')
  await app.seedSession({ ...previous.session, rpe: 6, rpeRecordedAt: '2026-11-02T10:21:00.000Z' })
  await app.open(`/workout-sessions/${previous.session.id}/feedback`)
  await expect(page.getByRole('button', { name: 'Sparing', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await app.open('/quick-timer')
  await settings(page)
  await openPlayer(page)
  await expect(page.getByText('Sparing · Boks', { exact: true })).toBeVisible()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(480_000)
  await app.expectWorkoutSaved()
  const sessionId = new URL(page.url()).pathname.split('/')[2]
  const readCurrentSession = async () => (await app.readSessions()).find((session) => session.id === sessionId)
  await expect(page.getByText('Ustawione jak ostatnio – zmień, jeśli trzeba', { exact: true })).toBeVisible()
  const discipline = page.getByRole('radiogroup', { name: 'Dyscyplina', exact: true })
  const boxing = discipline.getByRole('radio', { name: 'Boks', exact: true })
  const muayThai = discipline.getByRole('radio', { name: 'Muay Thai', exact: true })
  await expect(boxing).toBeChecked()
  await expect(page.getByRole('group', { name: /Intensywność sparingu/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Elementy do poprawy', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: /^Techniczny —/ }).click()
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    if (info.project.name === 'phone') {
      for (const width of [360, 390]) {
        await page.setViewportSize({ width, height: 800 })
        await expect(discipline.getByRole('radio')).toHaveCount(5)
        await expect(discipline).toHaveCSS('grid-template-columns', /^[\d.]+px$/)
        await expect(boxing.locator('..').locator('.choice-face')).toHaveCSS('height', '52px')
        const [metrics, category, picker, intensity, rpe, note] = await Promise.all([
          page.locator('dl.quick-timer-metrics').boundingBox(),
          page.getByRole('group', { name: 'Rodzaj treningu', exact: true }).boundingBox(),
          discipline.boundingBox(),
          page.getByRole('group', { name: /Intensywność sparingu/ }).boundingBox(),
          page.getByRole('region', { name: 'RPE · zmęczenie całym treningiem', exact: true }).boundingBox(),
          page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true }).boundingBox(),
        ])
        if (!metrics || !category || !picker || !intensity || !rpe || !note) throw new Error('Expected visible quick timer summary sections')
        expect(metrics.y + metrics.height).toBeLessThan(category.y)
        expect(category.y + category.height).toBeLessThan(picker.y)
        expect(picker.y + picker.height).toBeLessThan(intensity.y)
        expect(intensity.y + intensity.height).toBeLessThan(rpe.y)
        expect(rpe.y + rpe.height).toBeLessThan(note.y)
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      }
      await page.setViewportSize({ width: 360, height: 800 })
    }
    await page.evaluate(() => scrollTo(0, 0))
    await page.getByRole('group', { name: /Intensywność sparingu/ }).scrollIntoViewIfNeeded()
    await capture(page, info, `sparring-summary-${theme}-360x800`)
    const violations = (await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))
    expect(violations).toEqual([])
  }
  await page.getByRole('button', { name: 'Zapisz oceny', exact: true }).click()
  await expect.poll(async () => (await readCurrentSession())?.sparring[0]?.intensity).toBe('technical')
  await page.getByRole('article').getByRole('button', { name: /Szczegóły wpisu/ }).first().click()
  await page.getByRole('link', { name: 'Podsumowanie', exact: true }).click()
  await expect(boxing).toBeChecked()
  await page.getByRole('button', { name: 'Tarcze', exact: true }).click()
  await muayThai.check()
  await expect(page.getByRole('group', { name: /Intensywność sparingu/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Zapisz oceny', exact: true }).click()
  await expect(page).toHaveURL('/progress?tab=history')
  await expect.poll(readCurrentSession).toMatchObject({ category: 'pads', disciplineKey: 'muay_thai' })
  const entry = await readCurrentSession()
  if (entry?.source !== 'quickTimer') throw new Error('Expected quick timer')
  expect(entry.sparring).toEqual([])
  expect(entry.sparringSeconds).toBe(0)
  expect(entry.stepResults.every((step) => step.blockType === 'pads' && step.nameSnapshot === 'Tarcze')).toBe(true)
  await app.open(`/workout-sessions/${sessionId}/feedback`)
  await expect(muayThai).toBeChecked()
  await expect(page.getByRole('button', { name: 'Tarcze', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await test.step('uses the latest Muay Thai entry despite an old boxing draft', async () => {
    const storageKey = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((name) => name.startsWith('combat-training.quickTimer.'))
      const savedDraft = key ? localStorage.getItem(key) : null
      if (!key || !savedDraft) throw new Error('Expected a saved quick timer draft')
      localStorage.setItem(key, JSON.stringify({ ...JSON.parse(savedDraft), disciplineKey: 'boxing' }))
      return key
    })
    await app.open('/quick-timer')
    await expect(page.getByRole('button', { name: '3 × 2:00 przerwa 1:00', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await openPlayer(page)
    await expect(page.getByText('Tarcze · Muay Thai', { exact: true })).toBeVisible()
    const savedDraft = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), storageKey)
    expect(savedDraft).not.toHaveProperty('disciplineKey')
  })
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
    await expect(nav.getByRole('link')).toHaveText(['Start', 'Plan', 'Postęp', 'Profil'])
    const trigger = nav.getByRole('button', { name: 'Trening', exact: true })
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
  await page.getByRole('button', { name: 'Zmniejsz: Liczba rund', exact: true }).click()
  await page.getByRole('button', { name: 'Zmniejsz: Czas pracy', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Własny ustawiasz sam', exact: true })).toHaveAttribute('aria-pressed', 'true')
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
      await page.getByRole('button', { name: 'Zapisz oceny', exact: true }).click()
      await expect(page).toHaveURL('/progress?tab=history')
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
