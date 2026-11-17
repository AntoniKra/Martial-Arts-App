import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import { sessionStep, workoutSession } from '../src/test/workoutSessionBuilders'
import type { FocusSkill } from '../src/domain/focus-skill/focusSkill.types'
import { selectRpe } from './rpeSlider'

test.use({ screenshot: 'off', trace: 'off', video: 'off' })
const instant = '2026-11-01T10:00:00.000Z'
const skill: FocusSkill = { id: 'guard', name: 'Powrót do gardy', criterion: 'Ręce wracają do policzków.',
  openCorrection: { problem: 'Opuszczam rękę.', fix: 'Dotykam policzka.', sessionId: 'old', workoutDate: '2026-11-01' },
  archivedAt: null, createdAt: instant, updatedAt: instant }
const focus = { workoutItemId: 'focus', focusSkillId: skill.id, skillNameSnapshot: skill.name, criterionSnapshot: skill.criterion,
  blockType: 'pads' as const, assessment: null, correction: null, previousCorrectionCheck: null }
const current = workoutSession({ id: 'clarity', status: 'partial', rpe: 5, rpeRecordedAt: instant,
  stepResults: [sessionStep({ workoutItemId: 'focus', blockType: 'pads' }),
    sessionStep({ playbackStepId: 'skip', workoutItemId: 'skip', outcome: 'skipped', performedDurationSeconds: 0 }),
    sessionStep({ playbackStepId: 'other', workoutItemId: 'other', nameSnapshot: 'Praca na nogach' })],
  focusRatings: [focus, { ...focus, workoutItemId: 'skip', focusSkillId: 'skip-skill', skillNameSnapshot: 'Niski kop' }],
})
const previous = { ...current, id: 'old', workoutDate: '2026-11-01', startedAt: instant, completedAt: instant,
  focusRatings: [{ ...focus, assessment: 5 as const }] }

for (const theme of ['dark', 'light'] as const) {
  test(`chooses feedback tiles with keyboard, explains skipped work and saves unchanged keys in ${theme}`, async ({ app, page }) => {
    await app.open('/workouts')
    await app.seedFocusSkill(skill)
    await app.seedSession(previous)
    await app.seedSession(current)
    await app.open('/workout-sessions/clarity/feedback')
    await app.setTheme(theme)
    await expect(page.getByRole('heading', { name: 'Podsumowanie', exact: true })).toBeVisible()
    const card = page.getByRole('article', { name: skill.name, exact: true })
    await expect(card.getByText('Cel', { exact: true })).toBeVisible()
    await expect(card.getByText('ostatnio', { exact: true })).toBeVisible()
    await expect(card.getByText(/Ostatnio 5\/5 · 1.11 · Tarcze/)).toBeVisible()
    const checks = card.getByRole('group', { name: 'Czy ten błąd dziś się powtarzał?', exact: true })
    const less = checks.getByRole('radio', { name: 'Rzadziej', exact: true })
    await less.check()
    expect(await less.locator('..').evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(88)
    await less.focus()
    await page.keyboard.press('ArrowRight')
    await expect(checks.getByRole('radio', { name: 'Tak samo', exact: true })).toBeChecked()
    await page.keyboard.press('ArrowRight')
    await expect(checks.getByRole('radio', { name: 'Nie sprawdzałem', exact: true })).toBeChecked()
    const rating = card.getByRole('radio', { name: /^3 / })
    await rating.check()
    await rating.focus()
    await page.keyboard.press('ArrowDown')
    await expect(card.getByRole('radio', { name: /^4 / })).toBeChecked()
    expect(await card.getByRole('radio', { name: /^4 / }).evaluate((element) => getComputedStyle(element.nextElementSibling!).outlineStyle)).toBe('solid')
    const skipped = page.getByRole('article', { name: 'Niski kop', exact: true })
    await expect(skipped.getByText('Pominięte w treningu', { exact: true })).toBeVisible()
    await expect(skipped.getByText('Ćwiczenie nie zostało wykonane, więc nie oceniasz go. Twoja średnia się nie zmienia.', { exact: true })).toBeVisible()
    await expect(skipped.getByRole('radio')).toHaveCount(0)
    const others = page.getByRole('button', { name: /^Pozostałe ćwiczenia/ })
    await expect(others).toHaveAttribute('aria-expanded', 'false')
    await others.click()
    await page.getByRole('article', { name: 'Praca na nogach', exact: true }).getByRole('radio', { name: /^4 / }).check()
    await expect(others).toContainText('oceniono 1 z 1')
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Zapisz oceny', exact: true }).click()
    await expect(page).toHaveURL('/workouts?tab=history')
    await expect.poll(async () => (await app.readSessions()).filter((entry) => entry.source === 'plan').find(({ id }) => id === current.id)?.focusRatings[0]).toMatchObject({
      assessment: 4, previousCorrectionCheck: 'notChecked', criterionSnapshot: skill.criterion,
    })
  })
}

test('saves a manual error and cue with the existing problem/fix fields', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedFocusSkill(skill)
  await app.open('/workout-sessions/new')
  await expect(page.getByRole('heading', { name: 'Trening spoza aplikacji', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Boks', exact: true }).check()
  await page.getByRole('group', { name: 'Części zajęć', exact: true }).getByRole('checkbox', { name: /^Tarcze/ }).check()
  await page.getByRole('radio', { name: '60 min', exact: true }).check()
  await selectRpe(page, 5)
  await page.getByRole('checkbox', { name: skill.name, exact: true }).check()
  const card = page.getByRole('article', { name: skill.name, exact: true })
  await card.getByRole('radio', { name: 'Tak samo', exact: true }).check()
  await card.getByRole('radio', { name: /^3 / }).check()
  await card.getByRole('button', { name: 'Dodaj notatkę: błąd i wskazówka', exact: true }).click()
  await card.getByRole('textbox', { name: 'Błąd', exact: true }).fill('Garda opada.')
  await card.getByRole('textbox', { name: 'Wskazówka', exact: true }).fill('Ręka do brody.')
  await page.getByRole('button', { name: 'Zapisz', exact: true }).click()
  await expect(page).toHaveURL('/workouts?tab=history')
  await expect.poll(async () => (await app.readSessions()).filter((entry) => entry.source === 'manual')[0]?.focusRatings[0]).toMatchObject({
    assessment: 3, previousCorrectionCheck: 'same', correction: { problem: 'Garda opada.', fix: 'Ręka do brody.' },
  })
})

test('returns to the application entry and falls back to history for a direct link', async ({ app, page }) => {
  await app.open('/workouts')
  await app.seedFocusSkill(skill)
  await app.seedSession({ ...current, focusRatings: [{ ...focus, assessment: 3 }] })
  await app.open('/workout-sessions/clarity/feedback')
  await page.getByRole('button', { name: 'Wstecz', exact: true }).click()
  await expect(page).toHaveURL('/workouts?tab=history')
  await app.open('/progress/focus-skills/guard')
  await page.locator('a[href="/workout-sessions/clarity/feedback"]').click()
  await page.getByRole('button', { name: 'Wstecz', exact: true }).click()
  await expect(page).toHaveURL('/progress/focus-skills/guard')
})
