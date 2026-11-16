import { scaleValueFromKey, scaleValueFromPosition, stepScaleValue } from '@/components/scaleValue'

export function stepRpeValue(value: number | null, step: -1 | 1): number {
  return stepScaleValue(value, step, 0, 10)
}

export function rpeValueFromPosition(position: number, left: number, width: number): number | null {
  return scaleValueFromPosition(position, left, width, 0, 10)
}

export function rpeValueFromKey(value: number | null, key: string): number | null {
  return scaleValueFromKey(value, key, 0, 10)
}
