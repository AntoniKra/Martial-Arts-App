import AxeBuilder from '@axe-core/playwright'
import type { Page, TestInfo } from '@playwright/test'
import type { FocusSkill } from '../src/domain/focus-skill/focusSkill.types'
import type { QuickTimerWorkoutSession } from '../src/domain/workout-session/workoutSession.types'
import { manualFocusRating, manualWorkoutSession } from '../src/test/manualWorkoutBuilder'
import { block, continuousExercise, workoutPlan } from '../src/test/workoutBuilders'
import { sessionStep, workoutSession } from '../src/test/workoutSessionBuilders'
import { test, expect } from './fixtures'

const BLOCKING_IMPACTS: readonly string[] = ['critical', 'serious', 'moderate']
const instant = '2026-11-12T12:00:00.000Z'
const weekStart = '2026-11-09'
const skill: FocusSkill = {
  id: 'guard', name: 'Powrót do gardy', criterion: 'Ręka wraca do brody.',
  openCorrection: null, archivedAt: null, createdAt: instant, updatedAt: instant,
}
const plan = {
  ...workoutPlan([block('bag', [
    { ...continuousExercise('focus', 60), focusSkillId: skill.id },
    { ...continuousExercise('other', 60), exerciseNameSnapshot: 'Praca na nogach' },
  ], 'bag')]),
  nameSnapshot: 'Plan dostępności',
}
const current = workoutSession({
  id: 'current', workoutPlanId: plan.id, workoutPlanNameSnapshot: plan.nameSnapshot,
  workoutDate: '2026-11-12', startedAt: '2026-11-12T10:00:00.000Z', completedAt: '2026-11-12T10:02:00.000Z',
  stepResults: [
    sessionStep({ playbackStepId: 'focus', workoutItemId: 'focus', blockId: 'bag', blockType: 'bag' }),
    sessionStep({ playbackStepId: 'other', workoutItemId: 'other', blockId: 'bag', blockType: 'bag', nameSnapshot: 'Praca na nogach' }),
  ],
  focusRatings: [{ workoutItemId: 'focus', focusSkillId: skill.id, skillNameSnapshot: skill.name,
    criterionSnapshot: skill.criterion, blockType: 'bag', assessment: 4, correction: null, previousCorrectionCheck: null }],
  rpe: null, rpeRecordedAt: null,
})
const previous = { ...current, id: 'previous', workoutDate: '2026-11-05',
  startedAt: '2026-11-05T10:00:00.000Z', completedAt: '2026-11-05T10:02:00.000Z',
  rpe: 5, rpeRecordedAt: instant }
const quick: QuickTimerWorkoutSession = {
  id: 'quick', source: 'quickTimer', status: 'completed', disciplineKey: 'boxing', category: 'sparring',
  workoutDate: current.workoutDate, timezone: current.timezone, startedAt: current.startedAt, completedAt: current.completedAt,
  createdAt: instant, updatedAt: instant, durationSeconds: 120, workSeconds: 120, sparringSeconds: 120,
  completion: { completed: 2, planned: 2, unit: 'round' },
  stepResults: [sessionStep({ blockType: 'sparring', roundNumber: 1, roundCount: 2 })],
  sparring: [{ blockId: null, intensity: 'technical', rounds: 2 }], note: 'Dwie rundy sparingu.', rpe: null, rpeRecordedAt: null,
}
const manual = manualWorkoutSession({
  focusRatings: [manualFocusRating({ skillNameSnapshot: skill.name, criterionSnapshot: skill.criterion })],
  note: 'Trening poza aplikacją.',
})

async function audit(page: Page, info: TestInfo, screen: string, theme: 'dark' | 'light') {
  await test.step(`axe: ${screen}`, async () => {
    await page.evaluate(() => document.fonts.ready)
    const { violations } = await new AxeBuilder({ page }).analyze()
    await info.attach(`axe-${screen}-${theme}`, {
      body: JSON.stringify({ project: info.project.name, screen, theme, violations }, null, 2),
      contentType: 'application/json',
    })
    const blocking = violations.filter(({ impact }) => impact && BLOCKING_IMPACTS.includes(impact))
    expect.soft(blocking.map(({ id, impact, nodes }) => ({
      id, impact, elements: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })), `${screen} (${theme})`).toEqual([])
  })
}

test.use({ screenshot: 'off', trace: 'off', video: 'off' })
test.beforeEach(async ({ page }, info) => {
  test.skip(!['phone', 'desktop'].includes(info.project.name), 'Additional axe coverage runs only on phone and desktop.')
  await page.clock.setFixedTime(new Date(instant))
})

for (const theme of ['dark', 'light'] as const) {
  test(`audits populated progress, week plan and focus skill in ${theme}`, async ({ app, page }, info) => {
    await app.open('/workouts')
    await app.seedFocusSkill(skill)
    await app.seedPlan(plan)
    for (const entry of [current, previous, manual, quick,
      { ...previous, id: 'older', workoutDate: '2026-10-19' },
      { ...previous, id: 'middle', workoutDate: '2026-10-26' },
    ]) await app.seedSession(entry)
    await app.seedWeekPlan({ weekStart, items: [
      { id: 'planned', kind: 'plan', workoutPlanId: plan.id, planNameSnapshot: plan.nameSnapshot },
      { id: 'sparring', kind: 'category', category: 'sparring' },
    ], createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false })
    await app.open('/progress')
    await app.setTheme(theme)
    await expect(page.getByRole('link', { name: /Powrót do gardy/ })).toBeVisible()
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
    await audit(page, info, 'progress', theme)

    await page.getByRole('link', { name: 'Szczegóły planu tygodnia', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Podsumowanie treningów', exact: true })).toContainText('Treningi: 3')
    const chart = page.getByRole('region', { name: 'Ostatnie 12 tygodni', exact: true })
    await expect(chart.getByRole('img')).toBeVisible()
    await chart.getByText('Pokaż dane', { exact: true }).click()
    await expect(chart.getByRole('row')).toHaveCount(13)
    await expect(page.getByRole('table', { name: 'Na tle 3 poprzednich tygodni', exact: true })).toBeVisible()
    await page.getByText('Szczegóły obciążenia', { exact: true }).click()
    await expect(page.getByRole('list', { name: 'Pozycje planu tygodnia', exact: true }).getByRole('listitem')).toHaveCount(2)
    await audit(page, info, 'week-plan', theme)
    await chart.getByRole('button', { name: 'Minuty', exact: true }).click()
    await expect(chart.getByRole('img')).toHaveAccessibleName(/12 tygodni. Minuty/)
    await page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true }).click()
    await expect(page.getByRole('form', { name: 'Edytuj plan tygodnia', exact: true })).toBeVisible()
    await audit(page, info, 'week-plan-editor', theme)

    // Coincident ratings must keep their spacing, producing real horizontal overflow.
    // This makes the keyboard-accessibility regression deterministic after resizing settles.
    for (let index = 0; index < 24; index += 1) {
      await app.seedSession({ ...manual, id: `coincident-${index}` })
    }
    await app.open(`/progress/focus-skills/${skill.id}`)
    await expect(page.getByRole('region', { name: 'Wszystkie oceny', exact: true }).getByRole('link')).toHaveCount(29)
    await expect(page.getByRole('region', { name: 'Oceny według daty treningu', exact: true }).locator('svg').first()).toBeVisible()
    const scroller = page.getByRole('group', { name: 'Oceny według daty treningu', exact: true })
    if (info.project.name === 'phone') {
      await expect.poll(() => scroller.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
      await scroller.focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')
      await expect(scroller).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
    }
    await audit(page, info, 'focus-skill-progress', theme)
  })

  test(`audits plan feedback with ratings, RPE and previous run in ${theme}`, async ({ app, page }, info) => {
    await app.open('/workouts')
    await app.seedFocusSkill(skill)
    await app.seedPlan(plan)
    await app.seedSession(previous)
    await app.seedSession(current)
    await app.open(`/workout-sessions/${current.id}/feedback`)
    await app.setTheme(theme)
    await expect(page.getByRole('heading', { name: /Poprzednio ten plan/ })).toBeVisible()
    await expect(page.getByRole('article', { name: skill.name, exact: true }).getByRole('radio', { name: /^4 / })).toBeChecked()
    await page.getByText('Oceń pozostałe ćwiczenia · 1, opcjonalnie', { exact: true }).click()
    await expect(page.getByRole('article', { name: 'Praca na nogach', exact: true })).toBeVisible()
    await audit(page, info, 'plan-feedback', theme)
    await page.getByRole('button', { name: 'Oceń teraz', exact: true }).click()
    await expect(page.getByRole('radiogroup', { name: 'RPE od 0 do 10', exact: true })).toBeVisible()
    await audit(page, info, 'plan-feedback-rpe', theme)
  })

  test(`audits quick timer feedback and RPE in ${theme}`, async ({ app, page }, info) => {
    await app.open('/workouts')
    await app.seedSession(quick)
    await app.open(`/workout-sessions/${quick.id}/feedback`)
    await app.setTheme(theme)
    await expect(page.getByRole('heading', { name: 'Szybki stoper', exact: true })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true })).toHaveValue('Dwie rundy sparingu.')
    await audit(page, info, 'quick-timer-feedback', theme)
    await page.getByRole('button', { name: 'Oceń teraz', exact: true }).click()
    await expect(page.getByRole('radiogroup', { name: 'RPE od 0 do 10', exact: true })).toBeVisible()
    await audit(page, info, 'quick-timer-feedback-rpe', theme)
  })

  test(`audits manual entry, populated history and entry details in ${theme}`, async ({ app, page }, info) => {
    await app.open('/workouts')
    await app.seedFocusSkill(skill)
    for (const entry of [manual, current, quick]) await app.seedSession(entry)
    await app.open('/workout-sessions/new')
    await app.setTheme(theme)
    const form = page.getByRole('form', { name: 'Trening spoza aplikacji', exact: true })
    await form.getByRole('radio', { name: 'Boks', exact: true }).check()
    await form.getByRole('radio', { name: /^Sparing/ }).check()
    await form.getByRole('checkbox', { name: skill.name, exact: true }).check()
    await expect(form.getByRole('article', { name: skill.name, exact: true })).toBeVisible()
    await audit(page, info, 'manual-entry', theme)
    // The form is intentionally dirty; discard through its normal navigation guard.
    await form.getByRole('button', { name: 'Anuluj', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Odrzuć zmiany', exact: true }).click()
    await app.open('/workouts?tab=history')
    const history = page.getByRole('region', { name: 'Historia treningów', exact: true })
    await expect(history.getByRole('article')).toHaveCount(3)
    await audit(page, info, 'history', theme)
    await history.getByRole('article').filter({ hasText: 'Trening poza aplikacją' }).getByRole('link', { name: 'Popraw', exact: true }).click()
    await expect(form.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true })).toHaveValue('Trening poza aplikacją.')
    await audit(page, info, 'manual-entry-details', theme)
  })

  test(`audits profile without consent, consent, weight chart and deletion screen in ${theme}`, async ({ app, page }, info) => {
    await app.open('/profile')
    await app.seedSession(current)
    await app.setTheme(theme)
    await expect(page.getByRole('region', { name: 'Statystyki', exact: true }).getByRole('definition').first()).toHaveText('1')
    await expect(page.getByRole('link', { name: 'Włącz zapisywanie masy ciała', exact: true })).toBeVisible()
    await audit(page, info, 'profile-without-consent', theme)
    await page.getByRole('link', { name: 'Włącz zapisywanie masy ciała', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Włącz', exact: true })).toBeDisabled()
    await audit(page, info, 'profile-consent', theme)
    await page.getByRole('checkbox', { name: 'Mam ukończone 18 lat.', exact: true }).check()
    await page.getByRole('checkbox', { name: 'Zgadzam się na zapisywanie mojej masy ciała i kategorii wagowej na moim koncie.', exact: true }).check()
    await page.getByRole('button', { name: 'Włącz', exact: true }).click()
    await expect(page).toHaveURL('/profile')
    for (const [date, weightKg] of [['2026-11-10', 76.2], ['2026-11-11', 76.4], ['2026-11-12', 76.3]] as const) {
      await app.seedBodyWeight({ date, weightKg, createdAt: instant, updatedAt: instant })
    }
    await expect(page.getByRole('region', { name: 'Lista pomiarów', exact: true }).getByRole('listitem')).toHaveCount(3)
    await expect(page.getByRole('region', { name: 'Masa ciała', exact: true }).getByRole('img')).toBeVisible()
    await page.getByText('Pokaż dane', { exact: true }).click()
    await expect(page.getByRole('table')).toBeVisible()
    await audit(page, info, 'profile-with-consent', theme)
    await page.getByRole('link', { name: 'Usuń konto', exact: true }).click()
    await expect(page.getByLabel('Hasło', { exact: true })).toBeVisible()
    await audit(page, info, 'delete-account', theme)
  })

  test(`audits the discard changes dialog in ${theme}`, async ({ app, page }, info) => {
    await app.open('/workouts/new')
    await app.setTheme(theme)
    await page.getByRole('textbox', { name: 'Nazwa planu' }).fill('Niezapisany plan')
    await page.getByRole('link', { name: 'Wróć do treningów', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Odrzucić zmiany?', exact: true })
    await expect(dialog.getByRole('button', { name: 'Wróć do edycji', exact: true })).toBeFocused()
    await audit(page, info, 'discard-changes-dialog', theme)
    await dialog.getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
  })

  test(`audits the pending-write sign-out warning in ${theme}`, async ({ app, page, context }, info) => {
    await app.open('/workouts')
    await app.seedFocusSkill(skill)
    await app.seedPlan(plan)
    await app.open(`/workouts/${plan.id}`)
    await page.getByRole('link', { name: 'Edytuj plan', exact: true }).click()
    await app.setTheme(theme)
    await page.getByRole('textbox', { name: 'Nazwa planu' }).fill('Plan zmieniony offline')
    await context.setOffline(true)
    try {
      await page.getByRole('button', { name: 'Zapisz zmiany', exact: true }).click()
      await expect(page).toHaveURL(`/workouts/${plan.id}`)
      await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Wylogować się?', exact: true })
      await expect(dialog).toHaveAccessibleDescription('Masz dane, które nie zostały jeszcze wysłane. Po wylogowaniu przepadną.')
      await expect(dialog.getByRole('button', { name: 'Anuluj', exact: true })).toBeFocused()
      await audit(page, info, 'sign-out-warning', theme)
      await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click()
    } finally {
      await context.setOffline(false)
    }
  })
}
