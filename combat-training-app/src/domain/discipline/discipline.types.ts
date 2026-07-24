export type DisciplineKey = 'boxing' | 'kickboxing' | 'muay_thai' | 'k1' | 'mma_striking'

export interface DisciplineDefinition {
  key: DisciplineKey
  namePl: string
  nameEn?: string
}
