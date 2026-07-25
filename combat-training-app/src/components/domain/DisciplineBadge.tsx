import type { DisciplineKey } from '@/domain/discipline/discipline.types'

export const DISCIPLINE_LABELS_PL: Record<DisciplineKey, string> = {
  boxing: 'Boks',
  kickboxing: 'Kickboxing',
  muay_thai: 'Muay Thai',
  k1: 'K-1',
  mma_striking: 'MMA stójka',
}

const disciplineColors: Record<DisciplineKey, string> = {
  boxing: 'text-[#E8A030]',
  kickboxing: 'text-[#6BAF8A]',
  muay_thai: 'text-crimson',
  k1: 'text-[#7B9FD4]',
  mma_striking: 'text-muted',
}

export function getDisciplineLabelPl(disciplineKey: DisciplineKey): string {
  return DISCIPLINE_LABELS_PL[disciplineKey]
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
      {DISCIPLINE_LABELS_PL[disciplineKey]}
    </span>
  )
}
