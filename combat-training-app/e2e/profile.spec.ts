import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import { test, expect } from './fixtures'
import { workoutSession } from '../src/test/workoutSessionBuilders'
import type { ManualWorkoutSession, QuickTimerWorkoutSession } from '../src/domain/workout-session/workoutSession.types'

const instant = '2026-11-13T09:00:00.000Z'
const weightRegion = (page: Page) => page.getByRole('region', { name: 'Masa ciała', exact: true })
const statistics = (page: Page) => page.getByRole('region', { name: 'Statystyki', exact: true })
const history = (page: Page) => page.getByRole('region', { name: 'Lista pomiarów', exact: true })
const withdrawal = (page: Page) => page.getByRole('dialog', { name: 'Wycofać zgodę?', exact: true })
const first = workoutSession({ id: 'profile-plan', status: 'partial', workoutDate: '2026-10-17', category: 'bag', durationSeconds: 1800.25,
  sparring: [{ blockId: 'one', intensity: 'technical', rounds: 3 }] })
const manual: ManualWorkoutSession = { id: 'profile-manual', source: 'manual', status: 'completed', disciplineKey: 'boxing',
  category: 'sparring', workoutDate: '2026-11-12', timezone: 'Pacific/Honolulu', durationSeconds: 900,
  workSeconds: null, sparringSeconds: null, completion: null, note: null, rpe: 5, rpeRecordedAt: instant,
  focusRatings: [], sparring: [{ blockId: null, intensity: 'technical', rounds: null }], createdAt: instant, updatedAt: instant }
const { workoutPlanId: _planId, workoutPlanNameSnapshot: _planName, focusRatings: _focus, exerciseRatings: _exercise, ...timed } = first
const quick: QuickTimerWorkoutSession = { ...timed, id: 'profile-quick', source: 'quickTimer', workoutDate: '2026-11-13',
  durationSeconds: 1200.25, completion: { completed: 1, planned: 2, unit: 'round' },
  sparring: [{ blockId: null, intensity: null, rounds: 4 }] }
const old = { ...first, id: 'profile-old', workoutDate: '2026-10-16', durationSeconds: 600,
  sparring: [{ blockId: 'one', intensity: null, rounds: 2 }] }

async function accessible(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) =>
    impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
}

async function capture(page: Page, info: TestInfo, name: string, theme: string) {
  const captureAll = process.env.CAPTURE_PROFILE_SCREENSHOTS === '1'
  const captureStatistics = process.env.CAPTURE_PROFILE_STATISTICS_SCREENSHOTS === '1' && name === 'statistics'
  if ((!captureAll && !captureStatistics) || info.project.name !== 'phone' || info.repeatEachIndex !== 0) return
  const folder = path.resolve('docs/screenshots/issue-100')
  await mkdir(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  const file = path.join(folder, `${name}-${theme}-360x800.png`)
  await page.screenshot({ path: file })
  await info.attach(`${name}-${theme}`, { path: file, contentType: 'image/png' })
}

async function grant(page: Page) {
  await page.getByRole('link', { name: 'Włącz zapisywanie masy ciała', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Mam ukończone 18 lat.', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Zgadzam się na zapisywanie mojej masy ciała i kategorii wagowej na moim koncie.', exact: true }).check()
  await page.getByRole('button', { name: 'Włącz', exact: true }).click()
  await expect(page).toHaveURL('/profile')
  await expect(page.getByRole('button', { name: '+ Dodaj pomiar', exact: true })).toBeVisible()
}

async function addWeight(page: Page, date: string, input: string) {
  await page.getByRole('button', { name: '+ Dodaj pomiar', exact: true }).click()
  await page.getByLabel('Data pomiaru', { exact: true }).fill(date)
  await page.getByRole('textbox', { name: 'Masa ciała (kg)', exact: true }).fill(input)
  await page.getByRole('button', { name: 'Zapisz pomiar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Zapisz pomiar', exact: true })).toHaveCount(0)
}

test.use({ screenshot: 'off' })
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

for (const theme of ['dark', 'light'] as const) {
  test(`profile consent, measurements, category, statistics and withdrawal in ${theme}`, async ({ app, page }, info) => {
    await app.open()
    await app.setTheme(theme)
    const nav = page.getByRole('navigation', { name: 'Główna nawigacja' }).filter({ visible: true })
    if (info.project.name === 'phone') await expect(nav.getByRole('link')).toHaveText(['Start', 'Treningi', 'Postęp', 'Profil'])
    else await expect(nav.getByRole('link')).toHaveCount(4)
    await expect(nav.getByRole('button', { name: 'Nowy', exact: true })).toBeVisible()
    for (const link of [...await nav.getByRole('link').all(), nav.getByRole('button', { name: 'Nowy', exact: true })]) {
      const box = await link.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44); expect(box?.height).toBeGreaterThanOrEqual(44)
    }
    await nav.getByRole('link', { name: 'Profil', exact: true }).click()
    await expect(nav.getByRole('link', { name: 'Profil', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(statistics(page)).toContainText('Statystyki pojawią się po pierwszym treningu.')
    await expect(page.getByRole('textbox', { name: 'Masa ciała (kg)', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '+ Dodaj pomiar', exact: true })).toHaveCount(0)
    await accessible(page); await capture(page, info, 'profile-no-consent', theme)

    for (const entry of [first, manual, quick, old]) await app.seedSession(entry)
    await expect(statistics(page)).toContainText('co najmniej 9')
    await expect(statistics(page)).toContainText('(w 1 treningu liczba rund nieznana)')
    await expect(statistics(page)).toContainText('od 16.10.2026')
    await expect(statistics(page).getByRole('definition')).toHaveText(['4', '1 h 16 min', 'co najmniej 9(w 1 treningu liczba rund nieznana)', '51 min', '15 min'])
    await expect(statistics(page)).toContainText('17.10.2026–13.11.2026')
    await expect(statistics(page)).toContainText('Suma1 h 6 min')
    await statistics(page).evaluate((element) => element.scrollIntoView({ block: 'start' }))
    await accessible(page); await capture(page, info, 'statistics', theme)

    await page.getByRole('link', { name: 'Włącz zapisywanie masy ciała', exact: true }).click()
    const adult = page.getByRole('checkbox', { name: 'Mam ukończone 18 lat.', exact: true })
    const agree = page.getByRole('checkbox', { name: 'Zgadzam się na zapisywanie mojej masy ciała i kategorii wagowej na moim koncie.', exact: true })
    const enable = page.getByRole('button', { name: 'Włącz', exact: true })
    await expect(adult).not.toBeChecked(); await expect(agree).not.toBeChecked(); await expect(enable).toBeDisabled()
    await accessible(page); await capture(page, info, 'consent', theme)
    await adult.check(); await expect(enable).toBeDisabled()
    await adult.uncheck(); await agree.check(); await expect(enable).toBeDisabled()
    await adult.check(); await expect(enable).toBeEnabled(); await enable.click()
    await expect(page).toHaveURL('/profile')
    await expect.poll(async () => (await app.readProfile())?.healthDataConsent).toMatchObject({ adultConfirmed: true, noticeVersion: '2026-11', grantedAt: instant })

    await addWeight(page, '2026-11-11', '76,3')
    await addWeight(page, '2026-11-12', '76.5')
    await addWeight(page, '2026-11-13', '76,4')
    await expect(weightRegion(page)).toContainText('Średnia z 7 dni: 76,4 kg')
    await expect(weightRegion(page)).toContainText('3 pomiary · 7–13.11')
    await page.getByRole('button', { name: '+ Dodaj pomiar', exact: true }).click()
    await page.getByRole('textbox', { name: 'Masa ciała (kg)', exact: true }).fill('76,6')
    await expect(page.getByText('Masz już pomiar z tego dnia (76,4 kg). Zapis go zastąpi.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Zapisz pomiar', exact: true }).click()
    await expect(weightRegion(page)).toContainText('Średnia z 7 dni: 76,5 kg')
    await expect.poll(async () => (await app.readBodyWeights()).length).toBe(3)
    await expect.poll(async () => (await app.readBodyWeights()).find((entry) => entry.date === '2026-11-13')?.weightKg).toBe(76.6)
    await page.getByText('Pokaż dane', { exact: true }).click()
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(13)
    await expect(page.getByRole('table')).toContainText('Brak danych')
    await page.getByText('Pokaż dane', { exact: true }).click()
    await page.getByRole('button', { name: 'Ustaw kategorię wagową (opcjonalnie)', exact: true }).click()
    await page.getByRole('textbox', { name: 'Kategoria wagowa (opcjonalnie)', exact: true }).fill('−77 kg')
    await page.getByRole('button', { name: 'Zapisz kategorię', exact: true }).click()
    await expect(page.getByText('Kategoria: −77 kg', { exact: true })).toBeVisible()
    await expect.poll(async () => (await app.readProfile())?.weightClassLabel).toBe('−77 kg')
    await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
    await page.getByRole('heading', { name: 'Profil', exact: true }).evaluate((element) => element.scrollIntoView({ block: 'start' }))
    await accessible(page); await capture(page, info, 'profile-consented', theme)
    await page.getByRole('button', { name: 'Wycofaj zgodę', exact: true }).click()
    await expect(withdrawal(page)).toContainText('Usuniemy wszystkie pomiary (3) i kategorię. Tego nie da się cofnąć.')
    await expect(withdrawal(page).getByRole('button', { name: 'Anuluj', exact: true })).toBeFocused()
    await accessible(page); await capture(page, info, 'withdrawal', theme)
    await page.keyboard.press('Escape')
    await expect(withdrawal(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Wycofaj zgodę', exact: true })).toBeFocused()
    await page.getByRole('button', { name: 'Wycofaj zgodę', exact: true }).click()
    await withdrawal(page).getByRole('button', { name: 'Usuń i wycofaj zgodę', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Włącz zapisywanie masy ciała', exact: true })).toBeVisible()
    // The local profile snapshot updates before the atomic batch receives server acknowledgement.
    await expect.poll(() => app.readBodyWeights()).toEqual([])
    await expect.poll(() => app.readProfile()).toMatchObject({ healthDataConsent: null, weightClassLabel: null })
    await expect(statistics(page)).toContainText('co najmniej 9')
  })
}

test('keeps offline withdrawal intact and warns about pending weights and profile writes on sign out', async ({ app, page, context }) => {
  await app.open('/profile'); await grant(page)
  await addWeight(page, '2026-11-13', '76.4')
  await expect.poll(async () => (await app.readBodyWeights()).length).toBe(1)
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  const original = await app.readProfile(), weights = await app.readBodyWeights()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Wycofaj zgodę', exact: true }).click()
  await withdrawal(page).getByRole('button', { name: 'Usuń i wycofaj zgodę', exact: true }).click()
  await expect(withdrawal(page).getByRole('alert')).toHaveText('Wycofanie wymaga połączenia z internetem, żeby usunąć wszystkie pomiary.')
  expect(await app.readProfile()).toEqual(original); expect(await app.readBodyWeights()).toEqual(weights)
  await withdrawal(page).getByRole('button', { name: 'Anuluj', exact: true }).click()
  await addWeight(page, '2026-11-12', '76,3')
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  const signOut = page.getByRole('dialog', { name: 'Wylogować się?', exact: true })
  await expect(signOut).toHaveAccessibleDescription('Masz dane, które nie zostały jeszcze wysłane. Po wylogowaniu przepadną.')
  await signOut.getByRole('button', { name: 'Anuluj', exact: true }).click()
  await context.setOffline(false)
  await expect.poll(async () => (await app.readBodyWeights()).length).toBe(2)
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Ustaw kategorię wagową (opcjonalnie)', exact: true }).click()
  await page.getByRole('textbox', { name: 'Kategoria wagowa (opcjonalnie)', exact: true }).fill('−77 kg')
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Zapisz kategorię', exact: true }).click()
  await expect(page.getByText('Kategoria: −77 kg', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  await expect(signOut).toBeVisible()
  await signOut.getByRole('button', { name: 'Anuluj', exact: true }).click()
  await context.setOffline(false)
  await expect.poll(async () => (await app.readProfile())?.weightClassLabel).toBe('−77 kg')
})

test('edits and deletes a measurement, removes category, limits history to fourteen, and shows the last old measurement', async ({ app, page }) => {
  await app.open('/profile'); await grant(page)
  // External emulator seeding starts only after the new parent document is durable on the server.
  await expect.poll(async () => (await app.readProfile())?.healthDataConsent).toMatchObject({ adultConfirmed: true, noticeVersion: '2026-11' })
  for (let day = 1; day <= 15; day++) await app.seedBodyWeight({ date: `2026-10-${String(day).padStart(2, '0')}`,
    weightKg: 77.1, createdAt: instant, updatedAt: instant })
  await expect(weightRegion(page)).toContainText('Brak pomiarów z ostatnich 7 dni.')
  await expect(weightRegion(page)).toContainText('Ostatni pomiar: 77,1 kg (15.10)')
  await expect(history(page).getByRole('listitem')).toHaveCount(14)
  await page.getByRole('button', { name: 'Pokaż wszystkie', exact: true }).click()
  await expect(history(page).getByRole('listitem')).toHaveCount(15)
  await page.getByRole('button', { name: 'Popraw pomiar 15.10.2026', exact: true }).click()
  await expect(page.getByLabel('Data pomiaru', { exact: true })).toBeDisabled()
  await page.getByRole('textbox', { name: 'Masa ciała (kg)', exact: true }).fill('78,24')
  await page.getByRole('button', { name: 'Zapisz pomiar', exact: true }).click()
  await expect(history(page).getByRole('listitem').first()).toContainText('78,2 kg')
  await page.getByRole('button', { name: 'Usuń pomiar 15.10.2026', exact: true }).click()
  await page.getByRole('dialog', { name: 'Usunąć pomiar?', exact: true }).getByRole('button', { name: 'Anuluj', exact: true }).click()
  await expect(history(page).getByRole('listitem')).toHaveCount(15)
  await page.getByRole('button', { name: 'Usuń pomiar 15.10.2026', exact: true }).click()
  await page.getByRole('dialog', { name: 'Usunąć pomiar?', exact: true }).getByRole('button', { name: 'Usuń pomiar', exact: true }).click()
  await expect(history(page).getByRole('listitem')).toHaveCount(14)
  await page.getByRole('button', { name: 'Ustaw kategorię wagową (opcjonalnie)', exact: true }).click()
  await page.getByRole('textbox', { name: 'Kategoria wagowa (opcjonalnie)', exact: true }).fill('−77 kg')
  await page.getByRole('button', { name: 'Zapisz kategorię', exact: true }).click()
  await page.getByRole('button', { name: 'Zmień', exact: true }).click()
  await page.getByRole('textbox', { name: 'Kategoria wagowa (opcjonalnie)', exact: true }).fill('')
  await page.getByRole('button', { name: 'Zapisz kategorię', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ustaw kategorię wagową (opcjonalnie)', exact: true })).toBeVisible()
  await expect.poll(async () => (await app.readProfile())?.weightClassLabel).toBeNull()
})
