import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/database/client';
import type {
  AdminPoi,
  PaginatedResponse,
  PoiPhotoView,
  PresignedPhotoUrlResponse,
} from '@repo/shared';
import {
  parsePoiAttributes,
  PhotoMimeTypes,
  prunePoiAttributes,
  S3_PRESIGNED_URL_EXPIRES,
  slugify,
  toPoiCitySlug,
} from '@repo/shared';

import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

import { CreateAdminPoiDto } from './dto/create-admin-poi.dto';
import { QueryAdminPoisDto } from './dto/query-admin-pois.dto';
import { UpdateAdminPoiDto } from './dto/update-admin-poi.dto';
import { PoiImageSearchService } from './poi-image-search.service';
import { parseDescriptionLabels, parseNameLabels, toCoord, type PoiRecord } from './poi-mapper';
import { PoiSeedService } from './poi-seed.service';

type PoiWithPhotos = Prisma.PoiGetPayload<{ include: { photos: true } }>;

const IMAGE_DOWNLOAD_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class AdminPoiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly poiSeedService: PoiSeedService,
    private readonly imageSearch: PoiImageSearchService,
  ) {}

  async list(dto: QueryAdminPoisDto): Promise<PaginatedResponse<AdminPoi>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const where = this.buildWhere(dto);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.poi.count({ where }),
      this.prisma.poi.findMany({
        where,
        include: { photos: { orderBy: { sortOrder: 'asc' } } },
        orderBy: [{ city: 'asc' }, { sortOrder: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const data = await Promise.all(rows.map((row) => this.toAdminPoi(row)));
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async getById(id: string): Promise<AdminPoi> {
    const row = await this.requirePoi(id);
    return this.toAdminPoi(row);
  }

  async create(dto: CreateAdminPoiDto): Promise<AdminPoi> {
    const id = await this.resolveNewId(dto.id, dto.nameLabels.en);
    const citySlug = toPoiCitySlug(dto.city, dto.region);
    const created = await this.prisma.poi.create({
      data: {
        id,
        city: dto.city,
        region: dto.region,
        country: dto.country ?? 'AM',
        citySlug,
        latitude: dto.latitude,
        longitude: dto.longitude,
        category: dto.category,
        tags: dto.tags ?? [],
        nameLabels: dto.nameLabels as unknown as Prisma.InputJsonValue,
        descriptionLabels: dto.descriptionLabels as unknown as Prisma.InputJsonValue,
        wikipediaTitle: dto.wikipediaTitle ?? null,
        wikipediaUrl: dto.wikipediaUrl ?? null,
        attributes: prunePoiAttributes(
          parsePoiAttributes(dto.attributes ?? {}),
          dto.category,
        ) as unknown as Prisma.InputJsonValue,
        status: dto.status ?? 'DRAFT',
        usableInPlanner: dto.usableInPlanner ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { photos: true },
    });
    await this.poiSeedService.syncCity(citySlug);
    return this.toAdminPoi(created);
  }

  async update(id: string, dto: UpdateAdminPoiDto): Promise<AdminPoi> {
    const existing = await this.requirePoi(id);
    const city = dto.city ?? existing.city;
    const region = dto.region ?? existing.region;
    const citySlug = toPoiCitySlug(city, region);
    const updated = await this.prisma.poi.update({
      where: { id },
      data: {
        city,
        region,
        country: dto.country ?? existing.country,
        citySlug,
        latitude: dto.latitude ?? existing.latitude,
        longitude: dto.longitude ?? existing.longitude,
        category: dto.category ?? existing.category,
        tags: dto.tags ?? existing.tags,
        nameLabels: (dto.nameLabels ?? existing.nameLabels) as unknown as Prisma.InputJsonValue,
        descriptionLabels: (dto.descriptionLabels ??
          existing.descriptionLabels) as unknown as Prisma.InputJsonValue,
        wikipediaTitle:
          dto.wikipediaTitle === undefined ? existing.wikipediaTitle : dto.wikipediaTitle,
        wikipediaUrl: dto.wikipediaUrl === undefined ? existing.wikipediaUrl : dto.wikipediaUrl,
        attributes: (dto.attributes === undefined
          ? prunePoiAttributes(
              parsePoiAttributes(existing.attributes),
              dto.category ?? existing.category,
            )
          : prunePoiAttributes(
              parsePoiAttributes(dto.attributes),
              dto.category ?? existing.category,
            )) as unknown as Prisma.InputJsonValue,
        status: dto.status ?? existing.status,
        usableInPlanner: dto.usableInPlanner ?? existing.usableInPlanner,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
      },
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });
    await this.poiSeedService.syncCity(existing.citySlug);
    if (citySlug !== existing.citySlug) await this.poiSeedService.syncCity(citySlug);
    return this.toAdminPoi(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.requirePoi(id);
    await this.prisma.poi.delete({ where: { id } });
    await this.poiSeedService.syncCity(existing.citySlug);
  }

  async createPresignedPhotoUrl(
    poiId: string,
    mimeType: string,
  ): Promise<PresignedPhotoUrlResponse> {
    await this.requirePoi(poiId);
    if (!(PhotoMimeTypes as readonly string[]).includes(mimeType)) {
      throw new BadRequestException('Photo must be a JPEG, PNG, or WebP image');
    }
    const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
    const key = `pois/${poiId}/${randomUUID()}.${ext}`;
    const uploadUrl = await this.storage.getPresignedUploadUrl(
      key,
      mimeType,
      S3_PRESIGNED_URL_EXPIRES,
    );
    return { uploadUrl, key };
  }

  async confirmPhoto(poiId: string, key: string, sortOrder?: number): Promise<PoiPhotoView> {
    await this.requirePoi(poiId);
    const expectedPrefix = `pois/${poiId}/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid photo key for this POI');
    }
    const count = await this.prisma.poiPhoto.count({ where: { poiId } });
    const photo = await this.prisma.poiPhoto.create({
      data: {
        poiId,
        key,
        sortOrder: sortOrder ?? count,
        status: 'APPROVED',
        reviewedAt: new Date(),
      },
    });
    return this.toPhotoView(photo);
  }

  async setPhotoStatus(
    poiId: string,
    photoId: string,
    status: 'APPROVED' | 'REJECTED',
  ): Promise<PoiPhotoView> {
    const poi = await this.requirePoi(poiId);
    const photo = await this.prisma.poiPhoto.findFirst({ where: { id: photoId, poiId } });
    if (!photo) throw new NotFoundException('Photo not found');
    const updated = await this.prisma.poiPhoto.update({
      where: { id: photoId },
      data: { status, reviewedAt: new Date() },
    });
    await this.poiSeedService.syncCity(poi.citySlug);
    return this.toPhotoView(updated);
  }

  private async toPhotoView(photo: {
    id: string;
    key: string;
    sortOrder: number;
    status: string;
    attribution: string | null;
    license: string | null;
    sourceUrl: string | null;
  }): Promise<PoiPhotoView> {
    return {
      id: photo.id,
      key: photo.key,
      url: await this.safeUrl(photo.key),
      sortOrder: photo.sortOrder,
      status: photo.status as PoiPhotoView['status'],
      attribution: photo.attribution,
      license: photo.license,
      sourceUrl: photo.sourceUrl,
    };
  }

  async suggestPhotos(
    poiId: string,
    query?: string,
  ): Promise<{ urls: string[]; configured: boolean }> {
    const poi = await this.requirePoi(poiId);
    if (!this.imageSearch.isConfigured) return { urls: [], configured: false };
    const name = parseNameLabels(poi.nameLabels).en || poi.id;
    const q = query?.trim() || `${name} ${poi.city} Armenia`;
    return { urls: await this.imageSearch.searchImages(q), configured: true };
  }

  async importPhotoFromUrl(
    poiId: string,
    input: { url: string; attribution?: string; license?: string; sourceUrl?: string },
  ): Promise<PoiPhotoView> {
    await this.requirePoi(poiId);
    let response: Response;
    try {
      response = await fetch(input.url, {
        signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS),
      });
    } catch {
      throw new BadRequestException('Could not download that image');
    }
    if (!response.ok) throw new BadRequestException(`Image download failed (${response.status})`);
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
    const ext = CONTENT_TYPE_EXT[contentType];
    if (!ext) throw new BadRequestException('Image must be a JPEG, PNG, or WebP');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image is empty or larger than 8 MB');
    }
    const key = `pois/${poiId}/${randomUUID()}.${ext}`;
    await this.storage.uploadFile(key, buffer, contentType);
    const count = await this.prisma.poiPhoto.count({ where: { poiId } });
    const photo = await this.prisma.poiPhoto.create({
      data: {
        poiId,
        key,
        sortOrder: count,
        status: 'PENDING_REVIEW',
        attribution: input.attribution?.trim() || null,
        license: input.license?.trim() || null,
        sourceUrl: input.sourceUrl?.trim() || input.url,
      },
    });
    return this.toPhotoView(photo);
  }

  async deletePhoto(poiId: string, photoId: string): Promise<void> {
    await this.requirePoi(poiId);
    const photo = await this.prisma.poiPhoto.findFirst({ where: { id: photoId, poiId } });
    if (!photo) throw new NotFoundException('Photo not found');
    await this.prisma.poiPhoto.delete({ where: { id: photoId } });
    try {
      await this.storage.deleteFile(photo.key);
    } catch {
      return;
    }
  }

  private buildWhere(dto: QueryAdminPoisDto): Prisma.PoiWhereInput {
    const where: Prisma.PoiWhereInput = {};
    if (dto.citySlug) where.citySlug = dto.citySlug;
    if (dto.category) where.category = dto.category;
    if (dto.status) where.status = dto.status;
    if (dto.usableInPlanner === 'true') where.usableInPlanner = true;
    if (dto.usableInPlanner === 'false') where.usableInPlanner = false;
    const search = dto.search?.trim();
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private async resolveNewId(requested: string | undefined, englishName: string): Promise<string> {
    const base = (
      requested?.trim() ||
      slugify(englishName) ||
      `poi-${randomUUID().slice(0, 8)}`
    ).slice(0, 100);
    const existing = await this.prisma.poi.findUnique({
      where: { id: base },
      select: { id: true },
    });
    if (!existing) return base;
    if (requested?.trim()) throw new ConflictException(`POI id already exists: ${base}`);
    return `${base}-${randomUUID().slice(0, 6)}`;
  }

  private async requirePoi(id: string): Promise<PoiWithPhotos> {
    const row = await this.prisma.poi.findUnique({
      where: { id },
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!row) throw new NotFoundException('POI not found');
    return row;
  }

  private async toAdminPoi(row: PoiWithPhotos): Promise<AdminPoi> {
    const record = row as unknown as PoiRecord;
    const photos = await Promise.all(row.photos.map((photo) => this.toPhotoView(photo)));
    return {
      id: row.id,
      city: row.city,
      region: row.region,
      country: row.country,
      citySlug: row.citySlug,
      latitude: toCoord(record.latitude),
      longitude: toCoord(record.longitude),
      category: row.category,
      tags: row.tags,
      nameLabels: parseNameLabels(row.nameLabels),
      descriptionLabels: parseDescriptionLabels(row.descriptionLabels),
      wikipediaTitle: row.wikipediaTitle,
      wikipediaUrl: row.wikipediaUrl,
      attributes: parsePoiAttributes(row.attributes),
      status: row.status,
      usableInPlanner: row.usableInPlanner,
      sortOrder: row.sortOrder,
      photos,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async safeUrl(key: string): Promise<string | null> {
    try {
      return await this.storage.getPresignedUrl(key, S3_PRESIGNED_URL_EXPIRES);
    } catch {
      return null;
    }
  }
}
