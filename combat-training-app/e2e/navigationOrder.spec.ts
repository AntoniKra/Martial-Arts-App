import { test, expect, openProfile } from './fixtures'
import { createVerifiedAccount, signIn, signInWithFakeGoogle, uniqueEmail } from './authEmulator'
import { seedPlan } from './firestoreEmulator'
import { block, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'

test('shows the navigation in the requested order with New in the middle', async ({ app, page }, info) => {
  await app.open('/')
  const navigation = page.getByRole('navigation', { name: 'Główna nawigacja', exact: true })
  const controls = navigation.getByRole('link').or(navigation.getByRole('button', { name: 'Nowy', exact: true }))
  await expect(controls).toHaveText(['Start', 'Postęp', 'Nowy', 'Treningi', 'Profil'])
  const boxes = await controls.evaluateAll((elements) => elements.map((element) => {
    const { x, y, width, height } = element.getBoundingClientRect()
    return { x, y, width, height }
  }))
  const axis = info.project.name === 'phone' ? 'x' : 'y'
  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index][axis]).toBeGreaterThan(boxes[index - 1][axis])
  }
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: info.outputPath('navigation.png'), fullPage: true })
  await info.attach('navigation', { path: info.outputPath('navigation.png'), contentType: 'image/png' })
  await controls.nth(2).click()
  await expect(page.getByRole('dialog', { name: 'Nowy trening', exact: true })).toBeVisible()
})

test('opens Start after password login and after signing in again from a previous route', async ({ page, request }) => {
  const account = await createVerifiedAccount(request)
  await page.goto('/login')
  await signIn(page, account)
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('link', { name: 'Start', exact: true })).toHaveAttribute('aria-current', 'page')
  for (const previous of ['Profil', 'Treningi']) {
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
