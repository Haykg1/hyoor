export function nightCount(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
