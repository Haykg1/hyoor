import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type {
  HostAnalyticsGuestOrigin,
  HostAnalyticsKpiMetric,
  HostAnalyticsMonthlyEarning,
  HostAnalyticsOccupancyPoint,
  HostAnalyticsPreset,
  HostAnalyticsResponse,
} from '@repo/shared';

import { PrismaService } from '../database/prisma.service';
import { HostProfilesService } from '../host-profiles/host-profiles.service';

import { QueryHostAnalyticsDto } from './dto/query-host-analytics.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_CUSTOM_RANGE_MS = 2 * 365 * MS_PER_DAY;

interface KpiBookingRow {
  rev_cur: bigint | number;
  nights_cur: bigint | number;
  props_cur: bigint | number;
  rev_prev: bigint | number;
  nights_prev: bigint | number;
  props_prev: bigint | number;
  cancel_cur: bigint | number;
  eligible_cur: bigint | number;
  cancel_prev: bigint | number;
  eligible_prev: bigint | number;
}

interface OpenNightsRow {
  open_cur: bigint | number;
  open_prev: bigint | number;
}

interface MonthlyEarningRow {
  month: Date;
  earnings: bigint | number;
}

interface OccupancyRow {
  month: Date;
  host_booked: bigint | number;
  host_open: bigint | number;
  market_booked: bigint | number;
  market_open: bigint | number;
}

interface OriginRow {
  country: string;
  bookings: number;
  nights: number;
  revenue: bigint | number;
}

@Injectable()
export class HostAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hostProfilesService: HostProfilesService,
  ) {}

  async getAnalytics(userId: string, dto: QueryHostAnalyticsDto): Promise<HostAnalyticsResponse> {
    const hostProfile = await this.hostProfilesService.findByUserId(userId);
    const propertyId = await this.resolveOwnedPropertyId(hostProfile.id, dto.propertyId);
    const { from, to, preset } = resolveAnalyticsWindow(dto);
    const durationMs = to.getTime() - from.getTime();
    const prevTo = from;
    const prevFrom = new Date(from.getTime() - durationMs);
    const chartTo = to;
    const chartFrom = startOfUtcMonth(from);
    const [kpiRow, openRow, earningsRows, occupancyRows, originRows] = await Promise.all([
      this.queryKpiBookings(hostProfile.id, prevFrom, from, to, propertyId),
      this.queryOpenNights(hostProfile.id, prevFrom, prevTo, from, to, propertyId),
      this.queryMonthlyEarnings(hostProfile.id, chartFrom, chartTo, propertyId),
      this.queryOccupancyTrend(hostProfile.id, chartFrom, chartTo, propertyId),
      this.queryGuestOrigins(hostProfile.id, from, to, propertyId),
    ]);
    /** Host money fields are stored in settlement currency (USD). */
    const toUsd = (amount: number | null): number | null =>
      amount === null ? null : Math.round(amount);
    const nightsCur = num(kpiRow.nights_cur);
    const nightsPrev = num(kpiRow.nights_prev);
    const revCur = num(kpiRow.rev_cur);
    const revPrev = num(kpiRow.rev_prev);
    const openCur = num(openRow.open_cur);
    const openPrev = num(openRow.open_prev);
    const invCur = openCur + nightsCur;
    const invPrev = openPrev + nightsPrev;
    const adrCur = nightsCur > 0 ? revCur / nightsCur : null;
    const adrPrev = nightsPrev > 0 ? revPrev / nightsPrev : null;
    const revparCur = invCur > 0 ? revCur / invCur : null;
    const revparPrev = invPrev > 0 ? revPrev / invPrev : null;
    const cancelCur = num(kpiRow.cancel_cur);
    const eligibleCur = num(kpiRow.eligible_cur);
    const cancelPrev = num(kpiRow.cancel_prev);
    const eligiblePrev = num(kpiRow.eligible_prev);
    const rateCur = eligibleCur > 0 ? (cancelCur / eligibleCur) * 100 : null;
    const ratePrev = eligiblePrev > 0 ? (cancelPrev / eligiblePrev) * 100 : null;
    const monthlyEarnings = fillMonthlyEarnings(chartFrom, chartTo, earningsRows);
    const occupancyTrend = fillOccupancyTrend(chartFrom, chartTo, occupancyRows);
    const guestOrigins: HostAnalyticsGuestOrigin[] = originRows.map((row) => ({
      country: row.country,
      bookings: Number(row.bookings),
      nights: Number(row.nights),
      revenue: num(row.revenue),
    }));
    return {
      period: { from: from.toISOString(), to: to.toISOString(), preset },
      previousPeriod: { from: prevFrom.toISOString(), to: prevTo.toISOString() },
      propertyId,
      kpis: {
        adr: buildMoneyKpi(adrCur, adrPrev, toUsd),
        revpar: buildMoneyKpi(revparCur, revparPrev, toUsd),
        nightsBooked: {
          value: nightsCur,
          previous: nightsPrev,
          deltaPct: pctDelta(nightsCur, nightsPrev),
          deltaAbs: nightsCur - nightsPrev,
          valueUsd: null,
          secondary: { propertyCount: num(kpiRow.props_cur) },
        },
        cancellationRate: {
          value: rateCur === null ? null : round1(rateCur),
          previous: ratePrev === null ? null : round1(ratePrev),
          deltaPct: pctDelta(rateCur, ratePrev),
          deltaAbs: rateCur !== null && ratePrev !== null ? round1(rateCur - ratePrev) : null,
          valueUsd: null,
          secondary: { cancellationCount: cancelCur },
        },
      },
      monthlyEarnings,
      occupancyTrend,
      guestOrigins,
      settlementCurrency: 'USD',
    };
  }

  private async resolveOwnedPropertyId(
    hostProfileId: string,
    rawPropertyId: string | undefined,
  ): Promise<string | null> {
    const propertyId = rawPropertyId?.trim() || null;
    if (!propertyId) return null;
    const owned = await this.prisma.property.findFirst({
      where: { id: propertyId, hostId: hostProfileId },
      select: { id: true },
    });
    if (!owned) {
      throw new ForbiddenException('Property not found');
    }
    return owned.id;
  }

  private async queryKpiBookings(
    hostProfileId: string,
    prevFrom: Date,
    from: Date,
    to: Date,
    propertyId: string | null,
  ): Promise<KpiBookingRow> {
    const rows = await this.prisma.$queryRaw<KpiBookingRow[]>`
      SELECT
        COALESCE(SUM(CASE WHEN b."checkIn" >= ${from} AND b."checkIn" < ${to}
          AND b.status IN ('CONFIRMED','COMPLETED')
          THEN COALESCE(b."hostPayoutAmount", b."totalAmount" - COALESCE(b."platformFeeAmount", 0)) END), 0) AS rev_cur,
        COALESCE(SUM(CASE WHEN b."checkIn" >= ${from} AND b."checkIn" < ${to}
          AND b.status IN ('CONFIRMED','COMPLETED') THEN b."nightsCount" END), 0) AS nights_cur,
        COUNT(DISTINCT CASE WHEN b."checkIn" >= ${from} AND b."checkIn" < ${to}
          AND b.status IN ('CONFIRMED','COMPLETED') THEN b."propertyId" END) AS props_cur,
        COALESCE(SUM(CASE WHEN b."checkIn" >= ${prevFrom} AND b."checkIn" < ${from}
          AND b.status IN ('CONFIRMED','COMPLETED')
          THEN COALESCE(b."hostPayoutAmount", b."totalAmount" - COALESCE(b."platformFeeAmount", 0)) END), 0) AS rev_prev,
        COALESCE(SUM(CASE WHEN b."checkIn" >= ${prevFrom} AND b."checkIn" < ${from}
          AND b.status IN ('CONFIRMED','COMPLETED') THEN b."nightsCount" END), 0) AS nights_prev,
        COUNT(DISTINCT CASE WHEN b."checkIn" >= ${prevFrom} AND b."checkIn" < ${from}
          AND b.status IN ('CONFIRMED','COMPLETED') THEN b."propertyId" END) AS props_prev,
        COUNT(*) FILTER (WHERE b."checkIn" >= ${from} AND b."checkIn" < ${to}
          AND b.status IN ('CANCELLED_BY_GUEST','CANCELLED_BY_HOST')) AS cancel_cur,
        COUNT(*) FILTER (WHERE b."checkIn" >= ${from} AND b."checkIn" < ${to}
          AND b.status IN ('CONFIRMED','COMPLETED','NO_SHOW','CANCELLED_BY_GUEST','CANCELLED_BY_HOST')) AS eligible_cur,
        COUNT(*) FILTER (WHERE b."checkIn" >= ${prevFrom} AND b."checkIn" < ${from}
          AND b.status IN ('CANCELLED_BY_GUEST','CANCELLED_BY_HOST')) AS cancel_prev,
        COUNT(*) FILTER (WHERE b."checkIn" >= ${prevFrom} AND b."checkIn" < ${from}
          AND b.status IN ('CONFIRMED','COMPLETED','NO_SHOW','CANCELLED_BY_GUEST','CANCELLED_BY_HOST')) AS eligible_prev
      FROM bookings b
      JOIN properties p ON p.id = b."propertyId"
      WHERE p."hostId" = ${hostProfileId}
        AND (${propertyId}::text IS NULL OR p.id = ${propertyId})
        AND b."checkIn" >= ${prevFrom} AND b."checkIn" < ${to}
    `;
    return (
      rows[0] ?? {
        rev_cur: 0,
        nights_cur: 0,
        props_cur: 0,
        rev_prev: 0,
        nights_prev: 0,
        props_prev: 0,
        cancel_cur: 0,
        eligible_cur: 0,
        cancel_prev: 0,
        eligible_prev: 0,
      }
    );
  }

  private async queryOpenNights(
    hostProfileId: string,
    prevFrom: Date,
    prevTo: Date,
    from: Date,
    to: Date,
    propertyId: string | null,
  ): Promise<OpenNightsRow> {
    const rows = await this.prisma.$queryRaw<OpenNightsRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE a.date >= ${from} AND a.date < ${to}) AS open_cur,
        COUNT(*) FILTER (WHERE a.date >= ${prevFrom} AND a.date < ${prevTo}) AS open_prev
      FROM availabilities a
      JOIN properties p ON p.id = a."propertyId"
      WHERE p."hostId" = ${hostProfileId}
        AND (${propertyId}::text IS NULL OR p.id = ${propertyId})
        AND a."isAvailable" = true
        AND a.date >= ${prevFrom} AND a.date < ${to}
    `;
    return rows[0] ?? { open_cur: 0, open_prev: 0 };
  }

  private async queryMonthlyEarnings(
    hostProfileId: string,
    chartFrom: Date,
    chartTo: Date,
    propertyId: string | null,
  ): Promise<MonthlyEarningRow[]> {
    return this.prisma.$queryRaw<MonthlyEarningRow[]>`
      SELECT date_trunc('month', b."checkIn") AS month,
             COALESCE(SUM(COALESCE(b."hostPayoutAmount", b."totalAmount" - COALESCE(b."platformFeeAmount", 0))), 0) AS earnings
      FROM bookings b
      JOIN properties p ON p.id = b."propertyId"
      WHERE p."hostId" = ${hostProfileId}
        AND (${propertyId}::text IS NULL OR p.id = ${propertyId})
        AND b.status IN ('CONFIRMED','COMPLETED')
        AND b."checkIn" >= ${chartFrom} AND b."checkIn" < ${chartTo}
      GROUP BY 1
      ORDER BY 1
    `;
  }

  private async queryOccupancyTrend(
    hostProfileId: string,
    chartFrom: Date,
    chartTo: Date,
    propertyId: string | null,
  ): Promise<OccupancyRow[]> {
    return this.prisma.$queryRaw<OccupancyRow[]>`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', ${chartFrom}::timestamp),
          date_trunc('month', ${chartTo}::timestamp - interval '1 day'),
          interval '1 month'
        ) AS month
      ),
      host_booked AS (
        SELECT date_trunc('month', b."checkIn") AS month,
               COALESCE(SUM(b."nightsCount"), 0) AS nights
        FROM bookings b
        JOIN properties p ON p.id = b."propertyId"
        WHERE p."hostId" = ${hostProfileId}
          AND (${propertyId}::text IS NULL OR p.id = ${propertyId})
          AND b.status IN ('CONFIRMED','COMPLETED')
          AND b."checkIn" >= ${chartFrom} AND b."checkIn" < ${chartTo}
        GROUP BY 1
      ),
      host_open AS (
        SELECT date_trunc('month', a.date) AS month,
               COUNT(*)::bigint AS nights
        FROM availabilities a
        JOIN properties p ON p.id = a."propertyId"
        WHERE p."hostId" = ${hostProfileId}
          AND (${propertyId}::text IS NULL OR p.id = ${propertyId})
          AND a."isAvailable" = true
          AND a.date >= ${chartFrom} AND a.date < ${chartTo}
        GROUP BY 1
      ),
      market_booked AS (
        SELECT date_trunc('month', b."checkIn") AS month,
               COALESCE(SUM(b."nightsCount"), 0) AS nights
        FROM bookings b
        WHERE b.status IN ('CONFIRMED','COMPLETED')
          AND b."checkIn" >= ${chartFrom} AND b."checkIn" < ${chartTo}
        GROUP BY 1
      ),
      market_open AS (
        SELECT date_trunc('month', a.date) AS month,
               COUNT(*)::bigint AS nights
        FROM availabilities a
        WHERE a."isAvailable" = true
          AND a.date >= ${chartFrom} AND a.date < ${chartTo}
        GROUP BY 1
      )
      SELECT m.month,
             COALESCE(hb.nights, 0) AS host_booked,
             COALESCE(ho.nights, 0) AS host_open,
             COALESCE(mb.nights, 0) AS market_booked,
             COALESCE(mo.nights, 0) AS market_open
      FROM months m
      LEFT JOIN host_booked hb ON hb.month = m.month
      LEFT JOIN host_open ho ON ho.month = m.month
      LEFT JOIN market_booked mb ON mb.month = m.month
      LEFT JOIN market_open mo ON mo.month = m.month
      ORDER BY m.month ASC
    `;
  }

  private async queryGuestOrigins(
    hostProfileId: string,
    from: Date,
    to: Date,
    propertyId: string | null,
  ): Promise<OriginRow[]> {
    return this.prisma.$queryRaw<OriginRow[]>`
      SELECT up.nationality AS country,
             COUNT(*)::int AS bookings,
             COALESCE(SUM(b."nightsCount"), 0)::int AS nights,
             COALESCE(SUM(COALESCE(b."hostPayoutAmount", b."totalAmount" - COALESCE(b."platformFeeAmount", 0))), 0)::bigint AS revenue
      FROM bookings b
      JOIN properties p ON p.id = b."propertyId"
      JOIN user_profiles up ON up."userId" = b."guestId"
      WHERE p."hostId" = ${hostProfileId}
        AND (${propertyId}::text IS NULL OR p.id = ${propertyId})
        AND b.status IN ('CONFIRMED','COMPLETED')
        AND b."checkIn" >= ${from} AND b."checkIn" < ${to}
        AND up.nationality IS NOT NULL AND up.nationality <> ''
      GROUP BY up.nationality
      ORDER BY revenue DESC
      LIMIT 5
    `;
  }
}

function resolveAnalyticsWindow(dto: QueryHostAnalyticsDto): {
  from: Date;
  to: Date;
  preset: HostAnalyticsPreset;
} {
  const resolvedPreset: HostAnalyticsPreset =
    dto.preset ?? (dto.from && dto.to ? 'custom' : 'last_30_days');
  if (resolvedPreset === 'custom') {
    if (!dto.from || !dto.to) {
      throw new BadRequestException('from and to are required when preset is custom');
    }
    const from = parseDateOrThrow(dto.from, 'from');
    const to = parseDateOrThrow(dto.to, 'to');
    if (from >= to) {
      throw new BadRequestException('from must be before to');
    }
    if (to.getTime() - from.getTime() > MAX_CUSTOM_RANGE_MS) {
      throw new BadRequestException('Custom range cannot exceed 2 years');
    }
    return { from, to, preset: resolvedPreset };
  }
  const to = new Date();
  if (resolvedPreset === 'this_year') {
    const from = new Date(Date.UTC(to.getUTCFullYear(), 0, 1));
    return { from, to, preset: resolvedPreset };
  }
  const days = resolvedPreset === 'last_90_days' ? 90 : 30;
  return { from: new Date(to.getTime() - days * MS_PER_DAY), to, preset: resolvedPreset };
}

function parseDateOrThrow(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid ${field} date`);
  }
  return parsed;
}

function num(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'bigint' ? Number(value) : Number(value);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function pctDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  // Hide misleading spikes when the prior window was near-empty.
  if (Math.abs(pct) > 999) return null;
  return round1(pct);
}

function buildMoneyKpi(
  current: number | null,
  previous: number | null,
  toUsd: (amount: number | null) => number | null,
): HostAnalyticsKpiMetric {
  const rounded = current === null ? null : Math.round(current);
  const prevRounded = previous === null ? null : Math.round(previous);
  return {
    value: rounded,
    previous: prevRounded,
    deltaPct: pctDelta(rounded, prevRounded),
    deltaAbs: rounded !== null && prevRounded !== null ? rounded - prevRounded : null,
    valueUsd: toUsd(rounded),
  };
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function eachUtcMonth(from: Date, to: Date): Date[] {
  const months: Date[] = [];
  let cursor = startOfUtcMonth(from);
  const end = startOfUtcMonth(new Date(to.getTime() - 1));
  while (cursor <= end) {
    months.push(cursor);
    cursor = addUtcMonths(cursor, 1);
  }
  return months;
}

function fillMonthlyEarnings(
  chartFrom: Date,
  chartTo: Date,
  rows: MonthlyEarningRow[],
): HostAnalyticsMonthlyEarning[] {
  const byMonth = new Map(
    rows.map((row) => [startOfUtcMonth(row.month).toISOString(), num(row.earnings)]),
  );
  return eachUtcMonth(chartFrom, chartTo).map((month) => ({
    month: month.toISOString(),
    earnings: byMonth.get(month.toISOString()) ?? 0,
  }));
}

function fillOccupancyTrend(
  chartFrom: Date,
  chartTo: Date,
  rows: OccupancyRow[],
): HostAnalyticsOccupancyPoint[] {
  const byMonth = new Map(rows.map((row) => [startOfUtcMonth(row.month).toISOString(), row]));
  return eachUtcMonth(chartFrom, chartTo).map((month) => {
    const row = byMonth.get(month.toISOString());
    if (!row) {
      return { month: month.toISOString(), hostPct: null, marketPct: null };
    }
    const hostBooked = num(row.host_booked);
    const hostOpen = num(row.host_open);
    const marketBooked = num(row.market_booked);
    const marketOpen = num(row.market_open);
    const hostInv = hostBooked + hostOpen;
    const marketInv = marketBooked + marketOpen;
    return {
      month: month.toISOString(),
      hostPct: hostInv > 0 ? round1((hostBooked / hostInv) * 100) : null,
      marketPct: marketInv > 0 ? round1((marketBooked / marketInv) * 100) : null,
    };
  });
}
