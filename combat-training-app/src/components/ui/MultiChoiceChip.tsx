import type { ComponentProps, ReactNode } from 'react'

type Props = { children: ReactNode } & (
  | ({ as?: 'input' } & Omit<ComponentProps<'input'>, 'type' | 'children'>)
  | ({ as: 'button' } & Omit<ComponentProps<'button'>, 'type' | 'children'>)
)

export function MultiChoiceChip({ children, className = '', ...props }: Props) {
  if (props.as === 'button') {
    const { as: _as, ...buttonProps } = props
    return <button {...buttonProps} type="button" className={`multi-chip-button ${className}`}>
      <span aria-hidden="true" className="multi-chip-mark" />{children}
    </button>
  }
  const { as: _as, checked, ...inputProps } = props
  return <label className={`multi-chip ${className}`}>
    <input {...inputProps} type="checkbox" checked={checked} aria-checked={checked} className="control-input" />
    <span className="multi-chip-face"><span aria-hidden="true" className="multi-chip-mark" />{children}</span>
  </label>
}
