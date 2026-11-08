import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import { test, expect } from './fixtures'
import { block, continuousExercise, workoutPlan } from '../src/test/workoutBuilders'
import type { FocusSkill } from '../src/domain/focus-skill/focusSkill.types'

const instant = '2026-11-01T10:00:00.000Z'
const skills: FocusSkill[] = [
  { id: 'guard', name: 'Lewy prosty, powrót do gardy', criterion: 'Ręka wraca do brody przed następnym ciosem.', openCorrection: null, archivedAt: null, createdAt: instant, updatedAt: instant },
  { id: 'counter', name: 'Kontra po uniku', criterion: 'Po uniku wyprowadzam kontrę z miejsca.', openCorrection: null, archivedAt: null, createdAt: instant, updatedAt: instant },
]
const plan = { ...workoutPlan([
  block('bag', [{ ...continuousExercise('first', 60), focusSkillId: 'guard' }], 'bag'),
  block('pads', [{ ...continuousExercise('second', 60), focusSkillId: 'counter' }, { ...continuousExercise('other', 60), exerciseNameSnapshot: 'Praca na nogach' }], 'pads'),
]), nameSnapshot: 'Technika i kontrola gardy' }
const card = (page: Page, name = skills[0].name) => page.getByRole('article', { name, exact: true })

async function assess(page: Page, name: string, value: number) {
  await card(page, name).getByRole('radio', { name: new RegExp(`^${value} `) }).check()
}
async function accessibility(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}
async function capture(page: Page, info: TestInfo, name: string, scrolled = false) {
  if (info.project.name !== 'phone') return
  const folder = path.resolve('docs/screenshots/issue-69')
  await mkdir(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  const positions = scrolled ? await page.evaluate(() => {
    const bottom = Math.max(0, document.documentElement.scrollHeight - innerHeight)
    const offsets = []
    for (let offset = 0; offset < bottom; offset += innerHeight - 100) offsets.push(offset)
    return [...offsets, bottom]
  }) : [0]
  for (const [index, y] of positions.entries()) {
    await page.evaluate((offset) => scrollTo(0, offset), y)
    const file = path.join(folder, `${name}-${String(index + 1).padStart(2, '0')}-360x800.png`)
    await page.screenshot({ path: file })
    await info.attach(`${name}-${index + 1}`, { path: file, contentType: 'image/png' })
  }
  await page.evaluate(() => scrollTo(0, 0))
}

test('persists R1 and R2, shows the previous correction in the next workout, and closes it with better', async ({ app, page }, info) => {
  await app.open('/workouts')
  for (const skill of skills) await app.seedFocusSkill(skill)
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(180_000)
  await app.expectWorkoutSaved()
  await expect(page.getByText('oceniono 0 z 2', { exact: true })).toBeVisible()
  expect(await app.readSessions()).toMatchObject([{ source: 'plan', focusRatings: [
    { skillNameSnapshot: skills[0].name, criterionSnapshot: skills[0].criterion, blockType: 'bag', assessment: null },
    { skillNameSnapshot: skills[1].name, blockType: 'pads', assessment: null },
  ] }])
  await assess(page, skills[0].name, 3)
  await card(page, skills[1].name).getByRole('radio', { name: 'Nie umiem ocenić', exact: true }).check()
  await card(page).getByRole('button', { name: 'Nowa notatka: problem i poprawka', exact: true }).click()
  await card(page).getByRole('textbox', { name: 'Problem', exact: true }).fill('Opuszczam prawą rękę po ciosie.')
  await card(page).getByRole('button', { name: 'Nowa notatka: problem i poprawka', exact: true }).click()
  // Incomplete corrections are validated without submitting a partial batch.
  await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
  await expect(card(page).getByRole('alert')).toHaveText('Problem i poprawka muszą mieć po 1–200 znaków.')
  await card(page).getByRole('textbox', { name: 'Poprawka', exact: true }).fill('Dotykam rękawicą policzka.')
  await page.getByText('Oceń pozostałe ćwiczenia · 1, opcjonalnie', { exact: true }).click()
  await page.getByRole('article', { name: 'Praca na nogach', exact: true }).getByRole('radio', { name: /^4 / }).check()
  await page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true }).fill('Pilnuj powrotu do gardy.')
  const firstSummary = new URL(page.url()).pathname
  await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
  await expect(page).toHaveURL(/\/workouts\?tab=history$/)
  await expect.poll(async () => (await app.readSessions())[0]?.note).toBe('Pilnuj powrotu do gardy.')
  await app.open(firstSummary)
  await expect(card(page).getByRole('radio', { name: /^3 / })).toBeChecked()
  await expect(card(page).getByRole('textbox', { name: 'Problem', exact: true })).toHaveValue('Opuszczam prawą rękę po ciosie.')
  await expect(page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true })).toHaveValue('Pilnuj powrotu do gardy.')
  await page.getByText('Oceń pozostałe ćwiczenia · 1, opcjonalnie', { exact: true }).click()
  await expect(page.getByRole('article', { name: 'Praca na nogach', exact: true }).getByRole('radio', { name: /^4 / })).toBeChecked()
  await expect(page.getByText('Jak było dziś?', { exact: true })).toHaveCount(0)

  await app.open(`/workouts/${plan.id}`)
  await expect(page.getByRole('complementary').getByText('Problem: Opuszczam prawą rękę po ciosie.', { exact: true })).toBeVisible()
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await accessibility(page)
    await capture(page, info, `plan-note-${theme}`)
  }
  await app.openPlayer()
  await app.startWorkout()
  await page.clock.fastForward(180_000)
  await app.expectWorkoutSaved()
  await expect(card(page).getByText('Jak było dziś?', { exact: true })).toBeVisible()
  await card(page).getByRole('radio', { name: 'Lepiej', exact: true }).check()
  await assess(page, skills[0].name, 4)
  await assess(page, skills[1].name, 3)
  await card(page).getByRole('button', { name: 'Nowa notatka: problem i poprawka', exact: true }).click()
  await page.getByText('Oceń pozostałe ćwiczenia · 1, opcjonalnie', { exact: true }).click()
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    await accessibility(page)
    await capture(page, info, `summary-${theme}`, true)
  }
  await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
  await expect.poll(async () => (await app.readFocusSkills()).find((skill) => skill.id === 'guard')?.openCorrection).toBeNull()
  const history = await app.openHistory()
  await expect(history.getByRole('link', { name: 'Podsumowanie', exact: true })).toHaveCount(2)
  await app.open(`/workouts/${plan.id}`)
  await expect(page.getByText(/Na dziś · z treningu/)).toHaveCount(0)
})

test('opens a partial summary, keeps a skipped focus unassessed, and saves a note without ratings offline', async ({ app, page, context }) => {
  await app.open('/workouts')
  for (const skill of skills) await app.seedFocusSkill(skill)
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(60_000)
  await page.getByRole('button', { name: 'Menu treningu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Zakończ trening', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Zakończ wcześniej', exact: true }).click()
  await app.expectWorkoutSaved()
  await expect(page.getByText('Trening częściowy', { exact: true })).toBeVisible()
  await expect(card(page, skills[1].name).getByText('Pominięte — bez oceny', { exact: true })).toBeVisible()
  await expect(card(page, skills[1].name).getByRole('radio')).toHaveCount(0)
  const summaryPath = new URL(page.url()).pathname
  await context.setOffline(true)
  await page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true }).fill('Notatka bez ocen, bez sieci.')
  await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
  await expect(page).toHaveURL(/\/workouts\?tab=history$/)
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Podsumowanie', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${summaryPath}$`))
  await expect(page.getByRole('textbox', { name: 'Notatka do treningu · opcjonalnie', exact: true })).toHaveValue('Notatka bez ocen, bez sieci.')
  await context.setOffline(false)
  await expect.poll(async () => (await app.readSessions())[0]?.note).toBe('Notatka bez ocen, bez sieci.')
  const sessions = await app.readSessions()
  expect(sessions).toMatchObject([{ status: 'partial', focusRatings: [{ assessment: null }, { assessment: null }] }])
})

test('retains training-time focus snapshots across a reload and library edits during the workout', async ({ app, page }) => {
  await app.open('/workouts')
  for (const skill of skills) await app.seedFocusSkill(skill)
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(30_000)
  await app.seedFocusSkill({ ...skills[0], name: 'Zmieniona nazwa', criterion: 'Zmienione kryterium' })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Pauza', exact: true })).toBeVisible()
  await page.clock.fastForward(150_000)
  await app.expectWorkoutSaved()
  await expect(card(page).getByText(skills[0].criterion, { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Zmieniona nazwa', exact: true })).toHaveCount(0)
  expect((await app.readSessions())[0]).toMatchObject({ source: 'plan', focusRatings: [
    { skillNameSnapshot: skills[0].name, criterionSnapshot: skills[0].criterion },
    { skillNameSnapshot: skills[1].name, criterionSnapshot: skills[1].criterion },
  ] })
})

test('queues ratings and a new correction together offline and sends both after reconnection', async ({ app, page, context }) => {
  await app.open('/workouts')
  for (const skill of skills) await app.seedFocusSkill(skill)
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.clock.fastForward(180_000)
  await app.expectWorkoutSaved()
  await assess(page, skills[0].name, 2)
  await card(page).getByRole('button', { name: 'Nowa notatka: problem i poprawka', exact: true }).click()
  await card(page).getByRole('textbox', { name: 'Problem', exact: true }).fill('Garda opada.')
  await card(page).getByRole('textbox', { name: 'Poprawka', exact: true }).fill('Ręka do brody.')
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Gotowe', exact: true }).click()
  await expect(page).toHaveURL(/\/workouts\?tab=history$/)
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
  expect((await app.readFocusSkills()).find((skill) => skill.id === 'guard')?.openCorrection).toBeNull()
  await page.getByRole('link', { name: 'Podsumowanie', exact: true }).click()
  await expect(card(page).getByRole('radio', { name: /^2 / })).toBeChecked()
  await context.setOffline(false)
  await expect.poll(async () => (await app.readFocusSkills()).find((skill) => skill.id === 'guard')?.openCorrection?.problem).toBe('Garda opada.')
  expect((await app.readSessions())[0]).toMatchObject({ source: 'plan', focusRatings: [
    { assessment: 2, correction: { problem: 'Garda opada.', fix: 'Ręka do brody.' } }, { assessment: null, correction: null },
  ] })
})
