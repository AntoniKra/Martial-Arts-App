import AxeBuilder from '@axe-core/playwright'
import { block, continuousExercise, roundsExercise, workoutBreak, workoutPlan } from '../src/test/workoutBuilders'
import { test, expect } from './fixtures'

const instruction = 'Jab → prawy prosty → lewy hak na korpus'
const start = Date.parse('2026-11-03T10:00:00Z')

for (const theme of ['dark', 'light'] as const) {
  test(`player v6 fits the exercise, arc and controls in every phase in ${theme} theme`, async ({ app, page }, info) => {
    await app.open('/')
    await app.setTheme(theme)
    const exercise = { ...roundsExercise('exercise-1', 2, 60, 30), exerciseNameSnapshot: 'Praca na nogach', instruction }
    const nextExercise = { ...continuousExercise('exercise-2', 60), exerciseNameSnapshot: 'Walka z cieniem' }
    const plan = { ...workoutPlan([block('block-1', [exercise, workoutBreak('break-1', 30), nextExercise])]), nameSnapshot: 'Technika bokserska' }
    await app.seedPlan(plan)
    await app.open(`/workouts/${plan.id}`)
    await app.openPlayer()
    await page.clock.setFixedTime(new Date(start - 3_000))
    await page.evaluate(() => document.fonts.ready)

    const main = page.getByRole('main')
    const header = main.locator('header')
    const round = page.locator('.exercise-round-eyebrow')
    const heading = page.getByRole('heading', { level: 1 })
    const technique = page.locator('.exercise-technique')
    const arc = page.locator('.timer-wrap-2b')
    const timer = page.locator('.timer-digits')
    const phaseWord = page.locator('.arc-phase-opening')
    const next = page.locator('.player-next-step')
    const viewport = page.viewportSize()!
    const viewports = info.project.name === 'phone' ? [viewport, { width: 390, height: 844 }] : [viewport]
    const colors = theme === 'dark'
      ? { preparing: 'rgb(28, 32, 40)', work: 'rgb(84, 8, 21)', paused: 'rgb(19, 20, 24)', rest: 'rgb(28, 32, 40)', warning: 'rgb(92, 32, 11)' }
      : { preparing: 'rgb(237, 240, 245)', work: 'rgb(250, 230, 233)', paused: 'rgb(232, 232, 236)', rest: 'rgb(237, 240, 245)', warning: 'rgb(252, 238, 230)' }

    await expect(header).toContainText(plan.nameSnapshot)
    await expect(header.getByRole('button')).toHaveCount(1)
    await expect(header.locator('.player-step-progress')).toHaveCSS('font-size', '11px')
    await expect(header.getByRole('button', { name: 'Zakończ trening', exact: true }).locator('path')).toHaveAttribute('d', 'M19 12H5m7-7-7 7 7 7')
    await expect(round).toHaveText('Runda 1 z 2')
    await expect(round).toHaveCSS('font-size', '13px')
    await expect(heading).toHaveText(exercise.exerciseNameSnapshot)
    await expect(heading).toHaveCSS('font-size', '26px')
    await expect(technique).toHaveText(instruction)
    await expect(technique).toHaveCSS('-webkit-line-clamp', '2')
    await expect(next).toHaveCSS('font-size', '12.5px')
    await expect(next).toHaveCSS('line-height', '15.625px')
    await expect(next).toHaveCSS('-webkit-line-clamp', '2')
    await expect(page.locator('.round-dot')).toHaveCount(2)
    await expect(page.locator('.round-dot').first()).toHaveClass(/is-current/)
    await expect(page.locator('.arc-track')).toHaveAttribute('stroke-dasharray', '75 25')

    async function checkPhase(phase: keyof typeof colors, label: string) {
      await expect(main).toHaveAttribute('data-phase', phase)
      await expect(phaseWord).toHaveText(label)
      await expect(main).toHaveCSS('background-color', colors[phase])
      for (const size of viewports) {
        await page.setViewportSize(size)
        const small = size.width <= 360
        const arcSize = small ? '240px' : '260px'
        await expect(arc).toHaveCSS('width', arcSize)
        await expect(arc).toHaveCSS('height', arcSize)
        const singleDigit = phase === 'preparing'
        await expect(timer).toHaveCSS('font-size', singleDigit ? (small ? '96px' : '104px') : (small ? '76px' : '84px'))
        await expect(timer).toHaveCSS('font-weight', '800')
        await expect(timer).toHaveCSS('font-variant-numeric', 'tabular-nums')
        await expect(phaseWord).toHaveCSS('font-size', small ? '17px' : '19px')
        await expect(phaseWord).toHaveCSS('bottom', small ? '12px' : '14px')
        await expect(technique).toHaveCSS('font-size', small ? '22px' : '24px')
        const box = (await arc.boundingBox())!
        const digits = (await timer.boundingBox())!
        expect(digits.x).toBeGreaterThanOrEqual(box.x + box.width * 8 / 300)
        expect(digits.x + digits.width).toBeLessThanOrEqual(box.x + box.width * 292 / 300)
        const geometry = await page.evaluate(() => ({
          scrollY,
          scrollX,
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          overflowing: [...document.querySelectorAll('main div')].some((element) => element.scrollHeight > element.clientHeight + 1 && getComputedStyle(element).overflowY === 'auto'),
        }))
        expect(geometry).toEqual({ scrollY: 0, scrollX: 0, width: size.width, height: size.height, overflowing: false })
        const { violations } = await new AxeBuilder({ page }).analyze()
        expect(violations.filter(({ id, impact }) => id === 'color-contrast' || (impact && ['moderate', 'serious', 'critical'].includes(impact)))).toEqual([])
      }
    }

    await page.getByRole('button', { name: 'Rozpocznij trening', exact: true }).click()
    await expect(timer).toHaveText('10')
    await page.clock.setFixedTime(new Date(start))
    await expect(timer).toHaveText('7')
    await checkPhase('preparing', 'PRZYGOTUJ SIĘ')
    await page.getByRole('button', { name: 'Zacznij teraz', exact: true }).click()
    await checkPhase('work', 'PRACA')
    await expect(page.locator('.arc-progress')).toHaveAttribute('stroke-dasharray', '75 100')
    const nameBox = (await heading.boundingBox())!
    const techniqueBox = (await technique.boundingBox())!
    const arcBox = (await arc.boundingBox())!
    expect(Math.abs((nameBox.y + nameBox.height + arcBox.y) / 2 - (techniqueBox.y + techniqueBox.height / 2))).toBeLessThan(3)

    await page.clock.setFixedTime(new Date(start + 30_000))
    await expect(page.locator('.arc-progress')).toHaveAttribute('stroke-dasharray', '37.5 100')
    await page.getByRole('button', { name: 'Pauza', exact: true }).click()
    await checkPhase('paused', 'WSTRZYMANO')
    await expect(page.locator('.arc-progress')).toHaveAttribute('stroke-dasharray', '37.5 100')
    await page.getByRole('button', { name: 'Wznów', exact: true }).click()
    await page.clock.setFixedTime(new Date(start + 55_000))
    await checkPhase('warning', 'OSTATNIE SEKUNDY')
    await expect(page.locator('.diamond-shape-3b')).toHaveCSS('border-top-width', '2px')

    const goNext = page.getByRole('button', { name: 'Następny etap', exact: true })
    await goNext.click()
    await checkPhase('rest', 'ODPOCZYNEK')
    await expect(page.locator('.round-dot').first()).toHaveClass(/is-done/)
    await expect(page.locator('.round-dot').last()).toHaveClass(/is-current/)
    await goNext.click()
    await goNext.click()
    await checkPhase('rest', 'PRZERWA')
    await expect(page.locator('.round-dot')).toHaveCount(0)
    await goNext.click()
    await expect(heading).toHaveText(nextExercise.exerciseNameSnapshot)
    await expect(technique).toHaveText(nextExercise.exerciseNameSnapshot)
    await expect(next).toHaveText('Koniec treningu')
  })
}

test('player v6 fits long plan data and keeps clock digits within the arc', async ({ app, page }, info) => {
  await app.open('/')
  const exercise = {
    ...roundsExercise('long-rounds', 99, 86_400, 30),
    exerciseNameSnapshot: 'Rozbudowana kombinacja bokserska z pracą nóg na długim dystansie',
    instruction: instruction.repeat(6),
  }
  const plan = { ...workoutPlan([block('block-1', [exercise])]), nameSnapshot: 'Technika bokserska w długich rundach w pełnym wymiarze treningowym' }
  await app.seedPlan(plan)
  await app.open(`/workouts/${plan.id}`)
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.timer-digits')).toHaveText('1440:00')
  await expect(page.locator('.round-dot')).toHaveCount(99)
  await expect(page.locator('.exercise-technique')).toHaveText(exercise.instruction)
  const arc = (await page.locator('.timer-wrap-2b').boundingBox())!
  const digits = (await page.locator('.timer-digits').boundingBox())!
  expect(digits.x).toBeGreaterThanOrEqual(arc.x + arc.width * 8 / 300)
  expect(digits.x + digits.width).toBeLessThanOrEqual(arc.x + arc.width * 292 / 300)
  expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]))
    .toEqual([page.viewportSize()!.width, page.viewportSize()!.height])

  await page.clock.fastForward((86_400 - 3599) * 1000)
  const timer = page.locator('.timer-digits')
  await expect(timer).toHaveText('59:59')
  const viewport = page.viewportSize()!
  const viewports = info.project.name === 'phone' ? [viewport, { width: 390, height: 844 }] : [viewport]
  for (const size of viewports) {
    await page.setViewportSize(size)
    const circle = (await page.locator('.timer-svg-2b').boundingBox())!
    const digits = (await timer.boundingBox())!
    const ink = await timer.evaluate((element) => {
      const style = getComputedStyle(element)
      const canvas = document.createElement('canvas').getContext('2d')!
      canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const bounds = element.getBoundingClientRect()
      // All values use the same tabular width. Measure glyph height without the line box's whitespace.
      return ['00:00', element.textContent!].map((value) => {
        const glyphs = canvas.measureText(value)
        const baseline = bounds.top + (bounds.height + glyphs.fontBoundingBoxAscent - glyphs.fontBoundingBoxDescent) / 2
        return [baseline - glyphs.actualBoundingBoxAscent, baseline + glyphs.actualBoundingBoxDescent]
      })
    })
    const centerX = circle.x + circle.width / 2
    const centerY = circle.y + circle.height / 2
    // The track radius plus half its stroke is 142 in the 300-unit viewBox.
    const outerRadius = circle.width * 142 / 300
    for (const x of [digits.x, digits.x + digits.width]) {
      for (const y of ink.flat()) {
        expect(Math.hypot(x - centerX, y - centerY)).toBeLessThanOrEqual(outerRadius)
      }
    }
  }
})

test('player v6 respects reduced motion on phase changes and presses', async ({ app, page }) => {
  await app.createPlan('Ruch odtwarzacza')
  await app.openPlayer()
  await app.freezeClock()
  await app.startWorkout()
  const main = page.getByRole('main')
  const shape = page.locator('.diamond-shape-3b')
  const pause = page.getByRole('button', { name: 'Pauza', exact: true })
  for (const reducedMotion of ['reduce', 'no-preference'] as const) {
    await page.emulateMedia({ reducedMotion })
    const reduced = reducedMotion === 'reduce'
    await expect(main).toHaveCSS('transition-property', reduced ? 'none' : 'background-color')
    await expect(main).toHaveCSS('transition-duration', reduced ? '0s' : '0.3s')
    await expect(page.locator('.arc-progress')).toHaveCSS('transition-property', reduced ? 'none' : 'stroke-dasharray, stroke')
    await pause.hover()
    await page.mouse.down()
    try {
      await expect(shape).toHaveCSS('transform', reduced
        ? 'matrix(0.707107, 0.707107, -0.707107, 0.707107, 0, 0)'
        : 'matrix(0.671751, 0.671751, -0.671751, 0.671751, 0, 0)')
    } finally {
      await page.mouse.move(0, 0)
      await page.mouse.up()
    }
  }
})
