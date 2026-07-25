interface RedAccentProps {
  className?: string
}

export function RedAccent({ className = '' }: RedAccentProps) {
  return <div aria-hidden="true" className={`h-px bg-crimson ${className}`} />
}
