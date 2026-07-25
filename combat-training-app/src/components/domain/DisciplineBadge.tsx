import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'

const disciplineColors: Record<DisciplineKey, string> = {
  boxing: 'text-[#E8A030]',
  kickboxing: 'text-[#6BAF8A]',
  muay_thai: 'text-crimson',
  k1: 'text-[#7B9FD4]',
  mma_striking: 'text-muted',
}

interface DisciplineBadgeProps {
  disciplineKey: DisciplineKey
  className?: string
}

export function DisciplineBadge({ disciplineKey, className = '' }: DisciplineBadgeProps) {
  return (
    <span
      className={`font-display text-[10px] font-semibold uppercase tracking-[0.12em] ${disciplineColors[disciplineKey]} ${className}`}
    >
      {getDisciplineLabelPl(disciplineKey)}
    </span>
  )
}
