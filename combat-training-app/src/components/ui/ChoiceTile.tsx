import type { ReactNode } from 'react'

export function ChoiceTile({ name, value, checked, onChange, children, variant = 'tile', className = '', ariaLabel, showCheck = true }: {
  name: string; value: string | number; checked: boolean; onChange: () => void; children: ReactNode
  variant?: 'tile' | 'text'; className?: string; ariaLabel?: string; showCheck?: boolean
}) {
  return <label className={`choice-option ${variant === 'text' ? 'is-text' : 'is-tile'} ${className}`}>
    <input type="radio" name={name} value={value} checked={checked} onChange={onChange} aria-label={ariaLabel} className="choice-radio" />
    <span className="choice-face">
      {children}
      {showCheck && <span aria-hidden="true" className="choice-check">✓</span>}
    </span>
  </label>
}
