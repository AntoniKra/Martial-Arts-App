interface PlayIconProps {
  className?: string
}

export function PlayIcon({ className = '' }: PlayIconProps) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}
