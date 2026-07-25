import type { DisciplineKey } from '@/domain/discipline/discipline.types'

export const DISCIPLINE_LABELS_PL: Record<DisciplineKey, string> = {
  boxing: 'Boks',
  kickboxing: 'Kickboxing',
  muay_thai: 'Muay Thai',
  k1: 'K-1',
  mma_striking: 'MMA stójka',
}

export function getDisciplineLabelPl(disciplineKey: DisciplineKey): string {
  return DISCIPLINE_LABELS_PL[disciplineKey]
}
