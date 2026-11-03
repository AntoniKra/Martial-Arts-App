import { test, expect } from './fixtures'

test('remembers both theme choices after reload despite the system preference', async ({ app, page }) => {
  await app.open()
  await app.setTheme('light')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Włącz ciemny motyw', exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await app.setTheme('dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Włącz jasny motyw', exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
