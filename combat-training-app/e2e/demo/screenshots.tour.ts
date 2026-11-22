import { selectRpe } from '../rpeSlider'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { signIn } from '../authEmulator'
import { seedRawAccountDocument, readSessions } from '../firestoreEmulator'
import { demoInstant, demoPlans, demoProfile, demoSessions, demoWeeks } from './data'
import { seedDemo } from './seed'
import { createDemoAccount } from './account'
import { expandProfileSection } from '../fixtures'

test('captures the demo athlete journey', async ({ page, context }, info) => {
  const folder = path.resolve('screenshots-tour')
  await mkdir(folder, { recursive: true })
  const shots: { file: string; caption: string }[] = []
  const externalOrigins = new Set<string>()
  let simulatingOffline = false
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    // Firestore WebChannel probes connectivity after a failed local connection.
    // Keep that expected offline image probe blocked without treating it as app traffic.
    if (simulatingOffline && url.origin === 'https://www.google.com' && url.pathname === '/images/cleardot.gif'
      && route.request().method() === 'GET' && route.request().resourceType() === 'image') {
      await route.abort('internetdisconnected')
      return
    }
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.protocol === 'data:' || url.protocol === 'blob:') {
      await route.continue()
    } else {
      externalOrigins.add(url.origin)
      await route.abort('blockedbyclient')
    }
  })
  // Set the calendar before login/listeners; fixed time leaves Firestore timers running.
  await page.clock.setFixedTime(new Date(demoInstant))
  async function capture(number: number, screen: string, caption: string) {
    expect([...externalOrigins], 'The tour must only use local demo services').toEqual([])
    await expect(page.locator('html')).toHaveAttribute('data-theme', info.project.name.endsWith('jasny') ? 'light' : 'dark')
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => scrollTo(0, 0))
    const file = `${String(number).padStart(2, '0')}-${screen}-${info.project.name}.png`
    await page.screenshot({ path: path.join(folder, file), fullPage: true, animations: 'disabled' })
    shots.push({ file, caption: `${caption} · ${info.project.name}` })
    // Preserve a manifest even when a later step fails; the gallery reports an incomplete run.
    await writeFile(path.join(folder, `${info.project.name}.json`), JSON.stringify(shots, null, 2))
  }
  async function open(url: string, heading: string) {
    // Match the existing E2E lease handoff on hard navigation.
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })))
    await page.goto(url)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    await expect(nav().getByRole('link', { name: 'Profil', exact: true })).toBeVisible()
  }
  const nav = () => page.getByRole('navigation', { name: 'Główna nawigacja' }).filter({ visible: true })
  try {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Zaloguj się', exact: true })).toBeVisible()
    await capture(22, 'logowanie', 'Logowanie')
    await page.getByRole('link', { name: 'Utwórz konto', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Utwórz konto', exact: true })).toBeVisible()
    await capture(23, 'rejestracja', 'Rejestracja')
    // Stable, fictional address in screenshots; each viewport/theme has an isolated account.
    const account = await createDemoAccount(page.request, info.project.name)
    await seedDemo(page.request, account)
    // Only the consent screen needs a temporarily withdrawn weight consent.
    await seedRawAccountDocument(page.request, account.uid, '', { ...demoProfile, healthDataConsent: null, weightClassLabel: null, schemaVersion: 1 })
    await page.goto('/profile/consent')
    await signIn(page, account)
    await expect(page.getByRole('checkbox', { name: 'Mam ukończone 18 lat.', exact: true })).toBeVisible()
    await capture(20, 'zgoda', 'Zgoda na dane o zdrowiu')
    await seedRawAccountDocument(page.request, account.uid, '', { ...demoProfile, schemaVersion: 1 })
    await expect(page.getByRole('heading', { name: 'Profil', exact: true })).toBeVisible()
    await expandProfileSection(page, 'Masa ciała')
    await expect(page.getByRole('region', { name: 'Lista pomiarów', exact: true }).getByRole('listitem')).toHaveCount(14)
    await capture(19, 'profil', 'Profil i wykres masy ciała')
    await open('/profile/delete-account', 'Usuń konto')
    await capture(21, 'usuniecie-konta', 'Usunięcie konta — bez potwierdzania')

    await open('/', 'Start')
    await expect(page.getByRole('region', { name: 'Ostatnia sesja', exact: true })).toContainText('Trening poza aplikacją · Technika')
    await capture(1, 'start', 'Start')
    await nav().getByRole('button', { name: 'Trening', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Nowy trening', exact: true })).toBeVisible()
    await capture(3, 'menu-nowy', 'Menu Nowy')
    await page.keyboard.press('Escape')
    await open('/workouts', 'Treningi')
    await expect(page.getByRole('article')).toHaveCount(3)
    await capture(2, 'treningi', 'Treningi — trzy plany')
    await open(`/workouts/${demoPlans[0].id}/edit`, 'Edycja planu')
    await capture(4, 'kreator', 'Kreator z blokami i elementami do poprawy')
    await page.getByRole('textbox', { name: 'Nazwa planu (opcjonalnie)', exact: true }).fill('Garda i wyjście — wersja robocza')
    await page.getByRole('link', { name: 'Anuluj', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Odrzucić zmiany?', exact: true })).toBeVisible()
    await capture(24, 'odrzucic-zmiany', 'Odrzucić zmiany?')
    await page.getByRole('button', { name: 'Odrzuć zmiany', exact: true }).click()
    await open(`/workouts/${demoPlans[0].id}`, demoPlans[0].nameSnapshot)
    await capture(5, 'szczegoly-planu', 'Szczegóły planu')

    await open('/progress?tab=history', 'Postęp')
    await expect(page.getByRole('region', { name: 'Historia treningów', exact: true }).getByRole('article')).toHaveCount(demoSessions.length)
    await capture(14, 'historia', 'Historia — 14 tygodni, dwa tygodnie przerwy')
    await open('/workout-sessions/plan-week-13/feedback', demoPlans[0].nameSnapshot)
    await expect(page.getByRole('region', { name: 'Poprzednie wykonanie planu', exact: true }).locator('dt')).toHaveText(['Trening', 'Praca', 'Ćwiczenia'])
    await expect(page.getByText('Zapisano RPE 6', { exact: true })).toBeVisible()
    await capture(11, 'podsumowanie-planu', 'Podsumowanie planu — poprzedni trening i RPE')
    await capture(15, 'szczegoly-wpisu', 'Szczegóły wpisu z ocenami i notatką')
    await open('/workout-sessions/quick-week-13/feedback', 'Szybki stoper')
    await expect(page.getByRole('group', { name: /Intensywność sparingu/ })).toBeVisible()
    await capture(12, 'podsumowanie-stopera', 'Podsumowanie stopera — sparing')
    await open('/workout-sessions/new', 'Trening spoza aplikacji')
    await page.getByRole('radio', { name: 'Kickboxing', exact: true }).check()
    await page.getByRole('group', { name: 'Części zajęć', exact: true }).getByRole('checkbox', { name: /^Technika/ }).check()
    await page.getByRole('radio', { name: '90 min', exact: true }).check()
    await selectRpe(page, 7)
    await capture(13, 'reczny-wpis', 'Ręczny wpis — zajęcia w klubie')
    await page.getByRole('button', { name: 'Anuluj', exact: true }).click()
    await page.getByRole('button', { name: 'Odrzuć zmiany', exact: true }).click()
    await open('/progress', 'Postęp')
    await expect(page.getByRole('heading', { name: 'Powrót do gardy', exact: true })).toBeVisible()
    await capture(16, 'postep', 'Postęp elementów do poprawy')
    await open(`/progress/week/${demoWeeks.at(-1)!.weekStart}`, 'Plan tygodnia')
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '4')
    await capture(17, 'plan-tygodnia', 'Plan bieżącego tygodnia')
    await open('/progress/focus-skills/guard', 'Powrót do gardy')
    await capture(18, 'postep-celu', 'Trend ocen i sprawdzona poprawka')

    await open('/quick-timer', 'Szybki stoper')
    await page.getByRole('button', { name: 'Sparing', exact: true }).click()
    await page.getByRole('combobox', { name: 'Dyscyplina', exact: true }).selectOption('kickboxing')
    await page.getByRole('button', { name: '3 × 2:00 · przerwa 1:00', exact: true }).click()
    await capture(9, 'stoper-ustawienia', 'Szybki stoper — ustawienia')
    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
    await page.getByRole('button', { name: 'Zacznij teraz', exact: true }).click()
    await expect(page.getByText('PRACA', { exact: true })).toBeVisible()
    await capture(10, 'stoper-praca', 'Szybki stoper — w trakcie')
    await page.clock.setFixedTime(new Date(Date.parse(demoInstant) + 480_000))
    await expect(page).toHaveURL(/\/feedback$/)
    await expect(page.getByText('Czeka na wysłanie', { exact: true })).toHaveCount(0)

    // Preserve feedback and profile modules in this document; routing disables the HTTP cache
    // and service workers are blocked, so a hard navigation loses offline lazy routes.
    await nav().getByRole('link', { name: 'Profil', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Wyloguj', exact: true })).toBeEnabled()
    await nav().getByRole('button', { name: 'Trening', exact: true }).click()
    await page.getByRole('dialog', { name: 'Nowy trening', exact: true }).getByRole('link', { name: /^Moje plany/ }).click()
    await expect(page.getByRole('heading', { name: 'Treningi', exact: true })).toBeVisible()
    await page.getByRole('article').filter({ has: page.getByRole('heading', { name: demoPlans[0].nameSnapshot, exact: true }) })
      .getByRole('link', { name: 'Zobacz plan', exact: true }).click()
    await expect(page.getByRole('heading', { name: demoPlans[0].nameSnapshot, exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Rozpocznij trening', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Rozpocznij trening', exact: true })).toBeVisible()
    const start = Date.parse(demoInstant) + 480_000
    await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
    await expect(page.getByText('PRZYGOTUJ SIĘ', { exact: true })).toBeVisible()
    await capture(6, 'odtwarzacz-przygotowanie', 'Odtwarzacz — przygotowanie')
    await page.getByRole('button', { name: 'Zacznij teraz', exact: true }).click()
    await expect(page.getByText('PRACA', { exact: true })).toBeVisible()
    await capture(7, 'odtwarzacz-praca', 'Odtwarzacz — praca')
    await page.clock.setFixedTime(new Date(start + (300 + 180) * 1000))
    // The warmup and first round end in roundRest; PRZERWA labels a standalone break.
    await expect(page.getByText('ODPOCZYNEK', { exact: true })).toBeVisible()
    await capture(8, 'odtwarzacz-przerwa', 'Odtwarzacz — przerwa między rundami')
    // Keep the loaded modules available offline, then finish and retain the pending workout.
    simulatingOffline = true
    await context.setOffline(true)
    await page.clock.setFixedTime(new Date(start + 2460_000))
    await expect(page).toHaveURL(/\/feedback$/)
    await expect(page.getByText('Czeka na wysłanie', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Wróć do planu', exact: true }).click()
    await nav().getByRole('link', { name: 'Profil', exact: true }).click()
    await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Wylogować się?', exact: true })).toBeVisible()
    await capture(25, 'wylogowanie-niewyslane', 'Wylogowanie z niewysłanym treningiem')
    await page.getByRole('dialog').getByRole('button', { name: 'Anuluj', exact: true }).click()
    await context.setOffline(false)
    simulatingOffline = false
    await expect.poll(async () => (await readSessions(page.request, account.uid)).length).toBe(demoSessions.length + 2)
  } finally {
    // The fixture closes its isolated context after failures, including timeout.
    // Do not mask the original error by calling setOffline on a closed context.
    expect.soft([...externalOrigins], 'Blocked non-local requests').toEqual([])
  }
})
