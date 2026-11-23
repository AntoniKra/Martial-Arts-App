import type { ReactNode } from 'react'

export function ChoiceTile({ name, value, checked, onChange, children, variant = 'tile', className = '', ariaLabel }: {
  name: string; value: string | number; checked: boolean; onChange: () => void; children: ReactNode
  variant?: 'tile' | 'text'; className?: string; ariaLabel?: string
}) {
  return <label className={`choice-option ${variant === 'text' ? 'is-text' : 'is-tile'} ${className}`}>
    <input type="radio" name={name} value={value} checked={checked} onChange={onChange} aria-checked={checked} aria-label={ariaLabel} className="choice-radio" />
    <span className="choice-face">{children}</span>
  </label>
}
