import { MoonIcon } from '@/components/icons/MoonIcon'
import { SunIcon } from '@/components/icons/SunIcon'
import { useTheme } from '@/features/theme/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      className="inline-flex min-h-touch min-w-touch items-center justify-center border border-bd bg-surface px-3 text-muted transition-colors hover:border-muted/60 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      <span className="sr-only">{label}</span>
    </button>
  )
}
