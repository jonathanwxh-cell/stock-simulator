export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isPositiveWholeNumber(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value > 0;
}

export function isPositiveCurrency(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
