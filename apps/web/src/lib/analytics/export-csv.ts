import type { HostAnalyticsResponse } from '@repo/shared';

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildHostAnalyticsCsv(data: HostAnalyticsResponse): string {
  const lines: string[] = [];
  lines.push('Section,Key,Value');
  lines.push(`Period,from,${escapeCsv(data.period.from)}`);
  lines.push(`Period,to,${escapeCsv(data.period.to)}`);
  lines.push(`Period,preset,${escapeCsv(data.period.preset)}`);
  lines.push(`Meta,propertyId,${escapeCsv(data.propertyId ?? 'all')}`);
  lines.push(`KPI,ADR,${escapeCsv(data.kpis.adr.value)}`);
  lines.push(`KPI,RevPAR,${escapeCsv(data.kpis.revpar.value)}`);
  lines.push(`KPI,NightsBooked,${escapeCsv(data.kpis.nightsBooked.value)}`);
  lines.push(`KPI,CancellationRate,${escapeCsv(data.kpis.cancellationRate.value)}`);
  const currency = data.settlementCurrency ?? 'USD';
  lines.push(`Meta,settlementCurrency,${escapeCsv(currency)}`);
  lines.push('');
  lines.push(`Month,Earnings${currency}`);
  for (const row of data.monthlyEarnings) {
    lines.push(`${escapeCsv(row.month)},${escapeCsv(row.earnings)}`);
  }
  lines.push('');
  lines.push('Month,HostOccupancyPct,MarketOccupancyPct');
  for (const row of data.occupancyTrend) {
    lines.push(`${escapeCsv(row.month)},${escapeCsv(row.hostPct)},${escapeCsv(row.marketPct)}`);
  }
  lines.push('');
  lines.push(`Rank,Country,Bookings,Nights,Revenue${currency}`);
  data.guestOrigins.forEach((row, index) => {
    lines.push(
      `${index + 1},${escapeCsv(row.country)},${escapeCsv(row.bookings)},${escapeCsv(row.nights)},${escapeCsv(row.revenue)}`,
    );
  });
  return lines.join('\n');
}

export function downloadHostAnalyticsCsv(data: HostAnalyticsResponse, filename: string): void {
  const csv = buildHostAnalyticsCsv(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
