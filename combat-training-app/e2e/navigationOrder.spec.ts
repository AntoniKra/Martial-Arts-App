import AxeBuilder from '@axe-core/playwright'
import { test, expect, openProfile } from './fixtures'
import { createVerifiedAccount, signIn, signInWithFakeGoogle, uniqueEmail } from './authEmulator'
import { seedPlan } from './firestoreEmulator'
import { block, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'

test('shows the navigation in the requested order with Training in the middle', async ({ app, page }, info) => {
  await app.open('/')
  const navigation = page.getByRole('navigation', { name: 'Główna nawigacja', exact: true })
  const controls = navigation.getByRole('link').or(navigation.getByRole('button', { name: 'Trening', exact: true }))
  await expect(controls).toHaveText(['Start', 'Plan', 'Trening', 'Postęp', 'Profil'])
  const boxes = await controls.evaluateAll((elements) => elements.map((element) => {
    const { x, y, width, height } = element.getBoundingClientRect()
    return { x, y, width, height }
  }))
  const axis = info.project.name === 'phone' ? 'x' : 'y'
  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index][axis]).toBeGreaterThan(boxes[index - 1][axis])
  }
  await page.evaluate(() => document.fonts.ready)
  if (process.env.CAPTURE_SCREENSHOTS === '1') {
  await page.screenshot({ path: info.outputPath('navigation.png'), fullPage: true })
  await info.attach('navigation', { path: info.outputPath('navigation.png'), contentType: 'image/png' })
  }
  await controls.nth(2).click()
  await expect(page.getByRole('dialog', { name: 'Nowy trening', exact: true })).toBeVisible()
})

test('opens Start after password login and after signing in again from a previous route', async ({ page, request }) => {
  const account = await createVerifiedAccount(request)
  await page.goto('/login')
  await signIn(page, account)
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('link', { name: 'Start', exact: true })).toHaveAttribute('aria-current', 'page')
  for (const previous of ['Profil', 'Plan']) {
    await page.getByRole('link', { name: previous, exact: true }).click()
    await openProfile(page)
    await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
    await expect(page).toHaveURL('/login')
    // Firebase's redirect flow reloads this same login URL and its history state.
    await page.reload()
    await signIn(page, account)
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('link', { name: 'Start', exact: true })).toHaveAttribute('aria-current', 'page')
  }
})

test('returns to an explicit plan link after password login', async ({ page, request }) => {
  const account = await createVerifiedAccount(request)
  const plan = workoutPlan([block('block-1', [roundsExercise('exercise-1', 2, 60, 30)])])
  await seedPlan(request, account.uid, plan)
  const destination = `/workouts/${plan.id}?source=link#details`
  await page.goto(destination)
  await expect(page).toHaveURL('/login')
  await signIn(page, account)
  await expect(page).toHaveURL(destination)
  await expect(page.getByRole('heading', { name: plan.nameSnapshot, exact: true })).toBeVisible()
})

test('rejects an external destination from the login query', async ({ page, request }) => {
  const account = await createVerifiedAccount(request)
  await page.goto(`/login?${new URLSearchParams({ returnTo: 'https://example.test/' })}`)
  await signIn(page, account)
  await expect(page).toHaveURL('/')
})

test('returns to an explicit plan link after Google popup login', async ({ page, request }) => {
  const account = await createVerifiedAccount(request)
  const plan = workoutPlan([block('block-1', [roundsExercise('exercise-1', 2, 60, 30)])])
  await seedPlan(request, account.uid, plan)
  const destination = `/workouts/${plan.id}?source=popup#details`
  await page.goto(destination)
  await expect(page).toHaveURL('/login')
  const popupOpened = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Kontynuuj z Google', exact: true }).click()
  await signInWithFakeGoogle(await popupOpened, account.email)
  await expect(page).toHaveURL(destination)
  await expect(page.getByRole('heading', { name: plan.nameSnapshot, exact: true })).toBeVisible()
})

test.describe('Google redirect', () => {
  test.use({ hasTouch: true })

  test('opens Start after Google login from the previous Profile route', async ({ app, page }) => {
    await app.open('/')
    await page.getByRole('link', { name: 'Profil', exact: true }).click()
    await openProfile(page)
    await page.getByRole('button', { name: 'Wyloguj', exact: true }).click()
    await expect(page).toHaveURL('/login')
    await page.getByRole('button', { name: 'Kontynuuj z Google', exact: true }).click()
    await signInWithFakeGoogle(page, uniqueEmail())
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('link', { name: 'Start', exact: true })).toHaveAttribute('aria-current', 'page')
  })

  test('returns to an explicit plan link after Google login', async ({ page, request }) => {
    const account = await createVerifiedAccount(request)
    const plan = workoutPlan([block('block-1', [roundsExercise('exercise-1', 2, 60, 30)])])
    await seedPlan(request, account.uid, plan)
    const destination = `/workouts/${plan.id}?source=google#details`
    await page.goto(destination)
    await expect(page).toHaveURL('/login')
    await page.getByRole('button', { name: 'Kontynuuj z Google', exact: true }).click()
    await signInWithFakeGoogle(page, account.email)
    await expect(page).toHaveURL(destination)
    await expect(page.getByRole('heading', { name: plan.nameSnapshot, exact: true })).toBeVisible()
  })
})

test('opens all sections, sheet destinations and legacy addresses', async ({ app, page }) => {
  await page.clock.setFixedTime(new Date('2026-11-18T12:00:00Z'))
  await app.open('/')
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja', exact: true })
  for (const label of ['Plan', 'Postęp', 'Profil', 'Start']) {
    const link = nav.getByRole('link', { name: label, exact: true })
    await link.click()
    await expect(link).toHaveAttribute('aria-current', 'page')
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label)
    if (label === 'Plan') {
      await expect(page).toHaveURL('/progress/week')
      await expect(page.getByRole('radio', { name: 'Tydzień', exact: true })).toBeChecked()
      await expect(page.getByRole('list', { name: 'Dni planu tygodnia', exact: true })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'Wstecz', exact: true })).toHaveCount(0)
  }
  for (const [label, path] of [['Szybki stoper', '/quick-timer'], ['Trening spoza aplikacji', '/workout-sessions/new'], ['Nowy plan', '/workouts/new']]) {
    await nav.getByRole('button', { name: 'Trening', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'Nowy trening', exact: true })
    await sheet.getByRole('link', { name: new RegExp(`^${label}`) }).click()
    await expect(page).toHaveURL(path)
    await expect(nav.getByRole('button', { name: 'Trening', exact: true })).toHaveAttribute('aria-current', 'page')
  }
  for (const suffix of ['', '?tab=plans', '?tab=plans&source=old#list']) {
    await app.open(`/workouts${suffix}`)
    await expect(page).toHaveURL(`/progress/week?tab=plans${suffix.includes('source') ? '&source=old#list' : ''}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Plan')
    await expect(page.getByRole('radio', { name: 'Moje plany', exact: true })).toBeChecked()
    await expect(page.getByRole('button', { name: 'Wstecz', exact: true })).toHaveCount(0)
  }
  await app.open('/workouts?tab=history&week=2026-11-16#journal')
  await expect(page).toHaveURL('/progress?tab=history&week=2026-11-16#journal')
  await expect(nav.getByRole('link', { name: 'Postęp', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('radio', { name: 'Historia', exact: true })).toBeChecked()
  await expect(page.getByRole('searchbox', { name: 'Szukaj w nazwach i notatkach', exact: true })).toBeVisible()
  for (const theme of ['dark', 'light'] as const) {
    await app.setTheme(theme)
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
  }
  await page.getByRole('radio', { name: 'Wykresy', exact: true }).check()
  await expect(page).toHaveURL('/progress')
  await expect(page.getByRole('radio', { name: 'Wykresy', exact: true })).toBeChecked()
  await expect(page.getByRole('searchbox', { name: 'Szukaj w nazwach i notatkach', exact: true })).toHaveCount(0)
  await page.goBack()
  await expect(page).toHaveURL('/progress?tab=history&week=2026-11-16#journal')
  await expect(page.getByRole('radio', { name: 'Historia', exact: true })).toBeChecked()
  await app.open('/my-exercises')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Moje ćwiczenia')
})

for (const theme of ['dark', 'light'] as const) {
  for (const width of [360, 390]) {
    test(`N1 C at ${width}px in ${theme}: shortcuts, Plan segments and the three-action sheet`, async ({ app, page }) => {
      await page.setViewportSize({ width, height: width === 360 ? 800 : 844 })
      await page.clock.setFixedTime(new Date('2026-11-18T12:00:00Z'))
      await app.open('/workouts')
      await app.setTheme(theme)
      const plan = workoutPlan([block('technique', [roundsExercise('shadowboxing', 2, 60, 30)])])
      await app.seedPlan(plan)
      await app.open('/')

      const nav = page.getByRole('navigation', { name: 'Główna nawigacja', exact: true })
      const planNav = nav.getByRole('link', { name: 'Plan', exact: true })
      const shortcuts = page.getByRole('navigation', { name: 'Skróty', exact: true })
      const plansShortcut = shortcuts.getByRole('link', { name: 'Moje plany Lista planów treningowych', exact: true })
      const exercisesShortcut = shortcuts.getByRole('link', { name: 'Moje ćwiczenia Biblioteka ćwiczeń', exact: true })
      await expect(shortcuts.getByRole('link')).toHaveCount(2)
      await expect(plansShortcut).toHaveCSS('padding', '12px 14px')
      await expect(plansShortcut).toHaveCSS('height', '62px')
      await expect(plansShortcut).toHaveCSS('border-radius', '4px')
      await exercisesShortcut.click()
      await expect(page).toHaveURL('/exercises')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Moje ćwiczenia')
      await page.goBack()
      await plansShortcut.click()
      await expect(page).toHaveURL('/progress/week?tab=plans')
      await expect(planNav).toHaveAttribute('aria-current', 'page')

      const segment = page.getByRole('radiogroup', { name: 'Plan tygodnia', exact: true })
      const plans = segment.getByRole('radio', { name: 'Moje plany', exact: true })
      const week = segment.getByRole('radio', { name: 'Tydzień', exact: true })
      const libraryTile = page.getByRole('link', { name: 'Moje ćwiczenia Biblioteka ćwiczeń', exact: true })
      const search = page.getByRole('searchbox', { name: 'Szukaj treningu', exact: true })
      await expect(plans).toBeChecked()
      await expect(plans).toHaveCSS('background-color', theme === 'dark' ? 'rgb(193, 18, 47)' : 'rgb(181, 18, 43)')
      await expect(plans).toHaveCSS('height', '44px')
      await expect(libraryTile).toHaveAttribute('href', '/exercises')
      await expect(libraryTile).toHaveCSS('padding', '12px 14px')
      await expect(search).toHaveAttribute('placeholder', 'Szukaj')
      const libraryBox = await libraryTile.boundingBox()
      const searchBox = await search.boundingBox()
      expect(libraryBox!.y + libraryBox!.height).toBeLessThan(searchBox!.y)
      await expect(page.getByRole('link', { name: 'Stoper rund', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Filtry', exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Utwórz nowy trening', exact: true })).toHaveAttribute('href', '/workouts/new')
      await expect(page.getByRole('heading', { name: plan.nameSnapshot, exact: true })).toBeVisible()

      await planNav.click()
      await expect(week).toBeChecked()
      await week.press('ArrowRight')
      await expect(plans).toBeFocused()
      await expect(plans).toBeChecked()
      await page.goBack()
      await expect(page).toHaveURL('/progress/week')
      await expect(week).toBeChecked()
      await expect(planNav).toHaveAttribute('aria-current', 'page')
      await expect(page.getByRole('list', { name: 'Dni planu tygodnia', exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)

      const training = nav.getByRole('button', { name: 'Trening', exact: true })
      await training.click()
      const sheet = page.getByRole('dialog', { name: 'Nowy trening', exact: true })
      await expect(sheet).toHaveCSS('border-top-width', '2px')
      await expect(sheet).toHaveCSS('border-top-color', 'rgb(240, 117, 58)')
      await expect(sheet).toHaveCSS('width', `${width}px`)
      await expect(sheet.getByRole('link')).toHaveText([
        'Szybki stoperRundy i przerwy bez planu',
        'Trening spoza aplikacjiWpisz trening z klubu',
        'Nowy planZbuduj plan z bloków',
      ])
      const close = sheet.getByRole('button', { name: 'Zamknij', exact: true })
      await expect(close).toHaveText('')
      await expect(close).toHaveCSS('width', '44px')
      await close.click()
      await expect(sheet).not.toBeVisible()
      await expect(training).toBeFocused()
    })
  }
}
