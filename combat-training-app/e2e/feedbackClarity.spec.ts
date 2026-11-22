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

test('lays out the simplified plan summary in both themes', async ({ app, page }, info) => {
  await app.open('/workouts')
  await app.seedFocusSkill(skill)
  const completed = { ...current, id: 'completed', status: 'completed' as const }
  await app.seedSession(current)
  await app.seedSession(completed)

  for (const [session, title, theme, width] of [
    [current, 'Trening częściowy', 'dark', 360],
    [completed, 'Trening ukończony', 'light', 390],
  ] as const) {
    if (info.project.name === 'phone') await page.setViewportSize({ width, height: 800 })
    await app.open(`/workout-sessions/${session.id}/feedback`)
    await app.setTheme(theme)
    const heading = page.getByRole('heading', { name: title, exact: true, level: 1 })
    const back = page.getByRole('button', { name: 'Wstecz', exact: true })
    const saved = page.getByText('Zapisane', { exact: true })
    const planName = page.getByRole('heading', { name: session.workoutPlanNameSnapshot, exact: true, level: 2 })
    const metrics = page.getByRole('region', { name: 'Podsumowanie czasu sesji', exact: true })
    const rpe = page.getByRole('region', { name: 'RPE · zmęczenie całym treningiem', exact: true })
    const focusSection = page.getByRole('region', { name: 'Elementy do poprawy', exact: true })
    await expect(heading).toHaveCSS('font-family', /^"?Archivo Variable"?,/)
    await expect(heading).toHaveCSS('font-size', '20px')
    await expect(heading).toHaveCSS('font-weight', '600')
    await expect(heading).toHaveCSS('white-space', 'nowrap')
    await expect(heading).toHaveCSS('text-overflow', 'ellipsis')
    await expect(back).toHaveCSS('width', '44px')
    await expect(back).toHaveCSS('height', '44px')
    await expect(saved).toBeVisible()
    await page.evaluate(async () => { await document.fonts.ready })
    expect(await heading.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(await heading.evaluate((element) => element.clientWidth))
    const headingBox = (await heading.boundingBox())!
    const backBox = (await back.boundingBox())!
    const savedBox = (await saved.boundingBox())!
    const planBox = (await planName.boundingBox())!
    const metricsBox = (await metrics.boundingBox())!
    const rpeBox = (await rpe.boundingBox())!
    const focusBox = (await focusSection.boundingBox())!
    expect(headingBox.x).toBeGreaterThanOrEqual(backBox.x + backBox.width)
    expect(savedBox.x).toBeGreaterThanOrEqual(headingBox.x + headingBox.width)
    for (const box of [headingBox, savedBox]) {
      expect(box.y).toBeGreaterThanOrEqual(backBox.y)
      expect(box.y + box.height).toBeLessThanOrEqual(backBox.y + backBox.height)
    }
    expect(planBox.y - backBox.y - backBox.height).toBe(10)
    expect(metricsBox.y - planBox.y - planBox.height).toBe(16)
    expect(rpeBox.y - metricsBox.y - metricsBox.height).toBe(20)
    expect(focusBox.y - rpeBox.y - rpeBox.height).toBe(20)
    await expect(page.getByText('Zapisane w dzienniku. Oceny dopiszą się do wpisu.', { exact: true })).toHaveCount(0)
    await expect(page.getByText('RPE przypomnimy na stronie głównej, jeśli zamkniesz ekran wcześniej.', { exact: true })).toHaveCount(0)

    const others = page.getByRole('button', { name: 'Pozostałe ćwiczenia 0/1 ocenione', exact: true })
    await expect(others.getByText('0/1 ocenione', { exact: true })).toHaveCSS('border-radius', '0px')
    await expect(others.getByText('Pozostałe ćwiczenia', { exact: true })).toBeVisible()
    await expect(others.getByText(/opcjonalnie|oceniono/)).toHaveCount(0)
  }
})

for (const theme of ['dark', 'light'] as const) {
  test(`chooses feedback tiles with keyboard, explains skipped work and saves unchanged keys in ${theme}`, async ({ app, page }) => {
    await app.open('/workouts')
    await app.seedFocusSkill(skill)
    await app.seedSession(previous)
    await app.seedSession(current)
    await app.open('/workout-sessions/clarity/feedback')
    await app.setTheme(theme)
    await expect(page.getByRole('heading', { name: 'Trening częściowy', exact: true, level: 1 })).toBeVisible()
    const card = page.getByRole('article', { name: skill.name, exact: true })
    await expect(card.getByText('Cel', { exact: true })).toBeVisible()
    await expect(card.getByText('ostatnio', { exact: true })).toBeVisible()
    await expect(card.getByText(/Ostatnio 5\/5 · 1.11 · Tarcze/)).toBeVisible()
    const correction = card.getByRole('complementary', { name: 'Notatka z 1.11 · na dziś', exact: true })
    await expect(correction.locator('dt')).toHaveText(['Błąd', 'Wskazówka'])
    await expect(correction.locator('dd')).toHaveText(['Opuszczam rękę.', 'Dotykam policzka.'])
    const tiles = await correction.locator('dl > div').evaluateAll((elements) => elements.map((element) => {
      const { left, top } = element.getBoundingClientRect()
      return { left, top }
    }))
    expect(tiles[0].top).toBe(tiles[1].top)
    expect(tiles[1].left).toBeGreaterThan(tiles[0].left)
    const checks = card.getByRole('group', { name: 'Czy ten błąd dziś się powtarzał?', exact: true })
    const less = checks.getByRole('radio', { name: 'Rzadziej', exact: true })
    await less.check()
    await expect(less.locator('..')).toHaveCSS('height', '44px')
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
    const level = card.getByText('Poziom 4:', { exact: true })
    await expect(level).toHaveCSS('white-space', 'nowrap')
    await expect(level.locator('..')).toHaveText('Poziom 4: Zwykle się udaje, błąd sam łapię i poprawiam.')
    await expect(card.locator('.feedback-rating-grid')).toHaveCSS('grid-template-columns', /^(\S+\s+){4}\S+$/)
    expect(await card.getByRole('radio', { name: /^4 / }).evaluate((element) => getComputedStyle(element.nextElementSibling!).outlineStyle)).toBe('solid')
    const skipped = page.getByRole('article', { name: 'Niski kop', exact: true })
    await expect(skipped.getByText('Pominięte w treningu', { exact: true })).toBeVisible()
    await expect(skipped.getByText('Ćwiczenie nie zostało wykonane, więc nie oceniasz go. Twoja średnia się nie zmienia.', { exact: true })).toBeVisible()
    await expect(skipped.getByRole('radio')).toHaveCount(0)
    const others = page.getByRole('button', { name: /^Pozostałe ćwiczenia/ })
    await expect(others).toHaveAttribute('aria-expanded', 'false')
    await others.click()
    await page.getByRole('article', { name: 'Praca na nogach', exact: true }).getByRole('radio', { name: /^4 / }).check()
    await expect(page.getByRole('article', { name: 'Praca na nogach', exact: true }).getByText('Poziom 4: Dobrze i powtarzalnie.')).toBeVisible()
    await expect(others).toHaveAccessibleName('Pozostałe ćwiczenia 1/1 ocenione')
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Zapisz oceny', exact: true }).click()
    await expect(page).toHaveURL('/progress?tab=history')
    await expect.poll(async () => (await app.readSessions()).filter((entry) => entry.source === 'plan').find(({ id }) => id === current.id)?.focusRatings[0]).toMatchObject({
      assessment: 4, previousCorrectionCheck: 'notChecked', criterionSnapshot: skill.criterion,
    })
  })
}

test('keeps summary badges and the level prefix on one line at phone widths', async ({ app, page }, info) => {
  test.skip(info.project.name !== 'phone', 'Exercises the two summary phone widths')
  const longName = 'Lewy prosty i powrót do gardy po kombinacji na tarczach'
  const longProblem = 'Pod koniec długiej kombinacji opuszczam rękę i tracę pozycję do następnego ciosu. '.repeat(2).trim()
  await app.open('/workouts')
  await app.seedFocusSkill({ ...skill, openCorrection: { ...skill.openCorrection!, problem: longProblem } })
  await app.seedSession({ ...previous, focusRatings: [{ ...focus, assessment: 'unableToRate' }] })
  await app.seedSession({ ...current, focusRatings: [{ ...focus, skillNameSnapshot: longName, assessment: 4 }] })
  await app.open('/workout-sessions/clarity/feedback')
  const card = page.getByRole('article', { name: longName, exact: true })
  const previousBadge = card.getByText('Ostatnio Nie umiem ocenić · 1.11 · Tarcze', { exact: true })
  const prefix = card.getByText('Poziom 4:', { exact: true })
  await expect(card.getByText(longProblem, { exact: true })).toBeVisible()
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 800 })
    await page.evaluate(() => document.fonts.ready)
    for (const value of [previousBadge, prefix, page.getByText('Zapisane', { exact: true }), page.getByText('Zapisano', { exact: true })]) {
      await expect(value).toBeVisible()
      expect(await value.evaluate((element) => {
        const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
        const range = document.createRange()
        const rects: DOMRect[] = []
        for (let node = text.nextNode(); node; node = text.nextNode()) {
          if (!node.textContent?.trim()) continue
          range.selectNodeContents(node)
          rects.push(...range.getClientRects())
        }
        return rects.length > 0 && rects.every((rect) => rect.left >= 0 && rect.right <= innerWidth && rect.top === rects[0].top)
      })).toBe(true)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  }
})

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
  await expect(page).toHaveURL('/progress?tab=history')
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
  await expect(page).toHaveURL('/progress?tab=history')
  await app.open('/progress/focus-skills/guard')
  await page.locator('a[href="/workout-sessions/clarity/feedback"]').click()
  await page.getByRole('button', { name: 'Wstecz', exact: true }).click()
  await expect(page).toHaveURL('/progress/focus-skills/guard')
})
