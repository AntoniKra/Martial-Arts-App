export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3 py-2 text-[12px] tracking-[0.06em]',
  md: 'min-h-12 px-4 py-3 text-[13px] tracking-[0.06em]',
  lg: 'min-h-14 px-6 py-4 text-[14px] tracking-[0.08em]',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-crimson text-on-accent hover:bg-crimson-hi active:bg-crimson',
  secondary: 'bg-elevated text-ink border border-bd hover:bg-bd active:bg-elevated',
  ghost: 'text-muted hover:text-ink active:text-ink',
  danger: 'bg-crimson/10 text-crimson-ink border border-crimson/30 hover:bg-crimson/20 active:bg-crimson/10',
}

interface ButtonClassNameOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  disabled?: boolean
}

export function getButtonClassName({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
}: ButtonClassNameOptions = {}): string {
  return [
    'inline-flex items-center justify-center gap-2 font-display font-semibold select-none transition-colors',
    disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
    sizeClasses[size],
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')
}
