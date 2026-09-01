import {
  BadRequestException,
  Injectable,
  Logger,
  MessageEvent,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@repo/database/client';
import type {
  BudgetProfile,
  TripPlanDetail,
  TripPlanGenerateResponse,
  TripPlanPreferences,
  TripPlanProgressEvent,
  TripPlanStaySnapshot,
  TripPlanSummary,
  TripPlannerQuotaView,
} from '@repo/shared';
import {
  S3_PRESIGNED_URL_EXPIRES,
  ageBandFromDateOfBirth,
  collectPreferenceTags,
  deriveBudgetProfile,
  nextUnansweredQuestion,
  toPoiCitySlug,
} from '@repo/shared';
import { Observable } from 'rxjs';

import { LlmService } from '../ai-search/llm/llm.service';
import { normalizeChatLocale } from '../ai-search/utils/chat-locale';
import type { AppConfig } from '../config/configuration';
import { CurrencyService } from '../currency/currency.service';
import { PrismaService } from '../database/prisma.service';
import type { PoiRecord } from '../poi/poi-mapper';
import { PoiService } from '../poi/poi.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';

import { CreateTripPlanDto } from './dto/create-trip-plan.dto';
import { GenerateTripPlanDto } from './dto/generate-trip-plan.dto';
import { UpdateTripPlanDto } from './dto/update-trip-plan.dto';
import type { GeneratedPlan, GeneratedPlanItem, GeneratedPlanPhoto } from './generated-plan';
import { hydratePlan } from './plan-hydrator';
import { kindFor } from './poi-kind';
import { parseProposedPlan, type ResolvedPlan } from './proposed-plan';
import { nightCount, toIsoDate } from './trip-dates';
import { parsePreferences, toDetail, toSummary, TRIP_PLAN_INCLUDE } from './trip-plan-mapper';
import type { TripPlanRow } from './trip-plan-mapper';
import {
  TripPlannerCandidatesService,
  type CompactCandidate,
} from './trip-planner-candidates.service';
import { TripPlannerJobService } from './trip-planner-job.service';
import { TripPlannerQuotaService } from './trip-planner-quota.service';
import {
  buildGeneratedTripPrompt,
  buildRegenerateDayPrompt,
  type TripPlanPromptParts,
} from './trip-planner-system-prompt';
import {
  maxStopsForNights,
  TRIP_PLANNER_MAX_NIGHTS,
  TRIP_PLANNER_UNITS_PER_PLAN,
} from './trip-planner.constants';
import type { RoutePoint } from './trip-route';

const ATTACHABLE_STATUSES = new Set(['AWAITING_PAYMENT', 'PENDING', 'CONFIRMED']);
const LLM_PARSE_RETRIES = 2;
const MINOR_BLOCK_TAGS = ['alcohol', 'nightlife'];

@Injectable()
export class TripPlannerService {
  private readonly logger = new Logger(TripPlannerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly quotaService: TripPlannerQuotaService,
    private readonly jobService: TripPlannerJobService,
    private readonly currencyService: CurrencyService,
    private readonly storage: StorageService,
    private readonly redis: RedisService,
    private readonly poiService: PoiService,
    private readonly candidatesService: TripPlannerCandidatesService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * The only place a fresh plan is persisted: the guest has answered every
   * question and pressed "Build plan". Creates the plan and starts generation
   * atomically; nothing is written before this point.
   */
  async create(userId: string, dto: CreateTripPlanDto): Promise<TripPlanGenerateResponse> {
    const locale = normalizeChatLocale(dto.locale);
    const preferences = parsePreferences(dto.preferences ?? {});
    this.assertIntakeComplete(preferences);
    if (dto.bookingId) {
      const existing = await this.prisma.tripPlan.findFirst({
        where: { userId, bookingId: dto.bookingId },
        include: TRIP_PLAN_INCLUDE,
      });
      if (existing) {
        const quota = await this.quotaService.getQuota(userId);
        const job = await this.jobService.read(existing.id);
        return { plan: toDetail(existing, job?.events ?? []), quota };
      }
    }
    const stay = await this.resolveStayWindow(userId, dto);
    if (!(await this.poiService.isPlannerCity(stay.citySlug))) {
      throw new BadRequestException({
        message: 'The trip planner is not available for this city yet',
        code: 'TRIP_PLANNER_CITY_UNSUPPORTED',
      });
    }
    const guestCount = dto.guestCount ?? stay.guestCount;
    const created = await this.prisma.tripPlan.create({
      data: {
        userId,
        city: stay.city,
        citySlug: stay.citySlug,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        bookingId: stay.bookingId,
        guestCount,
        locale,
        preferences: preferences as Prisma.InputJsonValue,
        status: 'GENERATING',
      },
      include: TRIP_PLAN_INCLUDE,
    });
    let quota: TripPlannerQuotaView;
    try {
      quota = await this.quotaService.consume(userId, TRIP_PLANNER_UNITS_PER_PLAN);
    } catch (error) {
      await this.prisma.tripPlan.delete({ where: { id: created.id } });
      throw error;
    }
    if (created.bookingId) {
      const snapshot = await this.buildStaySnapshot(created);
      if (snapshot) {
        await this.prisma.tripPlan.update({
          where: { id: created.id },
          data: { staySnapshot: snapshot as unknown as Prisma.InputJsonValue },
        });
      }
    }
    await this.jobService.start(created.id);
    void this.runGenerate(created.id).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Trip plan ${created.id} generation failed: ${message}`);
    });
    const started = await this.requirePlan(userId, created.id);
    return { plan: toDetail(started), quota };
  }

  async list(userId: string): Promise<TripPlanSummary[]> {
    const rows = await this.prisma.tripPlan.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => toSummary(row));
  }

  async getById(userId: string, id: string): Promise<TripPlanDetail> {
    const plan = await this.requirePlan(userId, id);
    const job = await this.jobService.read(id);
    return toDetail(plan, job?.events ?? []);
  }

  async update(userId: string, id: string, dto: UpdateTripPlanDto): Promise<TripPlanDetail> {
    const plan = await this.requirePlan(userId, id);
    if (plan.status !== 'DRAFT' && plan.status !== 'FAILED' && plan.status !== 'INTERVIEW') {
      throw new BadRequestException('This plan can no longer be edited');
    }
    const preferences = dto.preferences
      ? { ...parsePreferences(plan.preferences), ...dto.preferences }
      : parsePreferences(plan.preferences);
    const updated = await this.prisma.tripPlan.update({
      where: { id: plan.id },
      data: {
        guestCount: dto.guestCount ?? plan.guestCount,
        preferences: preferences as Prisma.InputJsonValue,
        locale: dto.locale ? normalizeChatLocale(dto.locale) : plan.locale,
      },
      include: TRIP_PLAN_INCLUDE,
    });
    return toDetail(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.requirePlan(userId, id);
    await this.prisma.tripPlan.delete({ where: { id } });
    await this.redis.del(this.jobService.jobKey(id));
  }

  async generate(
    userId: string,
    id: string,
    dto: GenerateTripPlanDto,
  ): Promise<TripPlanGenerateResponse> {
    const plan = await this.requirePlan(userId, id);
    if (plan.status === 'GENERATING') {
      const quota = await this.quotaService.getQuota(userId);
      const job = await this.jobService.read(plan.id);
      return { plan: toDetail(plan, job?.events ?? []), quota };
    }
    if (plan.status === 'READY' || plan.status === 'PLANNED') {
      const quota = await this.quotaService.getQuota(userId);
      return { plan: toDetail(plan), quota };
    }
    if (dto.preferences || dto.guestCount !== undefined || dto.locale) {
      await this.update(userId, id, dto);
    }
    const current = await this.requirePlan(userId, id);
    this.assertIntakeComplete(parsePreferences(current.preferences));
    const quota = await this.quotaService.consume(userId, TRIP_PLANNER_UNITS_PER_PLAN);
    await this.prisma.tripPlan.update({
      where: { id: current.id },
      data: { status: 'GENERATING' },
    });
    await this.jobService.start(current.id);
    void this.runGenerate(current.id).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Trip plan ${current.id} generation failed: ${message}`);
    });
    const started = await this.requirePlan(userId, id);
    return { plan: toDetail(started), quota };
  }

  async regenerateDay(userId: string, id: string, date: string): Promise<TripPlanGenerateResponse> {
    const plan = await this.requirePlan(userId, id);
    if (plan.status !== 'READY' && plan.status !== 'PLANNED') {
      throw new BadRequestException('Plan is not ready to regenerate');
    }
    const day = plan.days.find((entry) => toIsoDate(entry.date) === date);
    if (!day) throw new NotFoundException('Day not found');
    const preferences = parsePreferences(plan.preferences);
    const maxStops = maxStopsForNights(nightCount(plan.checkIn, plan.checkOut));
    const quota = await this.quotaService.consume(userId, 1);
    const budget = await this.resolveBudget(plan);
    const ageBand = await this.resolveAgeBand(userId);
    const { records, compact } = await this.resolveCandidates(
      plan.citySlug,
      preferences,
      plan.days.length * maxStops,
    );
    const usedElsewhere = usedPlaceIds(plan, day.id);
    const dayCandidates = compact.filter((candidate) => !usedElsewhere.has(candidate.poiId));
    if (dayCandidates.length === 0) {
      throw new BadRequestException('No fresh places are available for this day');
    }
    const blockTags = ageBand === 'minor' ? MINOR_BLOCK_TAGS : [];
    const proposed = await this.completeProposedPlan(
      buildRegenerateDayPrompt({
        locale: plan.locale,
        city: plan.city,
        date,
        theme: day.theme,
        preferences,
        budget,
        ageBand,
        maxStops,
        candidates: dayCandidates,
      }),
      dayCandidates,
      1,
      maxStops,
      blockTags,
    );
    const photos = await this.resolvePhotos(
      proposed.days.flatMap((entry) => entry.picks.map((pick) => pick.poiId)),
    );
    const hydrated = hydratePlan({
      proposed,
      candidates: records,
      dates: [date],
      city: plan.city,
      locale: plan.locale,
      photosByPoiId: photos,
      anchor: await this.stayAnchor(plan),
    });
    const newDay = hydrated.days[0];
    if (!newDay || newDay.items.length === 0) {
      throw new ServiceUnavailableException('Could not regenerate this day');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.tripPlanDay.delete({ where: { id: day.id } });
      await this.createDay(tx, plan.id, newDay, day.sortOrder);
    });
    return { plan: await this.getById(userId, id), quota };
  }

  async swapItem(userId: string, id: string, itemId: string): Promise<TripPlanGenerateResponse> {
    const plan = await this.requirePlan(userId, id);
    if (plan.status !== 'READY' && plan.status !== 'PLANNED') {
      throw new BadRequestException('Plan is not ready to swap a stop');
    }
    const day = plan.days.find((entry) => entry.items.some((item) => item.id === itemId));
    const item = day?.items.find((entry) => entry.id === itemId);
    if (!day || !item) throw new NotFoundException('Stop not found');
    const preferences = parsePreferences(plan.preferences);
    const quota = await this.quotaService.consume(userId, 1);
    const ageBand = await this.resolveAgeBand(userId);
    const { records } = await this.resolveCandidates(plan.citySlug, preferences);
    const usedIds = usedPlaceIds(plan, null);
    const blocked = new Set(ageBand === 'minor' ? MINOR_BLOCK_TAGS : []);
    const replacement = pickSwapCandidate(records, {
      usedIds,
      blocked,
      kind: item.kind,
      planTags: collectPreferenceTags(preferences),
    });
    if (!replacement) throw new BadRequestException('No alternative stop is available');
    const photos = await this.resolvePhotos([replacement.id]);
    const hydrated = hydratePlan({
      proposed: {
        summary: '',
        days: [
          {
            theme: day.theme,
            picks: [
              {
                poiId: replacement.id,
                startTime: item.startTime,
                endTime: item.endTime,
                whyThisFits: '',
              },
            ],
          },
        ],
      },
      candidates: records,
      dates: [toIsoDate(day.date)],
      city: plan.city,
      locale: plan.locale,
      photosByPoiId: photos,
    });
    const hydratedItem = hydrated.days[0]?.items[0];
    if (!hydratedItem) throw new ServiceUnavailableException('Could not swap this stop');
    await this.prisma.$transaction(async (tx) => {
      await tx.tripPlanItem.update({
        where: { id: item.id },
        data: itemData(hydratedItem, item.sortOrder),
      });
      await tx.tripPlanVerification.deleteMany({ where: { itemId: item.id } });
      await tx.tripPlanVerification.create({
        data: {
          itemId: item.id,
          checkName: 'catalog',
          result: hydratedItem.verifiedAt ? 'verified' : 'unverified',
        },
      });
    });
    return { plan: await this.getById(userId, id), quota };
  }

  async attachBooking(userId: string, id: string, bookingId: string): Promise<TripPlanDetail> {
    const plan = await this.requirePlan(userId, id);
    if (plan.bookingId) throw new BadRequestException('This plan is already linked to a stay');
    const booking = await this.requireAttachableBooking(userId, bookingId);
    this.assertBookingFits(booking, plan.checkIn, plan.checkOut, plan.city);
    const guestCount = plan.guestCount ?? booking.guestCount;
    const updated = await this.prisma.tripPlan.update({
      where: { id: plan.id },
      data: { bookingId: booking.id, guestCount },
      include: TRIP_PLAN_INCLUDE,
    });
    return toDetail(updated);
  }

  streamEvents(_userId: string, id: string): Observable<MessageEvent> {
    return this.jobService.stream(id);
  }

  async assertOwned(userId: string, id: string): Promise<void> {
    await this.requirePlan(userId, id);
  }

  private async runGenerate(planId: string): Promise<void> {
    const plan = await this.requirePlanById(planId);
    const preferences = parsePreferences(plan.preferences);
    const daysCount = nightCount(plan.checkIn, plan.checkOut);
    const dates = tripDates(plan.checkIn, daysCount);
    try {
      await this.emit(planId, 'intake_complete', 'Understood your preferences');
      await this.emit(planId, 'selecting', 'Choosing places that fit', { dayCount: daysCount });
      const stay = await this.buildStaySnapshot(plan);
      const budget = await this.resolveBudget(plan, stay);
      const ageBand = await this.resolveAgeBand(plan.userId);
      const maxStops = maxStopsForNights(daysCount);
      const { records, compact } = await this.resolveCandidates(
        plan.citySlug,
        preferences,
        daysCount * maxStops,
      );
      if (compact.length === 0) {
        throw new ServiceUnavailableException('No curated places are available for this city');
      }
      const blockTags = ageBand === 'minor' ? MINOR_BLOCK_TAGS : [];
      const proposed = await this.completeProposedPlan(
        buildGeneratedTripPrompt({
          locale: plan.locale,
          city: plan.city,
          checkIn: toIsoDate(plan.checkIn),
          checkOut: toIsoDate(plan.checkOut),
          nightCount: daysCount,
          preferences,
          budget,
          ageBand,
          maxStops,
          candidates: compact,
          stay: stay
            ? { title: stay.title, latitude: stay.latitude, longitude: stay.longitude }
            : null,
        }),
        compact,
        daysCount,
        maxStops,
        blockTags,
      );
      await this.emit(planId, 'arranging', 'Building your day-by-day plan', {
        dayCount: proposed.days.length,
      });
      const photos = await this.resolvePhotos(
        proposed.days.flatMap((day) => day.picks.map((pick) => pick.poiId)),
      );
      const hydrated = hydratePlan({
        proposed,
        candidates: records,
        dates,
        city: plan.city,
        locale: plan.locale,
        photosByPoiId: photos,
        anchor:
          stay?.latitude != null && stay?.longitude != null
            ? { lat: stay.latitude, lng: stay.longitude }
            : null,
      });
      await this.persistGenerated(plan, hydrated, budget, stay);
      await this.emit(planId, 'ready', 'Plan ready', undefined, 'ready');
    } catch (error) {
      const stillExists = await this.prisma.tripPlan.findUnique({
        where: { id: planId },
        select: { id: true },
      });
      if (!stillExists) return; // guest deleted the plan mid-generation
      const message = error instanceof Error ? error.message : 'Trip plan generation failed';
      await this.prisma.tripPlan.update({
        where: { id: planId },
        data: { status: 'FAILED' },
      });
      await this.emit(planId, 'failed', message, undefined, 'failed');
    }
  }

  private async resolveCandidates(
    citySlug: string,
    preferences: TripPlanPreferences,
    targetStops = 0,
  ): Promise<{ records: PoiRecord[]; compact: CompactCandidate[] }> {
    const tags = collectPreferenceTags(preferences);
    const configLimit = this.config.get('tripPlanner.candidateLimit', { infer: true });
    const limit = Math.max(configLimit, Math.ceil(targetStops * 2.5), 24);
    const records = await this.candidatesService.getCandidates(citySlug, tags, limit);
    return { records, compact: this.candidatesService.toCompact(records) };
  }

  private async completeProposedPlan(
    prompt: TripPlanPromptParts,
    candidates: CompactCandidate[],
    nights: number,
    maxStops: number,
    blockTags: string[],
  ): Promise<ResolvedPlan> {
    for (let attempt = 0; attempt < LLM_PARSE_RETRIES; attempt += 1) {
      let json: unknown;
      try {
        const result = await this.llmService.completeGeneratedTripPlan(prompt);
        json = result.json;
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        throw new ServiceUnavailableException('AI trip planner is unavailable');
      }
      const parsed = parseProposedPlan(json, candidates, nights, maxStops, blockTags);
      if (parsed) return parsed;
    }
    throw new ServiceUnavailableException('AI provider returned an invalid trip plan');
  }

  private async stayAnchor(plan: TripPlanRow): Promise<RoutePoint | null> {
    const snapshot = await this.buildStaySnapshot(plan);
    if (snapshot?.latitude != null && snapshot?.longitude != null) {
      return { lat: snapshot.latitude, lng: snapshot.longitude };
    }
    return null;
  }

  private async resolvePhotos(poiIds: string[]): Promise<Map<string, GeneratedPlanPhoto[]>> {
    const ids = [...new Set(poiIds)];
    const result = new Map<string, GeneratedPlanPhoto[]>();
    if (ids.length === 0) return result;
    const rows = await this.prisma.poiPhoto.findMany({
      where: { poiId: { in: ids }, status: 'APPROVED' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    if (rows.length === 0) return result;
    const cdnBase = this.config.get('poi.photoCdnBaseUrl', { infer: true });
    for (const row of rows) {
      const list = result.get(row.poiId) ?? [];
      if (list.length >= 3) continue;
      const url = cdnBase
        ? `${cdnBase}/${row.key}`
        : await this.storage.getPresignedUrl(row.key, S3_PRESIGNED_URL_EXPIRES).catch(() => '');
      if (!url) continue;
      list.push({
        poiPhotoId: row.id,
        key: row.key,
        url,
        attribution: row.attribution,
        license: row.license,
      });
      result.set(row.poiId, list);
    }
    return result;
  }

  private async persistGenerated(
    plan: TripPlanRow,
    parsed: GeneratedPlan,
    budget: BudgetProfile,
    stay: TripPlanStaySnapshot | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.tripPlanDay.deleteMany({ where: { planId: plan.id } });
      for (const [index, day] of parsed.days.entries()) {
        await this.createDay(tx, plan.id, day, index);
      }
      await tx.tripPlan.update({
        where: { id: plan.id },
        data: {
          status: 'READY',
          summary: parsed.summary || null,
          budgetProfile: budget as unknown as Prisma.InputJsonValue,
          staySnapshot: stay as unknown as Prisma.InputJsonValue,
          rawModelOutput: parsed as unknown as Prisma.InputJsonValue,
        },
      });
    });
  }

  private async createDay(
    tx: Prisma.TransactionClient,
    planId: string,
    day: GeneratedPlan['days'][number],
    sortOrder: number,
  ): Promise<void> {
    await tx.tripPlanDay.create({
      data: {
        planId,
        date: new Date(`${day.date}T00:00:00.000Z`),
        theme: day.theme,
        sortOrder,
        items: {
          create: day.items.map((item, index) => ({
            ...itemData(item, index),
            verifications: {
              create: {
                checkName: 'catalog',
                result: item.verifiedAt ? 'verified' : 'unverified',
              },
            },
          })),
        },
      },
    });
  }

  private async emit(
    planId: string,
    type: TripPlanProgressEvent['type'],
    message: string,
    extra?: { dayIndex?: number; dayCount?: number },
    status: 'running' | 'ready' | 'failed' = 'running',
  ): Promise<void> {
    const event: TripPlanProgressEvent = {
      type,
      message,
      dayIndex: extra?.dayIndex,
      dayCount: extra?.dayCount,
      at: new Date().toISOString(),
    };
    await this.jobService.append(planId, event, status);
  }

  private assertIntakeComplete(preferences: TripPlanPreferences): void {
    if (nextUnansweredQuestion(preferences)) {
      throw new BadRequestException('Answer all four questions to continue');
    }
  }

  private async resolveStayWindow(
    userId: string,
    dto: CreateTripPlanDto,
  ): Promise<{
    city: string;
    citySlug: string;
    checkIn: Date;
    checkOut: Date;
    bookingId: string | null;
    guestCount: number;
  }> {
    if (dto.bookingId) {
      const booking = await this.requireAttachableBooking(userId, dto.bookingId);
      const capped = this.capDates(booking.checkIn, booking.checkOut);
      return {
        city: booking.property.city,
        citySlug: toPoiCitySlug(booking.property.city, booking.property.region),
        checkIn: capped.checkIn,
        checkOut: capped.checkOut,
        bookingId: booking.id,
        guestCount: booking.guestCount,
      };
    }
    if (!dto.city || !dto.checkIn || !dto.checkOut) {
      throw new BadRequestException('City and dates are required');
    }
    const dates = this.parseStayDates(dto.checkIn, dto.checkOut);
    return {
      city: dto.city,
      citySlug: toPoiCitySlug(dto.city, dto.region ?? null),
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      bookingId: null,
      guestCount: dto.guestCount ?? 2,
    };
  }

  private parseStayDates(
    checkInRaw: string,
    checkOutRaw: string,
  ): { checkIn: Date; checkOut: Date } {
    const checkIn = new Date(`${checkInRaw}T00:00:00.000Z`);
    const checkOut = new Date(`${checkOutRaw}T00:00:00.000Z`);
    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid dates');
    }
    if (checkIn < todayUtc) throw new BadRequestException('Start date must be today or later');
    if (checkOut <= checkIn) throw new BadRequestException('End date must be after start date');
    if (nightCount(checkIn, checkOut) > TRIP_PLANNER_MAX_NIGHTS) {
      throw new BadRequestException(`Trip planner supports up to ${TRIP_PLANNER_MAX_NIGHTS} days`);
    }
    return { checkIn, checkOut };
  }

  private capDates(checkIn: Date, checkOut: Date): { checkIn: Date; checkOut: Date } {
    if (nightCount(checkIn, checkOut) <= TRIP_PLANNER_MAX_NIGHTS) return { checkIn, checkOut };
    return {
      checkIn,
      checkOut: new Date(checkIn.getTime() + TRIP_PLANNER_MAX_NIGHTS * 86_400_000),
    };
  }

  private async requireAttachableBooking(
    userId: string,
    bookingId: string,
  ): Promise<{
    id: string;
    checkIn: Date;
    checkOut: Date;
    guestCount: number;
    property: { city: string; region: string | null };
  }> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, guestId: userId },
      include: { property: { select: { city: true, region: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!ATTACHABLE_STATUSES.has(booking.status)) {
      throw new BadRequestException('Only upcoming stays can be linked to a trip plan');
    }
    return booking;
  }

  private assertBookingFits(
    booking: { checkIn: Date; checkOut: Date; property: { city: string } },
    checkIn: Date,
    checkOut: Date,
    city: string,
  ): void {
    if (booking.property.city.toLowerCase() !== city.toLowerCase()) {
      throw new BadRequestException('Stay city does not match this trip plan');
    }
    if (booking.checkIn >= checkOut || booking.checkOut <= checkIn) {
      throw new BadRequestException('Stay dates do not overlap this trip plan');
    }
  }

  private async buildStaySnapshot(plan: TripPlanRow): Promise<TripPlanStaySnapshot | null> {
    if (!plan.bookingId) return null;
    const booking = await this.prisma.booking.findFirst({
      where: { id: plan.bookingId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            country: true,
            currency: true,
            pricePerNight: true,
            latitude: true,
            longitude: true,
            photos: {
              orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
              select: { key: true },
            },
          },
        },
      },
    });
    if (!booking) return null;
    const coverKey = booking.property.photos[0]?.key;
    const coverPhotoUrl = coverKey
      ? await this.storage.getPresignedUrl(coverKey, S3_PRESIGNED_URL_EXPIRES)
      : null;
    return {
      propertyId: booking.property.id,
      title: booking.property.title,
      city: booking.property.city,
      country: booking.property.country,
      coverPhotoUrl,
      nightlyMinor: booking.property.pricePerNight,
      currency: booking.property.currency,
      guestCount: plan.guestCount ?? booking.guestCount,
      latitude: booking.property.latitude == null ? null : Number(booking.property.latitude),
      longitude: booking.property.longitude == null ? null : Number(booking.property.longitude),
    };
  }

  private async resolveBudget(
    plan: TripPlanRow,
    stay?: TripPlanStaySnapshot | null,
  ): Promise<BudgetProfile> {
    const snapshot = stay === undefined ? await this.buildStaySnapshot(plan) : stay;
    const guestCount = plan.guestCount ?? snapshot?.guestCount ?? 2;
    if (!snapshot) return deriveBudgetProfile({ guestCount });
    const amdPerOriginalUnit = await this.amdPerUnit(snapshot.currency);
    return deriveBudgetProfile({
      stay: {
        nightlyMinor: snapshot.nightlyMinor,
        currency: snapshot.currency,
        guestCount,
      },
      guestCount,
      amdPerOriginalUnit,
      fxAt: amdPerOriginalUnit == null ? null : new Date().toISOString(),
    });
  }

  private async amdPerUnit(currency: string): Promise<number | null> {
    if (currency.toUpperCase() === 'AMD') return 1;
    const rates = await this.currencyService.getRates();
    if (!rates) return null;
    return this.currencyService.convert(1, currency.toUpperCase(), 'AMD', rates);
  }

  private async resolveAgeBand(userId: string): Promise<string> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { dateOfBirth: true },
    });
    if (!profile?.dateOfBirth) return 'adult';
    return ageBandFromDateOfBirth(profile.dateOfBirth);
  }

  private async requirePlan(userId: string, id: string): Promise<TripPlanRow> {
    const plan = await this.prisma.tripPlan.findFirst({
      where: { id, userId },
      include: TRIP_PLAN_INCLUDE,
    });
    if (!plan) throw new NotFoundException('Trip plan not found');
    return plan;
  }

  private async requirePlanById(id: string): Promise<TripPlanRow> {
    const plan = await this.prisma.tripPlan.findUnique({
      where: { id },
      include: TRIP_PLAN_INCLUDE,
    });
    if (!plan) throw new NotFoundException('Trip plan not found');
    return plan;
  }
}

function itemData(
  item: GeneratedPlanItem,
  sortOrder: number,
): Prisma.TripPlanItemCreateWithoutDayInput {
  const sourceRefs = item.placeId
    ? [{ type: 'poi', id: item.placeId, verifiedAt: item.verifiedAt ?? null }]
    : [];
  return {
    tempId: item.tempId,
    kind: item.kind,
    placeId: item.placeId ?? null,
    nameLabels: item.name as unknown as Prisma.InputJsonValue,
    startTime: item.startTime,
    endTime: item.endTime,
    address: item.address || null,
    latitude: item.coordinates.lat,
    longitude: item.coordinates.lng,
    openingHours: item.claimedOpeningHours || null,
    pricePerPerson: item.claimedPricePerPerson as unknown as Prisma.InputJsonValue,
    bookingRequired: item.bookingRequired,
    description: item.description,
    whyThisFits: item.whyThisFits,
    photos: (item.photos ?? []) as unknown as Prisma.InputJsonValue,
    verificationStatus: item.verifiedAt ? 'verified' : 'unverified',
    adjustments: [] as unknown as Prisma.InputJsonValue,
    sourceRefs: sourceRefs as unknown as Prisma.InputJsonValue,
    sortOrder,
  };
}

/** ISO dates for a trip, one per day starting at check-in. */
function tripDates(checkIn: Date, days: number): string[] {
  return Array.from({ length: days }, (_, index) =>
    toIsoDate(new Date(checkIn.getTime() + index * 86_400_000)),
  );
}

/** All catalog place ids already used in the plan, optionally excluding one day. */
function usedPlaceIds(plan: TripPlanRow, exceptDayId: string | null): Set<string> {
  const ids = new Set<string>();
  for (const day of plan.days) {
    if (exceptDayId && day.id === exceptDayId) continue;
    for (const item of day.items) {
      if (item.placeId) ids.add(item.placeId);
    }
  }
  return ids;
}

function pickSwapCandidate(
  candidates: PoiRecord[],
  filters: { usedIds: Set<string>; blocked: Set<string>; kind: string; planTags: string[] },
): PoiRecord | null {
  const planTags = new Set(filters.planTags);
  const available = candidates.filter(
    (poi) =>
      !filters.usedIds.has(poi.id) &&
      !(Array.isArray(poi.tags) && poi.tags.some((tag) => filters.blocked.has(tag))),
  );
  const sameKind = available.filter((poi) => kindFor(poi.category) === filters.kind);
  const pool = sameKind.length > 0 ? sameKind : available;
  const tagMatch = pool.find(
    (poi) => Array.isArray(poi.tags) && poi.tags.some((tag) => planTags.has(tag)),
  );
  return tagMatch ?? pool[0] ?? null;
}
