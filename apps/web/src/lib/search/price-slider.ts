export function priceSliderMax(currency: string | undefined): number {
  return currency === 'AMD' || !currency ? 3_00_000 : 5_000;
}

export function priceSliderStep(currency: string | undefined): number {
  return currency === 'AMD' || !currency ? 500 : 1;
}
