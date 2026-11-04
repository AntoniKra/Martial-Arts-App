import { test as base, expect, type Page } from '@playwright/test'
import { createVerifiedAccount, signIn } from './authEmulator'

class WorkoutApp {
  private authenticated = false
  constructor(readonly page: Page) {}

  async open(path = '/') {
    if (!this.authenticated) {
      const account = await createVerifiedAccount(this.page.request)
      await this.page.goto(path)
      await expect(this.page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
      await signIn(this.page, account)
      await expect(this.page.getByRole('button', { name: 'Wyloguj', exact: true })).toBeVisible()
      this.authenticated = true
    }
    await this.page.goto(path)
    await expect(this.page.getByRole('main')).toBeVisible()
  }

  async createPlan(name = 'Plan E2E') {
    const { page } = this
    await this.open('/workouts/new')
    await page.getByRole('radio', { name: 'Boks', exact: true }).check()
    await page.getByRole('textbox', { name: 'Nazwa planu' }).fill(name)
    await page.getByRole('button', { name: 'Dodaj blok', exact: true }).click()
    await page.getByRole('button', { name: 'Technika', exact: true }).click()

    await this.addCustomExercise('Praca na nogach')
    await page.getByRole('textbox', { name: 'Liczba rund' }).fill('2')
    // Native radios are visually hidden inside labels; select them with the keyboard.
    const roundDuration = page.getByRole('group', { name: 'Czas rundy', exact: true })
      .getByRole('radio', { name: '1:00', exact: true })
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
    await this.page.getByRole('button', { name: 'Podgląd planu', exact: true }).click()
    await this.page.getByRole('button', { name: 'Zapisz plan', exact: true }).click()
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

  async finishWorkout() {
    await this.freezeClock()
    await this.page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
    await this.page.clock.fastForward(210_000)
    await this.expectWorkoutSaved()
  }

  async expectWorkoutSaved() {
    await expect(this.page.getByRole('heading', { name: 'Trening zakończony', exact: true })).toBeVisible()
    await expect(this.page.getByRole('status')).toHaveText('Trening został zapisany.')
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
  }
}

export const test = base.extend<{ app: WorkoutApp }>({
  app: async ({ page }, provideApp) => {
    await provideApp(new WorkoutApp(page))
  },
})

export { expect }
