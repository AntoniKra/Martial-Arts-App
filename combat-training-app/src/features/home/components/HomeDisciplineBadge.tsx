import type { DisciplineKey } from '@/domain/discipline/discipline.types'

const disciplineColors: Record<DisciplineKey, string> = {
  boxing: 'text-[#E8A030]',
  kickboxing: 'text-[#6BAF8A]',
  muay_thai: 'text-crimson',
  k1: 'text-[#7B9FD4]',
  mma_striking: 'text-muted',
}

interface HomeDisciplineBadgeProps {
  disciplineKey: DisciplineKey
  labelPl: string
}

export function HomeDisciplineBadge({ disciplineKey, labelPl }: HomeDisciplineBadgeProps) {
  return (
    <span
      className={`font-display text-[10px] font-semibold uppercase tracking-[0.12em] ${disciplineColors[disciplineKey]}`}
    >
      {labelPl}
    </span>
  )
}
