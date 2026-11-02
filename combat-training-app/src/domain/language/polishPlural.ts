export function polishPlural(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const abs = Math.abs(count)
  const lastTwo = abs % 100
  const lastOne = abs % 10

  if (count === 1) {
    return one
  }

  if (lastTwo >= 12 && lastTwo <= 14) {
    return many
  }

  if (lastOne >= 2 && lastOne <= 4) {
    return few
  }

  return many
}

export function formatPolishCount(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  return `${count} ${polishPlural(count, one, few, many)}`
}
