import type { DisciplineKey } from '@/domain/discipline/discipline.types'
import { getDisciplineLabelPl } from '@/domain/discipline/disciplineLabels'

const disciplineColors: Record<DisciplineKey, string> = {
  boxing: 'text-discipline-boxing',
  kickboxing: 'text-discipline-kickboxing',
  muay_thai: 'text-discipline-muay-thai',
  k1: 'text-discipline-k1',
  mma_striking: 'text-discipline-mma-striking',
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
