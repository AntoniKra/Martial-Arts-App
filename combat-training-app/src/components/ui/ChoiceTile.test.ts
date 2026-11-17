import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { ChoiceTile } from './ChoiceTile'

it.each([true, false])('exposes selection through a visually hidden native radio: %s', (checked) => {
  const html = renderToStaticMarkup(createElement(ChoiceTile, {
    name: 'correction', value: 'better', checked, onChange: () => {}, children: 'Rzadziej',
  }))
  expect(html).toContain('type="radio"')
  expect(html).toContain('class="choice-radio"')
  expect(html.includes('checked=""')).toBe(checked)
  expect(html).toContain('choice-check')
  expect(html).not.toContain('aria-hidden="true" type="radio"')
})

it('keeps the shared native group and default tab order for browser arrow-key navigation', () => {
  const html = renderToStaticMarkup(createElement('fieldset', {}, ...['better', 'same', 'notChecked'].map((value) =>
    createElement(ChoiceTile, { key: value, name: 'correction', value, checked: value === 'same', onChange: () => {}, children: value }))))
  expect(html.match(/name="correction"/g)).toHaveLength(3)
  expect(html.match(/checked=""/g)).toHaveLength(1)
  expect(html).not.toContain('tabindex')
  expect(html).not.toContain('role="button"')
})

it('delegates a native change without rewriting the selected key', () => {
  const change = vi.fn()
  const tile = ChoiceTile({ name: 'correction', value: 'notChecked', checked: false, onChange: change, children: 'Nie sprawdzałem', variant: 'text' })
  const input = tile.props.children[0]
  expect(input.props.value).toBe('notChecked')
  input.props.onChange()
  expect(change).toHaveBeenCalledOnce()
})
