/** Formats a booking calendar date (YYYY-MM-DD) without timezone shift. */
export function formatBookingDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
): string {
  const datePart = iso.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    ...options,
    timeZone: 'UTC',
  });
}
