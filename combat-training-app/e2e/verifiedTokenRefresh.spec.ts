import { expect, test, type Page } from '@playwright/test'
import { block, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'
import { accountsWithEmail, testPassword, uniqueEmail, verifyAccountEmail } from './authEmulator'
import { seedPlan } from './firestoreEmulator'

async function registerForPlans(page: Page) {
  const email = uniqueEmail()
  await page.goto('/workouts')
  await page.getByRole('link', { name: 'Utwórz konto', exact: true }).click()
  const form = page.getByRole('main').filter({ has: page.getByRole('heading', { name: 'Utwórz konto', exact: true }) })
  await form.getByLabel('Adres e-mail', { exact: true }).fill(email)
  await form.getByLabel('Hasło', { exact: true }).fill(testPassword)
  await form.getByRole('button', { name: 'Utwórz konto', exact: true }).click()
  await expect(page).toHaveURL('/verify-email')
  await expect(page.getByRole('status')).toHaveText('Wysłaliśmy wiadomość weryfikacyjną.')
  const [account] = await accountsWithEmail(page.request, email)
  const plan = workoutPlan([block('technique', [roundsExercise('pads', 2, 60, 30)])])
  await seedPlan(page.request, account.uid, plan)
  // The Auth Emulator updates the account without replacing this browser's saved token.
  await verifyAccountEmail(page.request, account.uid)
  return page.getByRole('heading', { name: plan.nameSnapshot, exact: true })
}

test('loads Firestore plans after background verification and a reload', async ({ page }) => {
  const plan = await registerForPlans(page)
  await page.reload()
  await expect(page).toHaveURL('/progress/week?tab=plans')
  await expect(plan).toBeVisible()
})

test('checks background verification when the verification screen regains focus', async ({ page }) => {
  const plan = await registerForPlans(page)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page).toHaveURL('/progress/week?tab=plans')
  await expect(plan).toBeVisible()
})

test('offers a session retry when Auth rejects the token refresh', async ({ page }) => {
  const plan = await registerForPlans(page)
  await page.route((url) => url.origin === 'http://127.0.0.1:9099' && url.pathname === '/securetoken.googleapis.com/v1/token',
    (route) => route.fulfill({
      status: 400,
      headers: { 'access-control-allow-origin': '*' },
      json: { error: { message: 'INTERNAL_ERROR' } },
    }), { times: 1 })
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Nie udało się odczytać sesji.')
  await page.getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click()
  await expect(page).toHaveURL('/progress/week?tab=plans')
  await expect(plan).toBeVisible()
})
