import type { BookingDetail } from '@repo/shared';

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function isHostUpcomingReservation(booking: BookingDetail): boolean {
  return booking.status === 'CONFIRMED' && new Date(booking.checkOut) >= startOfTodayUtc();
}

export function isHostPastReservation(booking: BookingDetail): boolean {
  if (booking.status === 'COMPLETED') {
    return true;
  }
  return booking.status === 'CONFIRMED' && new Date(booking.checkOut) < startOfTodayUtc();
}

export function splitHostReservations(bookings: BookingDetail[]): {
  upcoming: BookingDetail[];
  past: BookingDetail[];
} {
  const upcoming: BookingDetail[] = [];
  const past: BookingDetail[] = [];
  for (const booking of bookings) {
    if (isHostUpcomingReservation(booking)) {
      upcoming.push(booking);
      continue;
    }
    if (isHostPastReservation(booking)) {
      past.push(booking);
    }
  }
  return { upcoming, past };
}
