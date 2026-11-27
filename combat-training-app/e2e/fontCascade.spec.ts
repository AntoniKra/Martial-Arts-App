import type { Locator } from '@playwright/test'

import { block, roundsExercise, workoutPlan } from '../src/test/workoutBuilders'
import { test, expect } from './fixtures'

async function typography(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return { size: style.fontSize, weight: style.fontWeight, family: style.fontFamily }
  })
}

for (const theme of ['dark', 'light'] as const) {
  test(`uses utility fonts, mobile field sizes and touch targets in ${theme} theme`, async ({ app, page }, testInfo) => {
    test.setTimeout(60_000)
    const samples: Record<string, Awaited<ReturnType<typeof typography>>> = {}
    const screens: {
      name: string
      controls: { name: string; field: boolean; size: number; height: number; minHeight: string }[]
    }[] = []
    const capture = async (name: string) => {
      await page.evaluate(() => document.fonts.ready)
      const controls = await page.locator('button, input:not([type="radio"]):not([type="checkbox"]), select, textarea')
        .evaluateAll((elements) => elements.filter((element) => element.getClientRects().length > 0).map((element) => {
          const style = getComputedStyle(element)
          return {
            name: element.getAttribute('aria-label') || element.id || element.textContent?.trim() || element.tagName,
            field: element.tagName !== 'BUTTON',
            size: Number.parseFloat(style.fontSize),
            height: element.getBoundingClientRect().height,
            minHeight: style.minHeight,
          }
        }))
      screens.push({ name, controls })
      if (process.env.CAPTURE_SCREENSHOTS === '1' && testInfo.project.name === 'phone') {
        const path = testInfo.outputPath(`${name}-${theme}.png`)
        await page.screenshot({ path })
        await testInfo.attach(`${name}-${theme}`, { path, contentType: 'image/png' })
      }
    }
    const focusOutline = async (locator: Locator) => {
      await page.keyboard.press('Tab')
      await locator.focus()
      // Read the settled focus style after the browser applies :focus-visible and transitions.
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      return locator.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          visible: element.matches(':focus-visible'),
          style: style.outlineStyle,
          width: style.outlineWidth,
          offset: style.outlineOffset,
          color: style.outlineColor,
        }
      })
    }

    await page.goto('/login')
    await app.setTheme(theme)
    samples.primary = await typography(page.getByRole('button', { name: 'Zaloguj się', exact: true }))
    samples.email = await typography(page.getByLabel('Adres e-mail', { exact: true }))
    const loginFocus = await focusOutline(page.getByLabel('Adres e-mail', { exact: true }))
    await capture('login')

    await app.open('/')
    const exercise = { ...roundsExercise('exercise-1', 2, 60, 30), exerciseNameSnapshot: 'Praca na nogach' }
    const plan = { ...workoutPlan([block('block-1', [exercise])]), nameSnapshot: 'Technika bokserska' }
    await app.seedPlan(plan)
    await app.open('/')
    await expect(page.getByRole('heading', { name: plan.nameSnapshot, exact: true })).toBeVisible()
    await capture('home')

    await app.open('/workouts/new')
    await page.getByRole('radio', { name: 'Boks', exact: true }).check()
    await capture('builder')
    await page.getByRole('button', { name: 'Zamknij', exact: true }).click()
    await page.getByRole('group', { name: 'Pierwszy blok', exact: true }).getByRole('button', { name: 'Technika', exact: true }).click()
    const addExercise = page.getByRole('button', { name: 'Dodaj ćwiczenie do bloku 1 — Technika', exact: true })
    // The first block moves focus to its "Dodaj ćwiczenie" on the next frame; measuring before that lands loses focus.
    await expect(addExercise).toBeFocused()
    const builderFocus = await focusOutline(addExercise)
    await addExercise.click()
    await capture('library')
    await page.getByRole('radio', { name: 'Własne ćwiczenie', exact: true }).click()
    await capture('custom-exercise')
    await page.getByRole('radio', { name: 'Biblioteka', exact: true }).click()
    await page.getByRole('button', { name: 'Lewy prosty → prawy prosty', exact: true }).click()
    samples.roundFormat = await typography(page.getByText('5 × 3:00', { exact: true }))
    await capture('configuration')
    await page.getByRole('button', { name: /^Rundy: / }).click()
    const roundInput = page.getByRole('textbox', { name: 'Rundy', exact: true })
    samples.roundCount = await typography(roundInput)
    await capture('configuration-round-count')
    await roundInput.press('Escape')
    await page.getByRole('radio', { name: 'Ciągłe', exact: true }).click()
    await capture('configuration-continuous')
    await page.getByRole('textbox', { name: 'Notatki do ćwiczenia (opcjonalnie)', exact: true }).scrollIntoViewIfNeeded()
    await capture('configuration-instruction')
    await page.getByRole('button', { name: 'Zatwierdź ćwiczenie', exact: true }).click()
    await page.getByRole('button', { name: 'Dodaj przerwę do bloku 1 — Technika', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Przerwa', exact: true })).toBeVisible()
    await capture('builder-break')

    await app.open(`/workouts/${plan.id}`)
    await expect(page.getByRole('heading', { name: plan.nameSnapshot, exact: true })).toBeVisible()
    await capture('plan-details')
    await app.openPlayer()
    await app.freezeClock()
    await app.startWorkout()
    await page.getByRole('button', { name: 'Zakończ trening', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Zakończyć trening?', exact: true })
    await expect(dialog).toBeVisible()
    samples.exitSkip = await typography(dialog.getByRole('button', { name: /Pomiń resztę ćwiczenia/ }))
    samples.exitEarly = await typography(dialog.getByRole('button', { name: 'Zakończ i zapisz', exact: true }))
    samples.exitDiscard = await typography(dialog.getByRole('button', { name: /Porzuć/ }))
    samples.exitReturn = await typography(dialog.getByRole('button', { name: 'Wróć do treningu', exact: true }))
    await capture('player-exit')
    await dialog.getByRole('button', { name: 'Wróć do treningu', exact: true }).click()
    await page.clock.fastForward(150_000)
    await app.expectWorkoutSaved()
    samples.summaryDone = await typography(page.getByRole('button', { name: 'Zapisz oceny', exact: true }))
    await capture('completed')

    await app.open('/workouts')
    await expect(page.getByRole('link', { name: 'Zobacz plan', exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Postęp', exact: true }).click()
    samples.plansSelected = await typography(page.getByRole('radio', { name: 'Wykresy', exact: true }))
    samples.historyUnselected = await typography(page.getByRole('radio', { name: 'Historia', exact: true }))
    await capture('plans')
    await page.getByRole('radio', { name: 'Historia', exact: true }).click()
    await page.getByRole('article').getByRole('button', { name: /Szczegóły wpisu/ }).first().click()
    const note = page.getByRole('button', { name: 'Dodaj notatkę', exact: true })
    await expect(note).toBeVisible()
    samples.plansUnselected = await typography(page.getByRole('radio', { name: 'Wykresy', exact: true }))
    samples.historySelected = await typography(page.getByRole('radio', { name: 'Historia', exact: true }))
    samples.addNote = await typography(note)
    await capture('history')
    await note.scrollIntoViewIfNeeded()
    await capture('history-note-action')
    await note.click()
    await page.getByRole('textbox', { name: 'Notatka', exact: true }).scrollIntoViewIfNeeded()
    await capture('history-note-editor')

    if (process.env.CAPTURE_SCREENSHOTS === '1') await testInfo.attach('font-cascade-measurements', {
      body: JSON.stringify({ viewport: page.viewportSize(), theme, samples, screens, focus: { loginFocus, builderFocus } }, null, 2),
      contentType: 'application/json',
    })

    for (const screen of screens) {
      for (const control of screen.controls) {
        if (control.field) expect(control.size, `${screen.name}: ${control.name}`).toBeGreaterThanOrEqual(16)
        else expect(control.height, `${screen.name}: ${control.name} (min-height ${control.minHeight})`).toBeGreaterThanOrEqual(44)
      }
    }
    const display = '"Archivo Variable", system-ui, -apple-system, sans-serif'
    expect(samples.primary).toEqual({ size: '13px', weight: '600', family: display })
    const body = '"Inter Variable", system-ui, -apple-system, sans-serif'
    expect(samples.exitEarly).toEqual({ size: '13px', weight: '600', family: body })
    expect(samples.summaryDone).toEqual({ size: '14px', weight: '800', family: display })
    expect(samples.exitSkip).toEqual({ size: '13px', weight: '600', family: body })
    expect(samples.exitDiscard).toEqual({ size: '12.5px', weight: '600', family: body })
    expect(samples.exitReturn).toEqual({ size: '14px', weight: '800', family: display })
    for (const key of ['plansSelected', 'historySelected', 'plansUnselected', 'historyUnselected']) {
      expect(samples[key], key).toEqual({ size: '12px', weight: '600', family: display })
    }
    expect(samples.addNote).toEqual({ size: '11px', weight: '700', family: display })
    expect(samples.roundFormat).toEqual({ size: '13px', weight: '800', family: display })
    expect(samples.roundCount).toEqual({ size: '22px', weight: '800', family: display })
    expect(samples.email.size).toBe('16px')
    const color = theme === 'dark' ? 'rgb(239, 93, 110)' : 'rgb(181, 18, 43)'
    for (const outline of [loginFocus, builderFocus]) {
      expect(outline).toEqual({ visible: true, style: 'solid', width: '2px', offset: '2px', color })
    }
  })
}
