import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import { testPassword, uniqueEmail } from './authEmulator'

for (const theme of ['dark', 'light'] as const) {
  for (const screen of ['login', 'register', 'forgot-password', 'verify-email'] as const) {
    test(`auth ${screen} has no axe violations from moderate in ${theme}`, async ({ page }, testInfo) => {
      await page.goto(screen === 'verify-email' ? '/register' : `/${screen}`)
      if (screen === 'verify-email') {
        await page.getByLabel('Adres e-mail', { exact: true }).fill(uniqueEmail())
        await page.getByLabel('Hasło', { exact: true }).fill(testPassword)
        await page.getByRole('button', { name: 'Utwórz konto', exact: true }).click()
        await expect(page).toHaveURL('/verify-email')
        await expect(page.getByRole('button', { name: 'Potwierdziłem adres', exact: true })).toBeEnabled()
      }
      const toggle = page.getByRole('button', { name: theme === 'light' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw', exact: true })
      if (await toggle.isVisible()) await toggle.click()
      await page.evaluate(() => document.fonts.ready)
      const { violations } = await new AxeBuilder({ page }).analyze()
      const screenshot = testInfo.outputPath(`${screen}-${theme}.png`)
      await page.screenshot({ path: screenshot, fullPage: true })
      await testInfo.attach(`${screen}-${theme}`, { path: screenshot, contentType: 'image/png' })
      await testInfo.attach('axe-violations', { body: JSON.stringify(violations), contentType: 'application/json' })
      expect(violations.filter(({ impact }) => impact && ['moderate', 'serious', 'critical'].includes(impact))).toEqual([])
    })
  }
}
