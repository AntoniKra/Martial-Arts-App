import { test as base, expect, type Page } from '@playwright/test'
import { createVerifiedAccount, signIn } from './authEmulator'
import { seedPlan, readSessions, seedFocusSkill, readFocusSkills, seedSession, readPlans } from './firestoreEmulator'
import type { WorkoutPlan } from '../src/domain/workout/workout.types'
import type { FocusSkill } from '../src/domain/focus-skill/focusSkill.types'
import type { WorkoutSession } from '../src/domain/workout-session/workoutSession.types'
import type { WeekPlan } from '../src/domain/week-plan/weekPlan.types'
import { seedWeekPlan, seedInvalidWeekPlan, readWeekPlans, removeWorkoutDocument } from './firestoreEmulator'
import { readProfile, readBodyWeights, seedBodyWeight } from './firestoreEmulator'
import type { BodyWeight } from '../src/domain/profile/profile.types'

class WorkoutApp {
  private authenticated = false
  private uid = ''
  constructor(readonly page: Page, private readonly serviceWorkers: 'allow' | 'block') {}

  async open(path = '/') {
    if (!this.authenticated) {
      const account = await createVerifiedAccount(this.page.request)
      this.uid = account.uid
      await this.page.goto(path)
      await expect(this.page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
      await signIn(this.page, account)
      // Enabled only after the first snapshots. That is also when Firestore has
      // registered the pagehide handler that releases the primary lease.
      await expect(this.page.getByRole('button', { name: 'Wyloguj', exact: true })).toBeEnabled()
      this.authenticated = true
    }
    // ready means the precache is installed, not that clients.claim() has taken
    // control of this document. It can skip a document still loading during
    // activation. Navigate after ready so every later lazy import works offline.
    if (this.serviceWorkers === 'allow') {
      await this.page.evaluate(async () => { await navigator.serviceWorker.ready })
    }
    await this.releaseFirestoreLease()
    const response = await this.page.goto(path)
    if (this.serviceWorkers === 'allow') expect(response?.fromServiceWorker()).toBe(true)
    await expect(this.page.getByRole('main')).toBeVisible()
  }

  private async releaseFirestoreLease() {
    // Firestore keeps the primary lease for 5s unless pagehide marks this client
    // as zombied. A reload that wins that race keeps the next tab on a stale
    // cache, or on the plan-loading state, until the lease expires. That window
    // is the same 5s as the assertion timeout.
    await this.page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }))
    })
  }

  async seedPlan(plan: WorkoutPlan, { waitUntilRendered = true }: { waitUntilRendered?: boolean } = {}) {
    await seedPlan(this.page.request, this.uid, plan)
    // Skip the render wait only when the current screen deliberately keeps an
    // immutable plan snapshot, e.g. an active player while its source plan is edited.
    if (!waitUntilRendered) return
    // The emulator write stays invisible to this tab until its listener applies it.
    // A reload before that reads an empty persistent cache, and the new tab can keep
    // showing that empty snapshot for the whole 5s primary-lease window. Return only
    // once this tab renders the plan, so the cache already contains it.
    await expect(this.page.getByRole('heading', { name: plan.nameSnapshot, exact: true })).toBeVisible()
  }
  async readSessions() { return readSessions(this.page.request, this.uid) }
  // This write may reach the tab after seedPlan. openPlayer waits for the player's
  // referenced-skill admission, so callers do not depend on listener order.
  async seedFocusSkill(skill: FocusSkill) { await seedFocusSkill(this.page.request, this.uid, skill) }
  async readFocusSkills() { return readFocusSkills(this.page.request, this.uid) }
  async seedSession(session: WorkoutSession) { await seedSession(this.page.request, this.uid, session) }
  async readPlans() { return readPlans(this.page.request, this.uid) }
  async seedWeekPlan(plan: WeekPlan) { await seedWeekPlan(this.page.request, this.uid, plan) }
  async seedInvalidWeekPlan(weekStart: string) { await seedInvalidWeekPlan(this.page.request, this.uid, weekStart) }
  async readWeekPlans() { return readWeekPlans(this.page.request, this.uid) }
  async readProfile() { return readProfile(this.page.request, this.uid) }
  async readBodyWeights() { return readBodyWeights(this.page.request, this.uid) }
  async seedBodyWeight(weight: BodyWeight) { return seedBodyWeight(this.page.request, this.uid, weight) }
  async removeWorkoutDocument(collection: 'workoutPlans' | 'workoutSessions', id: string) { await removeWorkoutDocument(this.page.request, this.uid, collection, id) }

  async createPlan(name = 'Plan E2E', roundDurationLabel: '1:00' | '3:00' = '1:00') {
    const { page } = this
    await this.open('/workouts/new')
    await page.getByRole('radio', { name: 'Boks', exact: true }).check()
    await page.getByRole('textbox', { name: 'Nazwa planu' }).fill(name)
    await page.getByRole('button', { name: 'Dodaj blok', exact: true }).click()
    await page.getByRole('button', { name: 'Technika', exact: true }).click()

    await this.addCustomExercise('Praca na nogach')
    // Native radios are visually hidden inside labels; select them with the keyboard.
    const roundCount = page.getByRole('group', { name: 'Liczba rund', exact: true })
      .getByRole('radio', { name: '2', exact: true })
    await roundCount.press('Space')
    await expect(roundCount).toBeChecked()
    const roundDuration = page.getByRole('group', { name: 'Czas rundy', exact: true })
      .getByRole('radio', { name: roundDurationLabel, exact: true })
    await roundDuration.press('Space')
    await expect(roundDuration).toBeChecked()
    const roundRest = page.getByRole('group', { name: 'Przerwa między rundami', exact: true })
      .getByRole('radio', { name: '0:30', exact: true })
    await roundRest.press('Space')
    await expect(roundRest).toBeChecked()
    await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()

    await this.addCustomExercise('Walka z cieniem')
    await page.getByRole('radio', { name: 'Ciągłe', exact: true }).click()
    await page.getByRole('textbox', { name: 'Minuty', exact: true }).fill('1')
    await page.getByRole('textbox', { name: 'Sekundy', exact: true }).fill('0')
    await page.getByRole('button', { name: 'Dodaj ćwiczenie', exact: true }).click()

    await this.savePlan()
    await expect(page.getByRole('heading', { name: 'Treningi', exact: true })).toBeVisible()
    await page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) })
      .getByRole('link', { name: 'Zobacz plan', exact: true }).click()
    // The list already has the same heading while the details chunk is loading.
    await expect(page).toHaveURL(/\/workouts\/[^/]+$/)
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    return page.url()
  }

  private async addCustomExercise(name: string) {
    const { page } = this
    await page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true }).click()
    await page.getByRole('radio', { name: 'Własne ćwiczenie', exact: true }).click()
    await page.getByRole('textbox', { name: 'Nazwa ćwiczenia', exact: true }).fill(name)
    await page.getByRole('button', { name: 'Konfiguruj ćwiczenie', exact: true }).click()
  }

  async savePlan() {
    const builderUrl = this.page.url()
    await this.page.getByRole('button', { name: 'Podgląd planu', exact: true }).click()
    await this.page.getByRole('button', { name: 'Zapisz plan', exact: true }).click()
    await expect(this.page).not.toHaveURL(builderUrl)
  }

  async openPlayer() {
    await this.page.getByRole('link', { name: 'Rozpocznij trening', exact: true }).click()
    await expect(this.page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toBeVisible()
  }

  async freezeClock() {
    const time = new Date('2026-11-03T09:00:00Z')
    await this.page.clock.install({ time })
    await this.page.clock.pauseAt(new Date('2026-11-03T10:00:00Z'))
  }

  async startWorkout() {
    const start = this.page.getByRole('button', { name: 'Rozpocznij trening', exact: true })
    if (await start.isVisible()) await start.click()
    await this.page.getByRole('button', { name: 'Zacznij teraz', exact: true }).click()
    await expect(this.page.getByRole('button', { name: 'Pauza', exact: true })).toBeVisible()
  }

  async finishWorkout() {
    await this.freezeClock()
    await this.startWorkout()
    await this.page.clock.fastForward(210_000)
    await this.expectWorkoutSaved()
  }

  async expectWorkoutSaved() {
    // The controlled playback clock also freezes Firestore's task queue; release it after playback.
    await this.page.clock.resume()
    await expect(this.page).toHaveURL(/\/workout-sessions\/[^/]+\/feedback$/)
    await expect(this.page.getByText('Wpis jest już w dzienniku. Oceny dopisują się do niego.', { exact: true })).toBeVisible()
    if (await this.page.evaluate(() => navigator.onLine)) {
      await expect.poll(async () => (await this.readSessions()).length).toBeGreaterThan(0)
      // The emulator REST read can see a write before this client's metadata
      // acknowledges it. Sign-out must wait for that acknowledgement as well.
      await expect(this.page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)
    }
  }

  async openHistory() {
    await this.open('/workouts')
    await this.page.getByRole('radio', { name: 'Historia', exact: true }).click()
    return this.page.getByRole('region', { name: 'Historia treningów', exact: true })
  }

  async setTheme(theme: 'light' | 'dark') {
    const label = theme === 'light' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'
    const toggle = this.page.getByRole('button', { name: label, exact: true })
    if (await toggle.isVisible()) await toggle.click()
    await expect(this.page.locator('html')).toHaveAttribute('data-theme', theme)
    // The attribute can change before inherited colors settle in Chromium.
    await expect(this.page.locator('html')).toHaveCSS('color', theme === 'light' ? 'rgb(17, 17, 19)' : 'rgb(244, 244, 241)')
  }
}

export const test = base.extend<{ app: WorkoutApp }>({
  app: async ({ page, serviceWorkers }, provideApp) => {
    await provideApp(new WorkoutApp(page, serviceWorkers))
  },
})

export { expect }
