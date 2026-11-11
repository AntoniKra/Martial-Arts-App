import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Page, TestInfo } from '@playwright/test'
import { test, expect } from './fixtures'
import { createVerifiedAccount, signIn } from './authEmulator'
import { block, continuousExercise, workoutPlan } from '../src/test/workoutBuilders'
import { sessionStep, workoutSession } from '../src/test/workoutSessionBuilders'
import type { WeekPlan, WeekPlanItem } from '../src/domain/week-plan/weekPlan.types'
import type { ManualWorkoutSession } from '../src/domain/workout-session/workoutSession.types'

const weekStart = '2026-11-09', instant = '2026-11-10T10:00:00.000Z'
const plan = { ...workoutPlan([block('bag', [continuousExercise('one', 60)], 'bag')]), id: 'bag-plan', nameSnapshot: 'Worek' }
const goal = (items: WeekPlanItem[], start = weekStart): WeekPlan => ({ weekStart: start, items, createdAt: instant, updatedAt: instant, editedAfterWeekEnd: false })
const exact = (id: string): WeekPlanItem => ({ id, kind: 'plan', workoutPlanId: plan.id, planNameSnapshot: plan.nameSnapshot })
const category = (id: string, value: ManualWorkoutSession['category'] = 'sparring'): WeekPlanItem => ({ id, kind: 'category', category: value })
const completed = (id: string) => workoutSession({ id, workoutPlanId: plan.id, category: 'bag', workoutDate: weekStart, stepResults: [sessionStep()] })
const nav = (page: Page) => page.getByRole('navigation', { name: 'Główna nawigacja' }).filter({ visible: true })
const form = (page: Page) => page.getByRole('form', { name: 'Edytuj plan tygodnia' })

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(instant)) })

async function accessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}
async function readableSelects(page: Page, info: TestInfo, theme: 'dark' | 'light') {
  if (info.project.name !== 'phone') return
  const measurements = []
  for (const name of ['Tydzień', 'Wybierz plan lub rodzaj', 'Zastąp pozycję 1']) {
    const control = page.getByRole('combobox', { name, exact: true })
    await expect(control).toBeVisible()
    const typography = await control.evaluate((element) => {
      const label = element.closest('label')
      return { control: Number.parseFloat(getComputedStyle(element).fontSize),
        label: label ? Number.parseFloat(getComputedStyle(label).fontSize) : null }
    })
    expect(typography.control, `${theme}: ${name}`).toBeGreaterThanOrEqual(16)
    expect(typography.label, `${theme}: ${name} label`).toBe(14)
    measurements.push({ name, ...typography })
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await info.attach(`week-plan-select-font-sizes-${theme}`, {
    body: JSON.stringify({ viewport: page.viewportSize(), theme, measurements }, null, 2), contentType: 'application/json',
  })
}
async function capture(page: Page, info: TestInfo, name: string) {
  if (process.env.CAPTURE_WEEK_PLAN_SCREENSHOTS !== '1' || info.project.name !== 'phone') return
  const folder = path.join(tmpdir(), 'week-plan-goals', 'screenshots')
  await mkdir(folder, { recursive: true })
  const file = path.join(folder, `${name}-360x800.png`)
  await page.evaluate(() => document.fonts.ready)
  if (name.startsWith('week-home')) await page.getByRole('region', { name: 'Plan tygodnia', exact: true }).screenshot({ path: file })
  else await page.screenshot({ path: file, fullPage: true })
  await info.attach(name, { path: file, contentType: 'image/png' })
}
async function add(page: Page, choice: string) {
  await page.getByRole('combobox', { name: 'Wybierz plan lub rodzaj' }).selectOption(choice)
  await page.getByRole('button', { name: 'Dodaj pozycję', exact: true }).click()
}
async function save(page: Page) {
  await page.getByRole('button', { name: 'Zapisz plan tygodnia', exact: true }).click()
  await expect(form(page)).toHaveCount(0)
}

test('creates repeated plans, recalculates 2/3, persists and copies selected completed and partial goals', async ({ app, page }, info) => {
  await app.open('/workouts')
  await app.seedPlan(plan)
  await nav(page).getByRole('link', { name: 'Postęp', exact: true }).click()
  await page.getByRole('link', { name: 'Ułóż plan tygodnia', exact: true }).click()
  await page.getByRole('button', { name: 'Ułóż plan tygodnia', exact: true }).click()
  await add(page, 'p:bag-plan'); await add(page, 'p:bag-plan'); await add(page, 'c:sparring')
  await save(page)
  await expect.poll(async () => (await app.readWeekPlans())[0]?.items.length).toBe(3)
  await app.seedSession(completed('first'))
  await app.seedSession(completed('second'))
  await app.seedSession({ ...completed('partial'), status: 'partial', category: 'sparring' })
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '3')
  await expect(page.getByText('Częściowe: 1 · Niewykonane: 0 · Dodatkowe: 0', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true }).click()
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme); await readableSelects(page, info, theme); await accessible(page); await capture(page, info, `week-details-${theme}`)
  }
  await page.getByRole('button', { name: 'Anuluj edycję', exact: true }).click()
  await nav(page).getByRole('link', { name: 'Start', exact: true }).click()
  const summary = page.getByRole('region', { name: 'Plan tygodnia', exact: true })
  await expect(summary.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme); await accessible(page); await capture(page, info, `week-home-${theme}`)
  }
  await summary.getByRole('link', { name: 'Szczegóły planu tygodnia' }).click()
  const source = (await app.readWeekPlans())[0]
  await page.getByRole('link', { name: 'Następny tydzień', exact: true }).click()
  await page.getByRole('button', { name: 'Ułóż plan tygodnia', exact: true }).click()
  await add(page, 'c:conditioning')
  await page.getByText('Skopiuj z poprzedniego tygodnia', { exact: true }).click()
  await page.getByRole('checkbox').nth(0).check(); await page.getByRole('checkbox').nth(2).check()
  await page.getByRole('button', { name: 'Dodaj wybrane do tego planu' }).click()
  await save(page)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await expect.poll(async () => (await app.readWeekPlans()).length).toBe(2)
  const all = await app.readWeekPlans(), copied = all.find((entry) => entry.weekStart === '2026-11-16')
  expect(all.find((entry) => entry.weekStart === weekStart)).toEqual(source)
  expect(copied?.items.map((item) => item.kind)).toEqual(['category', 'plan', 'category'])
  expect(copied?.items.every((item) => !source.items.some((original) => original.id === item.id))).toBe(true)
  await app.open('/progress/week/2026-11-16')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '3')
})

test('prefers a later completion, preserves a removed plan snapshot and reacts to journal deletion', async ({ app, page }) => {
  await app.open('/workouts'); await app.seedPlan(plan); await app.seedWeekPlan(goal([exact('one')]))
  await app.seedSession({ ...completed('tuesday'), status: 'partial', workoutDate: '2026-11-10' })
  await app.seedSession({ ...completed('friday'), workoutDate: '2026-11-13' })
  await app.open('/progress/week/2026-11-09')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByText('Częściowe: 0 · Niewykonane: 0 · Dodatkowe: 1')).toBeVisible()
  await app.removeWorkoutDocument('workoutPlans', plan.id)
  await expect(page.getByText('Plan niedostępny', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Pozycje planu tygodnia' }).getByText('Worek', { exact: true })).toBeVisible()
  await app.removeWorkoutDocument('workoutSessions', 'friday')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByText('Częściowe: 1 · Niewykonane: 0 · Dodatkowe: 0')).toBeVisible()
  await page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true }).click()
  await page.getByRole('combobox', { name: 'Zastąp pozycję 1', exact: true }).selectOption('c:bag')
  await save(page)
  expect(await app.readSessions()).toHaveLength(1)
  await page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true }).click()
  await page.getByRole('button', { name: 'Usuń pozycję 1', exact: true }).click()
  await save(page)
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await expect(page.getByText('Treningi w tygodniu: 1', { exact: true })).toBeVisible()
  await expect(page.getByText(/Dodatkowe:/)).toHaveCount(0)
})

test('marks a historical edit, copies the entire plan without the flag and blocks overflow without losing the draft', async ({ app, page }) => {
  await app.open('/workouts'); await app.seedWeekPlan(goal([category('one'), category('two', 'bag')], '2026-11-02'))
  await app.open('/progress/week/2026-11-02')
  await page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true }).click()
  await add(page, 'c:pads'); await save(page)
  await expect(page.getByText('Plan zmieniony po zakończeniu tygodnia', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Następny tydzień', exact: true }).click()
  await page.getByRole('button', { name: 'Ułóż plan tygodnia', exact: true }).click()
  await page.getByText('Skopiuj z poprzedniego tygodnia', { exact: true }).click()
  await page.getByRole('button', { name: 'Zaznacz cały plan' }).click()
  await page.getByRole('button', { name: 'Dodaj wybrane do tego planu' }).click()
  await save(page)
  await expect(page.getByText('Plan zmieniony po zakończeniu tygodnia', { exact: true })).toHaveCount(0)
  await expect.poll(async () => (await app.readWeekPlans()).find((entry) => entry.weekStart === weekStart)?.items.length).toBe(3)
  expect((await app.readWeekPlans()).find((entry) => entry.weekStart === weekStart)?.editedAfterWeekEnd).toBe(false)
  await page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true }).click()
  for (let index = 0; index < 10; index++) await add(page, 'c:bag')
  await page.getByText('Skopiuj z poprzedniego tygodnia', { exact: true }).click()
  await page.getByRole('button', { name: 'Zaznacz cały plan' }).click()
  await page.getByRole('button', { name: 'Dodaj wybrane do tego planu' }).click()
  await expect(page.getByRole('alert')).toContainText('najwyżej 14')
  await expect(form(page).getByRole('listitem')).toHaveCount(13)
  await page.getByRole('link', { name: 'Następny tydzień', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Odrzucić zmiany?' })
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: 'Wróć do edycji', exact: true }).click()
  await expect(form(page).getByRole('listitem')).toHaveCount(13)
  await page.getByRole('link', { name: 'Następny tydzień', exact: true }).click()
  await page.getByRole('button', { name: 'Odrzuć zmiany', exact: true }).click()
  expect((await app.readWeekPlans()).find((entry) => entry.weekStart === weekStart)?.items).toHaveLength(3)
})

test('saves locally offline, warns on logout, confirms after reconnect and isolates the next account', async ({ app, page, context }) => {
  await app.open('/workouts'); await app.seedWeekPlan(goal([category('one')]))
  await app.open('/progress/week/2026-11-09')
  await page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true }).click()
  await context.setOffline(true)
  await add(page, 'c:bag'); await save(page)
  await expect(page.getByRole('status').filter({ hasText: 'Czeka na wysłanie' })).toBeVisible()
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await context.setOffline(false)
  await expect.poll(async () => (await app.readWeekPlans())[0]?.items.length).toBe(2)
  await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
  await app.open('/progress/week/2026-11-09')
  await expect(page.getByRole('list', { name: 'Pozycje planu tygodnia' }).getByRole('listitem')).toHaveCount(2)
  await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
  const second = await createVerifiedAccount(page.request)
  await signIn(page, second)
  await expect(page.getByRole('button', { name: 'Wyloguj', exact: true })).toBeEnabled()
  await page.goto('/progress/week/2026-11-09')
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Ułóż plan tygodnia', exact: true })).toBeVisible()
  await expect(page.getByText('Treningi w tygodniu: 0', { exact: true })).toBeVisible()
})

test('shows corrupt and out-of-range data as unavailable, and permits retry without blocking workouts', async ({ app, page }) => {
  await app.open('/workouts'); await app.seedPlan(plan); await app.seedInvalidWeekPlan(weekStart)
  await app.open('/progress/week/2026-11-09')
  await expect(page.getByRole('alert')).toContainText('Nie udało się odczytać lub zapisać')
  await expect(page.getByRole('button', { name: 'Ułóż plan tygodnia', exact: true })).toHaveCount(0)
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await page.getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await app.seedWeekPlan(goal([category('fixed')]))
  await expect(page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true })).toBeVisible()
  await app.open('/progress/week/2026-08-10')
  await expect(page.getByText('Ten tydzień jest poza dostępnym zakresem historii.')).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await app.open('/workouts/bag-plan')
  await app.openPlayer()
  await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toBeVisible()
})

test('refreshes an open home at Monday and after returning from the background without moving unfinished goals', async ({ app, page }) => {
  await page.clock.setFixedTime(new Date('2026-11-15T22:59:59.000Z'))
  await app.open('/')
  await app.seedWeekPlan(goal([category('sunday')]))
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '1')
  await page.clock.setFixedTime(new Date('2026-11-15T23:00:01.000Z'))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  const summary = page.getByRole('region', { name: 'Plan tygodnia', exact: true })
  await expect(summary).toContainText('16.11.2026')
  await expect(summary.getByRole('progressbar')).toHaveCount(0)
  await expect(summary.getByText('Nie ustalono celu na ten tydzień.', { exact: true })).toBeVisible()
  expect((await app.readWeekPlans()).map((entry) => entry.weekStart)).toEqual([weekStart])
})

test('keeps long plan names readable and reserves the clear-goal warning for a removed list', async ({ app, page }, info) => {
  const nameA = 'Worek techniczny — długa seria ciosów na ciężki worek, wersja A'
  const nameB = 'Worek techniczny — długa seria ciosów na ciężki worek, wersja B'
  const named = (id: string, nameSnapshot: string) => ({ ...workoutPlan([block('bag', [continuousExercise(id, 60)], 'bag')]), id, nameSnapshot })
  const neutral = 'Lista jest pusta. Dodaj plan lub rodzaj treningu.'
  const removed = 'Lista jest pusta. Zapis usunie cel, zachowując treningi w dzienniku.'
  await app.open('/workouts')
  await app.seedPlan(named('plan-a', nameA))
  await app.seedPlan(named('plan-b', nameB))
  await app.seedWeekPlan(goal([], '2026-11-16'))
  await app.open('/progress/week/2026-11-09')
  await page.getByRole('button', { name: 'Ułóż plan tygodnia', exact: true }).click()
  await expect(form(page).getByText(neutral, { exact: true })).toBeVisible()
  await expect(form(page).getByText(removed, { exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Następny tydzień', exact: true }).click()
  await page.getByRole('button', { name: 'Ułóż plan tygodnia', exact: true }).click()
  await expect(form(page).getByText(neutral, { exact: true })).toBeVisible()
  await expect(form(page).getByText(removed, { exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Bieżący tydzień', exact: true }).click()
  await page.getByRole('button', { name: 'Ułóż plan tygodnia', exact: true }).click()

  const described = async (name: string) => {
    const control = form(page).getByRole('combobox', { name, exact: true })
    const id = await control.getAttribute('aria-describedby')
    expect(id, name).toBeTruthy()
    const target = page.locator(`[id="${id}"]`)
    await expect(target).toHaveCount(1)
    return { control, id: id ?? '', target }
  }
  const chooser = await described('Wybierz plan lub rodzaj')
  await chooser.control.selectOption('p:plan-a')
  await expect(chooser.target).toHaveText(nameA)
  await expect(chooser.control.locator('option:checked')).toHaveText(nameA)
  await chooser.control.selectOption('p:plan-b')
  await expect(chooser.target).toHaveText(nameB)
  await expect(chooser.control.locator('option:checked')).toHaveText(nameB)
  expect(await page.evaluate((descriptionId) => {
    const description = document.getElementById(descriptionId)
    const button = [...document.querySelectorAll('button')].find((entry) => entry.textContent?.trim() === 'Dodaj pozycję')
    return Boolean(description && button && (description.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING))
  }, chooser.id)).toBe(true)

  const frames = info.project.name === 'phone'
    ? [{ width: 360, height: 800 }, { width: 390, height: 844 }]
    : [page.viewportSize() ?? { width: 1440, height: 900 }]
  const themes = info.project.name === 'phone' ? ['dark', 'light'] as const : ['dark'] as const
  for (const viewport of frames) {
    await page.setViewportSize(viewport)
    for (const theme of themes) {
      if (info.project.name === 'phone') await app.setTheme(theme)
      const current = await described('Wybierz plan lub rodzaj')
      await expect(current.target).toHaveText(nameB)
      const metrics = await current.control.evaluate((element) => ({ font: Number.parseFloat(getComputedStyle(element).fontSize), height: element.getBoundingClientRect().height }))
      expect(metrics.font, `${viewport.width}: ${theme}`).toBeGreaterThanOrEqual(16)
      expect(metrics.height, `${viewport.width}: ${theme}`).toBeGreaterThanOrEqual(44)
      expect(await current.target.evaluate((element) => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }
  }

  await add(page, 'p:plan-b')
  const replacement = await described('Zastąp pozycję 1')
  await expect(replacement.target).toHaveText(`1. ${nameB}`)
  await expect(replacement.control.locator('option:checked')).toHaveText(nameB)
  const ids = [chooser.id, replacement.id]
  expect(new Set(ids).size).toBe(ids.length)
  for (const id of ids) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1)
  if (info.project.name === 'phone') {
    for (const viewport of frames) {
      await page.setViewportSize(viewport)
      const current = await described('Zastąp pozycję 1')
      await expect(current.target).toHaveText(`1. ${nameB}`)
      expect(await current.target.evaluate((element) => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }
  }
  await save(page)
  await expect.poll(async () => (await app.readWeekPlans()).find((entry) => entry.weekStart === weekStart)?.items[0]).toMatchObject({ kind: 'plan', workoutPlanId: 'plan-b', planNameSnapshot: nameB })

  await page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true }).click()
  const replace = form(page).getByRole('combobox', { name: 'Zastąp pozycję 1', exact: true })
  await replace.selectOption('p:plan-a')
  await expect((await described('Zastąp pozycję 1')).target).toHaveText(`1. ${nameA}`)
  await expect(replace.locator('option:checked')).toHaveText(nameA)
  await save(page)
  await expect.poll(async () => (await app.readWeekPlans()).find((entry) => entry.weekStart === weekStart)?.items[0]).toMatchObject({ kind: 'plan', workoutPlanId: 'plan-a', planNameSnapshot: nameA })

  await page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true }).click()
  await page.getByRole('button', { name: 'Usuń pozycję 1', exact: true }).click()
  await expect(form(page).getByText(removed, { exact: true })).toBeVisible()
  await expect(form(page).getByText(neutral, { exact: true })).toHaveCount(0)
  await add(page, 'c:bag')
  await expect(form(page).getByText(removed, { exact: true })).toHaveCount(0)
  await expect(form(page).getByText(neutral, { exact: true })).toHaveCount(0)
})

test('preserves an unsaved draft through a bad document and listener retry', async ({ app, page }) => {
  const original = goal([category('one')])
  await app.open('/workouts'); await app.seedWeekPlan(original)
  await app.open('/progress/week/2026-11-09')
  await page.getByRole('button', { name: 'Edytuj plan tygodnia', exact: true }).click()
  await add(page, 'c:bag')
  await app.seedSession({ ...completed('invalid-session'), note: 'n'.repeat(1001) })
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ponów odczyt treningów', exact: true }).click()
  await expect(form(page).getByRole('listitem')).toHaveCount(2)
  await app.removeWorkoutDocument('workoutSessions', 'invalid-session')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '1')
  await app.seedInvalidWeekPlan(weekStart)
  await expect(form(page).getByRole('alert').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zapisz plan tygodnia' })).toBeDisabled()
  await form(page).getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click()
  await expect(form(page).getByRole('listitem')).toHaveCount(2)
  await app.seedWeekPlan(original)
  await expect(page.getByRole('button', { name: 'Zapisz plan tygodnia' })).toBeEnabled()
  await save(page)
  await expect.poll(async () => (await app.readWeekPlans())[0]?.items.length).toBe(2)
})
