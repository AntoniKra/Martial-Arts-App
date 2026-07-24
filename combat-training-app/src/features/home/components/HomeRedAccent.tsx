interface HomeRedAccentProps {
  className?: string
}

export function HomeRedAccent({ className = '' }: HomeRedAccentProps) {
  return <div aria-hidden="true" className={`h-px bg-crimson ${className}`} />
}
