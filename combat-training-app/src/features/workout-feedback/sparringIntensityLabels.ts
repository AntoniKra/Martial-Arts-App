import type { SparringIntensity } from '@/domain/workout/workout.types'

export const sparringIntensityLabels: Record<SparringIntensity, string> = {
  light: 'Lekki — luźna wymiana, ciosy bez siły',
  technical: 'Techniczny — kontrolowana siła, praca nad konkretnymi elementami',
  hard: 'Twardy — pełne tempo i siła, jak w walce',
}
