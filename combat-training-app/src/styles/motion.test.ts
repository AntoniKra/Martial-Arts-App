import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import { ChoiceTile } from '@/components/ui/ChoiceTile'
import { MultiChoiceChip } from '@/components/ui/MultiChoiceChip'
import { Switch } from '@/components/ui/Switch'
import { CollapsibleCard } from '@/components/ui/CollapsibleCard'
import { ProfileDisclosure } from '@/features/profile/ProfileDisclosure'
import { WeekDayIndicator } from '@/components/domain/WeekDayIndicator'
import { ScheduleStatusBadge } from '@/features/week-plan/ScheduleStatusBadge'

const css = postcss.parse(readFileSync(new URL('./index.css', import.meta.url), 'utf8'))
const playerCss = postcss.parse(readFileSync(new URL('../features/workout-player/components/workoutPlayer.css', import.meta.url), 'utf8'))
const tokens = {
  '--motion-fast': '100ms', '--motion-med': '250ms', '--motion-slow': '300ms',
  '--ease-standard': 'cubic-bezier(0.2,0,0,1)', '--ease-out': 'cubic-bezier(0,0,0,1)', '--ease-in': 'cubic-bezier(0.3,0,1,1)',
}

describe('motion foundation', () => {
  it.each(['dark', 'light'])('inherits the same motion tokens in %s mode', (theme) => {
    const resolved: Record<string, string> = {}
    css.walkRules((rule) => {
      if (rule.selectors.includes(':root') || rule.selectors.includes(`:root[data-theme='${theme}']`)) {
        rule.walkDecls((declaration) => { resolved[declaration.prop] = declaration.value })
      }
    })
    for (const [token, value] of Object.entries(tokens)) expect(resolved[token]).toBe(value)
  })

  it('uses tokens for every explicit transition and animation duration', () => {
    for (const stylesheet of [css, playerCss]) {
      stylesheet.walkDecls(/^(transition|animation)(-duration)?$/, (declaration) => {
        expect(declaration.value).not.toMatch(/\d+m?s\b/)
        if (declaration.value !== 'none') expect(declaration.value).toMatch(/var\(--motion-(fast|med|slow)\)/)
      })
    }
  })

  it('allows width only for the wellbeing progress indicator (#206) and uses only transform/opacity keyframes', () => {
    css.walkDecls(/^transition/, (declaration) => {
      const rule = declaration.parent
      if (rule?.type === 'rule' && rule.selector === '.wellbeing-form-body .layout-c-fill') {
        expect(declaration.value).toBe('width calc(var(--motion-fast) * 2) ease')
        expect(rule.parent).toMatchObject({ type: 'atrule', name: 'media', params: '(prefers-reduced-motion: no-preference)' })
        return
      }
      expect(declaration.value).not.toMatch(/\b(all|width|height|top|left|padding|flex-grow|box-shadow|filter)\b/)
    })
    css.walkAtRules('keyframes', (animation) => {
      animation.walkDecls((declaration) => expect(['transform', 'opacity']).toContain(declaration.prop))
    })
    css.walkDecls(/^(animation|transition)-delay$/, (declaration) => expect(declaration.value).toBe('0s'))
  })

  it('keeps motion attached to semantic native controls and mounted disclosure content', () => {
    const tile = renderToStaticMarkup(createElement(ChoiceTile, { name: 'test', value: 'one', checked: false, onChange() {}, children: 'One' }))
    expect(tile).toContain('class="choice-face"')
    expect(tile).toContain('aria-checked="false"')
    const chip = renderToStaticMarkup(createElement(MultiChoiceChip, { checked: true, onChange() {}, children: 'Two' }))
    expect(chip).toContain('class="multi-chip-face"')
    expect(chip).toContain('aria-checked="true"')
    expect(renderToStaticMarkup(createElement(Switch, { children: 'Three' }))).toContain('class="switch-track"')
    const disclosure = renderToStaticMarkup(createElement(CollapsibleCard, { title: 'Details', children: 'Content' }))
    expect(disclosure).toContain('class="disclosure-chevron"')
    expect(disclosure).toContain('hidden="" class="disclosure-content"')
    const profile = renderToStaticMarkup(createElement(ProfileDisclosure, { title: 'Masa ciała', summary: '80 kg', open: false, onToggle() {}, children: 'Content' }))
    expect(profile).toContain('class="disclosure-chevron"')
  })

  it('does not animate initial badges or day indicators', () => {
    for (const status of ['planned', 'done', 'omitted'] as const) {
      expect(renderToStaticMarkup(createElement(ScheduleStatusBadge, { status }))).not.toContain('motion-status-change')
    }
    expect(renderToStaticMarkup(createElement(WeekDayIndicator, { state: 'done', name: 'Monday', short: 'M' }))).not.toContain('motion-status-change')
  })
})
