import {
  HOST_CALENDAR_EDITABLE_DAYS_AHEAD,
  isIsoDateInEditableWindow,
  maxEditableIsoDate,
  todayIsoLocal,
} from '@repo/shared';

export function isLocalIsoEditable(iso: string, todayIso: string = todayIsoLocal()): boolean {
  return isIsoDateInEditableWindow(iso, todayIso, HOST_CALENDAR_EDITABLE_DAYS_AHEAD);
}

export function endOfEditableLocalDay(todayIso: string = todayIsoLocal()): Date {
  const maxIso = maxEditableIsoDate(todayIso, HOST_CALENDAR_EDITABLE_DAYS_AHEAD);
  const [y, m, d] = maxIso.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 23, 59, 59, 999);
}

export function startOfLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
