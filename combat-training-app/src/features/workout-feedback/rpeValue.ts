export function stepRpeValue(value: number | null, step: -1 | 1): number {
  return value === null ? 5 : Math.max(0, Math.min(10, Math.round(value) + step))
}

export function rpeValueFromPosition(position: number, left: number, width: number): number | null {
  if (!Number.isFinite(position) || !Number.isFinite(left) || !Number.isFinite(width) || width <= 0) return null
  return Math.max(0, Math.min(10, Math.floor((position - left) / width * 11)))
}

export function rpeValueFromKey(value: number | null, key: string): number | null {
  switch (key) {
    case 'Home': return 0
    case 'End': return 10
    case 'ArrowRight':
    case 'ArrowUp': return stepRpeValue(value, 1)
    case 'ArrowLeft':
    case 'ArrowDown': return stepRpeValue(value, -1)
    default: return null
  }
}
