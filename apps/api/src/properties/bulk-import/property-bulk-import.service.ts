import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  BulkImportConfirmResponse,
  BulkImportJobResponse,
  BulkImportPreviewResponse,
  BulkImportPreviewRow,
} from '@repo/shared';

import { AiSearchQuotaService } from '../../ai-search/ai-search-quota.service';
import { LlmService } from '../../ai-search/llm/llm.service';
import { normalizeChatLocale } from '../../ai-search/utils/chat-locale';
import { PrismaService } from '../../database/prisma.service';
import { HostProfilesService } from '../../host-profiles/host-profiles.service';
import { MailerService } from '../../mail/mailer.service';
import { buildBulkImportResultsEmail } from '../../mail/templates/bulk-import-results.template';
import type { CreatePropertyDto } from '../dto/create-property.dto';
import { PropertiesService } from '../properties.service';

import { BulkImportJobStore, generatePreviewId } from './bulk-import-job.store';
import type { BulkImportJobData } from './bulk-import-job.store';
import { applyBulkRowDefaults } from './row-defaults';
import type { GeocodedAddress } from './row-geocoder';
import { RowGeocoderService } from './row-geocoder';
import type { NormalizedRow, RowNormalizationResult } from './row-normalizer';
import { normalizeRow } from './row-normalizer';
import { buildAddressKey, validateAddressFields, validateNormalizedRow } from './row-validator';
import { parseSpreadsheet } from './spreadsheet.parser';

@Injectable()
export class PropertyBulkImportService {
  private readonly logger = new Logger(PropertyBulkImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly propertiesService: PropertiesService,
    private readonly hostProfilesService: HostProfilesService,
    private readonly geocoder: RowGeocoderService,
    private readonly jobStore: BulkImportJobStore,
    private readonly mailer: MailerService,
    private readonly llm: LlmService,
    private readonly quota: AiSearchQuotaService,
  ) {}

  async analyze(
    hostUserId: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<BulkImportPreviewResponse> {
    await this.quota.assertBulkImportLimit(hostUserId);
    const hostProfile = await this.hostProfilesService.findByUserId(hostUserId);

    const rawRows = parseSpreadsheet(fileBuffer, mimeType, originalName);

    // LLM normalization — best-effort; falls back to deterministic normalizer on failure
    let llmNormalized: NormalizedRow[] | null = null;
    try {
      const headers = rawRows.length > 0 ? Object.keys(rawRows[0]!) : [];
      llmNormalized = await this.llm.normalizeBulkPropertyRows(headers, rawRows);
    } catch (err) {
      this.logger.warn(
        `LLM normalization failed, using deterministic fallback: ${(err as Error).message}`,
      );
    }

    // Load host's existing properties for duplicate detection
    const existingProperties = await this.prisma.property.findMany({
      where: { hostId: hostProfile.id, status: { not: 'INACTIVE' } },
      select: {
        id: true,
        title: true,
        street: true,
        buildingNumber: true,
        latitude: true,
        longitude: true,
      },
    });
    const seenAddressKeys = new Set<string>();
    const previewRows: BulkImportPreviewRow[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i]!;
      let norm: NormalizedRow;
      let fixes: RowNormalizationResult['fixes'];

      if (llmNormalized && llmNormalized[i]) {
        norm = llmNormalized[i]!;
        fixes = [];
      } else {
        const result = normalizeRow(raw);
        norm = result.normalized;
        fixes = result.fixes;
      }

      const errors: string[] = [];

      // Geocode address if lat/lng not provided
      let geocoded: GeocodedAddress | null = null;
      if (norm.address && (norm.latitude === undefined || norm.longitude === undefined)) {
        geocoded = await this.geocoder.resolveAddress(norm.address);
        if (geocoded) {
          norm.street = geocoded.street;
          norm.buildingNumber = geocoded.buildingNumber;
          norm.city = norm.city || geocoded.city;
          norm.region = norm.region || geocoded.region || undefined;
          norm.country = norm.country || geocoded.country;
          norm.latitude = geocoded.latitude;
          norm.longitude = geocoded.longitude;
          norm.formattedAddress = geocoded.formattedAddress;
          norm.placeKind = geocoded.placeKind;
          norm.addressLine = geocoded.addressLine;
          fixes.push({ field: 'address', from: norm.address, to: geocoded.formattedAddress });
        } else {
          errors.push(`Address "${norm.address}" could not be resolved to a verified building`);
        }
      }

      // Apply bulk defaults (title, description, propertyType, fees) after geocode
      fixes.push(...applyBulkRowDefaults(norm));

      // Validate core fields
      errors.push(...validateNormalizedRow(norm));

      // Validate address fields
      const addressErrors = validateAddressFields({
        placeKind: norm.placeKind,
        street: norm.street,
        buildingNumber: norm.buildingNumber,
        latitude: norm.latitude,
        longitude: norm.longitude,
      });
      if (geocoded === null && norm.address) {
        // already added address resolution error
      } else {
        errors.push(...addressErrors);
      }

      // Duplicate detection
      if (
        norm.street &&
        norm.buildingNumber &&
        norm.latitude !== undefined &&
        norm.longitude !== undefined
      ) {
        const key = buildAddressKey(
          norm.street,
          norm.buildingNumber,
          norm.latitude,
          norm.longitude,
        );

        const existingMatch = existingProperties.find(
          (p) =>
            p.street?.trim().toLowerCase() === norm.street!.trim().toLowerCase() &&
            p.buildingNumber?.trim().toLowerCase() === norm.buildingNumber!.trim().toLowerCase() &&
            p.latitude !== null &&
            p.longitude !== null &&
            Number(Number(p.latitude).toFixed(5)) === Number(norm.latitude!.toFixed(5)) &&
            Number(Number(p.longitude).toFixed(5)) === Number(norm.longitude!.toFixed(5)),
        );
        if (existingMatch) {
          errors.push(
            `Duplicate: a property at this address already exists ("${existingMatch.title}", id: ${existingMatch.id})`,
          );
        } else if (seenAddressKeys.has(key)) {
          errors.push('Duplicate: another row in this file has the same address');
        } else if (errors.length === 0 || addressErrors.length === 0) {
          seenAddressKeys.add(key);
        }
      }

      const hasAddressError = addressErrors.length > 0 || (norm.address && geocoded === null);
      const status =
        errors.length > 0
          ? 'error'
          : fixes.length > 0 || geocoded !== null || hasAddressError
            ? 'fixed'
            : 'valid';

      previewRows.push({
        rowIndex: i,
        status,
        original: raw,
        normalized: norm as unknown as Record<string, unknown>,
        fixes: fixes.map((f) => ({
          field: f.field,
          from: f.from as string | number | boolean | null | undefined,
          to: f.to as string | number | boolean | null | undefined,
        })),
        errors,
      });
    }

    const previewId = generatePreviewId();
    await this.jobStore.savePreview({ previewId, rows: previewRows });

    const summary = {
      total: previewRows.length,
      valid: previewRows.filter((r) => r.status === 'valid').length,
      fixed: previewRows.filter((r) => r.status === 'fixed').length,
      error: previewRows.filter((r) => r.status === 'error').length,
    };

    return { previewId, summary, rows: previewRows };
  }

  async confirm(
    hostUserId: string,
    previewId: string,
    locale?: string,
  ): Promise<BulkImportConfirmResponse> {
    const preview = await this.jobStore.loadPreview(previewId);
    if (!preview) {
      throw new NotFoundException('Preview not found or expired. Please re-analyze the file.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: hostUserId },
      select: { email: true, profile: { select: { preferredLang: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    const resolvedLocale = normalizeChatLocale(user.profile?.preferredLang ?? locale);
    const jobId = await this.jobStore.createJob({
      status: 'processing',
      hostUserId,
      recipientEmail: user.email,
      locale: resolvedLocale,
      previewId,
      startedAt: new Date().toISOString(),
    });

    // Fire and forget — do not await
    void this.processImportJob(jobId);

    return { jobId, status: 'processing' };
  }

  async getJob(jobId: string, hostUserId: string): Promise<BulkImportJobResponse> {
    const job = await this.jobStore.loadJob(jobId);
    if (!job || job.hostUserId !== hostUserId) {
      throw new NotFoundException('Job not found');
    }
    return this.jobStore.toJobResponse(job);
  }

  private async processImportJob(jobId: string): Promise<void> {
    const job = await this.jobStore.loadJob(jobId);
    if (!job) return;

    const preview = await this.jobStore.loadPreview(job.previewId);
    if (!preview) {
      await this.jobStore.updateJob(jobId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
      });
      return;
    }

    const validRows = preview.rows.filter((r) => r.status !== 'error');
    const resultRows: BulkImportJobData['rows'] = [];
    let created = 0;
    let failed = 0;
    const batchAddressKeys = new Set<string>();

    for (const row of validRows) {
      const norm = row.normalized as unknown as NormalizedRow;
      const title = norm.title ?? `Row ${row.rowIndex + 1}`;
      try {
        // Re-check duplicate in batch
        if (
          norm.street &&
          norm.buildingNumber &&
          norm.latitude !== undefined &&
          norm.longitude !== undefined
        ) {
          const key = buildAddressKey(
            norm.street,
            norm.buildingNumber,
            norm.latitude,
            norm.longitude,
          );
          if (batchAddressKeys.has(key)) {
            throw new Error('Duplicate address in this batch');
          }
          batchAddressKeys.add(key);
        }

        const dto = this.buildDto(norm as unknown as Record<string, unknown>);
        const property = await this.propertiesService.createForHost(
          job.hostUserId,
          dto as unknown as CreatePropertyDto,
          { status: 'DRAFT' },
        );

        // Add amenities if present
        if (norm.amenities && norm.amenities.length > 0) {
          try {
            await this.propertiesService.replaceAmenities(
              property.id,
              job.hostUserId,
              norm.amenities.map((name) => ({ name })),
            );
          } catch (amenityErr) {
            this.logger.warn(
              `Failed to set amenities for property ${property.id}: ${(amenityErr as Error).message}`,
            );
          }
        }

        resultRows.push({ rowIndex: row.rowIndex, title, propertyId: property.id });
        created++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.warn(`Bulk import row ${row.rowIndex} failed: ${errorMsg}`);
        resultRows.push({ rowIndex: row.rowIndex, title, error: errorMsg });
        failed++;
      }
    }

    const summary = { total: preview.rows.length, created, failed };
    const completedAt = new Date().toISOString();

    await this.jobStore.updateJob(jobId, {
      status: 'completed',
      completedAt,
      summary,
      rows: resultRows,
    });

    await this.jobStore.deletePreview(job.previewId);

    // Send results email
    try {
      const updatedJob = await this.jobStore.loadJob(jobId);
      if (updatedJob) {
        const email = buildBulkImportResultsEmail(
          {
            hostEmail: job.recipientEmail,
            summary,
            createdRows: resultRows.filter((r) => r.propertyId),
            failedRows: resultRows.filter((r) => r.error),
            jobId,
            completedAt,
          },
          job.locale,
        );
        await this.mailer.send({ to: job.recipientEmail, ...email });
      }
    } catch (emailErr) {
      this.logger.error(
        `Failed to send bulk import results email for job ${jobId}: ${(emailErr as Error).message}`,
      );
      await this.jobStore.updateJob(jobId, { status: 'completed_with_email_error' });
    }
  }

  private buildDto(norm: Record<string, unknown>): Partial<CreatePropertyDto> {
    return {
      title: norm.title as string,
      description: norm.description as string,
      propertyType: norm.propertyType as CreatePropertyDto['propertyType'],
      city: norm.city as string,
      maxGuests: norm.maxGuests as number,
      bedrooms: norm.bedrooms as number,
      beds: norm.beds as number,
      bathrooms: norm.bathrooms as number,
      pricePerNight: norm.pricePerNight as number,
      cancellationPolicy: norm.cancellationPolicy as CreatePropertyDto['cancellationPolicy'],
      country: (norm.country as string | undefined) ?? 'AM',
      region: norm.region as string | undefined,
      street: norm.street as string | undefined,
      buildingNumber: norm.buildingNumber as string | undefined,
      formattedAddress: norm.formattedAddress as string | undefined,
      placeKind: norm.placeKind as string | undefined,
      addressLine: norm.addressLine as string | undefined,
      apartmentNumber: norm.apartmentNumber as string | undefined,
      latitude: norm.latitude as number | undefined,
      longitude: norm.longitude as number | undefined,
      maxAdults: norm.maxAdults as number | undefined,
      maxChildren: norm.maxChildren as number | undefined,
      maxInfants: norm.maxInfants as number | undefined,
      cleaningFee: (norm.cleaningFee as number | undefined) ?? 0,
      securityDeposit: (norm.securityDeposit as number | undefined) ?? 0,
      minNights: norm.minNights as number | undefined,
      maxNights: norm.maxNights as number | undefined,
      checkInTime: norm.checkInTime as string | undefined,
      checkOutTime: norm.checkOutTime as string | undefined,
      smokingAllowed: norm.smokingAllowed as boolean | undefined,
      petsAllowed: norm.petsAllowed as boolean | undefined,
      partiesAllowed: norm.partiesAllowed as boolean | undefined,
      additionalRules: norm.additionalRules as string | undefined,
      externalBookingUrl: norm.externalBookingUrl as string | undefined,
      titleLabels:
        norm.titleEn || norm.titleRu || norm.titleHy
          ? {
              en: norm.titleEn as string | undefined,
              ru: norm.titleRu as string | undefined,
              hy: norm.titleHy as string | undefined,
            }
          : undefined,
    };
  }
}
