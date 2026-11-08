import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { getButtonClassName, type ButtonVariant, type ButtonSize } from './buttonStyles'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

function LoadingSpinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 shrink-0 rounded-[1px] border-2 border-current border-r-transparent animate-spin"
    />
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  'aria-busy': ariaBusyProp,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  const ariaBusy = loading ? true : ariaBusyProp

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={ariaBusy}
      className={getButtonClassName({ variant, size, className, disabled: isDisabled })}
    >
      {loading ? <LoadingSpinner /> : null}
      <span className={loading ? 'opacity-80' : undefined}>{children}</span>
    </button>
  )
}
