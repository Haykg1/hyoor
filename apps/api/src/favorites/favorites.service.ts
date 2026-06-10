import { Injectable, NotFoundException } from '@nestjs/common';
import type { Property, PropertyPhoto } from '@repo/database/client';
import type { PaginatedResponse, PropertySummary } from '@repo/shared';
import { DEFAULT_PAGE_SIZE } from '@repo/shared/constants';

import { PrismaService } from '../database/prisma.service';
import { PropertiesService } from '../properties/properties.service';

import type { QueryFavoritesDto } from './dto/query-favorites.dto';

const propertyInclude = {
  property: {
    include: {
      photos: { where: { isCover: true }, take: 1 },
      _count: { select: { reviews: { where: { isPublished: true, target: 'PROPERTY' } } } },
      reviews: {
        where: { isPublished: true, target: 'PROPERTY' },
        select: { rating: true },
      },
    },
  },
} as const;

type FavoriteWithProperty = {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: Date;
  property: Property & {
    photos: PropertyPhoto[];
    reviews: { rating: number }[];
    _count: { reviews: number };
  };
};

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertiesService: PropertiesService,
  ) {}

  async listIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.propertyFavorite.findMany({
      where: { userId },
      select: { propertyId: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => row.propertyId);
  }

  async list(userId: string, dto: QueryFavoritesDto): Promise<PaginatedResponse<PropertySummary>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const propertyWhere = this.propertiesService.buildFavoritesPropertyWhere(dto);
    const where = { userId, property: propertyWhere };
    const sortOrder = dto.sortOrder ?? 'desc';
    const orderBy =
      dto.sortBy === 'pricePerNight'
        ? { property: { pricePerNight: sortOrder } }
        : { createdAt: sortOrder };
    const [favorites, total] = await Promise.all([
      this.prisma.propertyFavorite.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: propertyInclude,
      }),
      this.prisma.propertyFavorite.count({ where }),
    ]);
    const data = await Promise.all(
      favorites.map((favorite) =>
        this.propertiesService.toPropertySummary((favorite as FavoriteWithProperty).property),
      ),
    );
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async add(userId: string, propertyId: string): Promise<{ propertyId: string }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, status: true },
    });
    if (!property || property.status !== 'ACTIVE') {
      throw new NotFoundException('Property not found');
    }
    await this.prisma.propertyFavorite.upsert({
      where: { userId_propertyId: { userId, propertyId } },
      update: {},
      create: { userId, propertyId },
    });
    return { propertyId };
  }

  async remove(userId: string, propertyId: string): Promise<void> {
    const existing = await this.prisma.propertyFavorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
    if (!existing) {
      throw new NotFoundException('Favorite not found');
    }
    await this.prisma.propertyFavorite.delete({
      where: { userId_propertyId: { userId, propertyId } },
    });
  }
}
