import { createElement, type ChangeEvent } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { MultiChoiceChip } from './MultiChoiceChip'
import { Switch } from './Switch'
import { CollapsibleCard } from './CollapsibleCard'

it.each([true, false])('keeps a chip as a focusable native checkbox, checked=%s', (checked) => {
  const html = renderToStaticMarkup(createElement(MultiChoiceChip, { checked, onChange: () => {}, children: 'Technika', 'aria-controls': 'technique' }))
  expect(html).toContain('type="checkbox"')
  expect(html.includes('checked=""')).toBe(checked)
  expect(html).toContain(`aria-checked="${checked}"`)
  expect(html).toContain('aria-controls="technique"')
  expect(html).toContain('aria-hidden="true" class="multi-chip-mark"')
  expect(html).not.toContain('tabindex="-1"')
})

it.each([true, false])('keeps existing filter buttons keyboard operable with aria-pressed=%s', (pressed) => {
  const onClick = vi.fn()
  const control = MultiChoiceChip({ as: 'button', 'aria-pressed': pressed, onClick, children: 'Technika' })
  const html = renderToStaticMarkup(control)
  expect(html).toContain('<button')
  expect(html).toContain('type="button"')
  expect(html).toContain(`aria-pressed="${pressed}"`)
  expect(html).not.toContain('tabindex="-1"')
  expect(control.props.onKeyDown).toBeUndefined()
  control.props.onClick()
  expect(onClick).toHaveBeenCalledOnce()
})

it.each([MultiChoiceChip, Switch])('forwards the native change event and disabled state', (Control) => {
  const onChange = vi.fn()
  const control = Control({ checked: false, disabled: true, onChange, children: 'Opcja' })
  const html = renderToStaticMarkup(control)
  expect(html).toContain('disabled=""')
  // Native inputs own Space handling; the callback receives their unchanged event.
  const event = { target: { checked: true } } as ChangeEvent<HTMLInputElement>
  const input = Control === MultiChoiceChip ? control.props.children[0] : control.props.children[1].props.children[0]
  expect(input.props.onKeyDown).toBeUndefined()
  input.props.onChange(event)
  expect(onChange).toHaveBeenCalledExactlyOnceWith(event)
})

it.each([true, false])('exposes the switch through a native checkbox and switch role, checked=%s', (checked) => {
  const html = renderToStaticMarkup(createElement(Switch, { checked, onChange: () => {}, children: 'Zgoda', 'aria-describedby': 'notice' }))
  expect(html).toContain('type="checkbox" role="switch"')
  expect(html.includes('checked=""')).toBe(checked)
  expect(html).toContain('aria-describedby="notice"')
  expect(html).not.toContain('tabindex="-1"')
  expect(html).toContain('aria-hidden="true" class="switch-track"')
})

it('starts collapsed with a native keyboard button linked to mounted hidden content', () => {
  const html = renderToStaticMarkup(createElement(CollapsibleCard, { title: 'Dane', description: '12 tygodni', children: 'Szczegóły' }))
  expect(html).toContain('<button type="button"')
  expect(html).toContain('aria-expanded="false"')
  const id = html.match(/aria-controls="([^"]+)"/)?.[1]
  expect(id).toBeTruthy()
  expect(html).toContain(`id="${id}" hidden=""`)
  expect(html).toContain('12 tygodni')
  expect(html).toContain(`aria-describedby="${id}-description"`)
  expect(html).toContain('Szczegóły')
  expect(html).not.toContain('<details')
})
