interface SkipBackIconProps {
  className?: string
}

export function SkipBackIcon({ className = '' }: SkipBackIconProps) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="19,20 9,12 19,4" fill="currentColor" stroke="none" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  )
}
