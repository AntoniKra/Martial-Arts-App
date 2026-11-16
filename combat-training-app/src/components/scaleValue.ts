export function stepScaleValue(value: number | null, step: -1 | 1, min: number, max: number): number {
  return value === null ? Math.round((min + max) / 2) : Math.max(min, Math.min(max, Math.round(value) + step))
}

export function scaleValueFromPosition(position: number, left: number, width: number, min: number, max: number): number | null {
  if (!Number.isFinite(position) || !Number.isFinite(left) || !Number.isFinite(width) || width <= 0) return null
  return Math.max(min, Math.min(max, min + Math.floor((position - left) / width * (max - min + 1))))
}

export function scaleValueFromKey(value: number | null, key: string, min: number, max: number): number | null {
  switch (key) {
    case 'Home': return min
    case 'End': return max
    case 'ArrowRight':
    case 'ArrowUp': return stepScaleValue(value, 1, min, max)
    case 'ArrowLeft':
    case 'ArrowDown': return stepScaleValue(value, -1, min, max)
    default: return null
  }
}
