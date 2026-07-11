import { ApiPropertyOptional } from '@nestjs/swagger';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@repo/shared/constants';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const ADMIN_BOOKING_STATUSES = [
  'AWAITING_PAYMENT',
  'PENDING',
  'CONFIRMED',
  'CANCELLED_BY_GUEST',
  'CANCELLED_BY_HOST',
  'PAYMENT_EXPIRED',
  'COMPLETED',
  'NO_SHOW',
] as const;

export const ADMIN_PAYMENT_STATUSES = [
  'UNPAID',
  'PENDING',
  'PAID',
  'AUTHORIZED',
  'CAPTURED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FAILED',
  'CANCELLED',
] as const;

export const ADMIN_PAYOUT_STATUSES = ['NONE', 'SCHEDULED', 'PAID', 'FAILED'] as const;

export const ADMIN_DEPOSIT_STATUSES = [
  'NONE',
  'AUTHORIZED',
  'RELEASED',
  'CAPTURED',
  'FAILED',
] as const;

export class QueryAdminBookingsDto {
  @ApiPropertyOptional({ enum: ADMIN_BOOKING_STATUSES })
  @IsOptional()
  @IsIn(ADMIN_BOOKING_STATUSES)
  status?: (typeof ADMIN_BOOKING_STATUSES)[number];

  @ApiPropertyOptional({ enum: ADMIN_PAYMENT_STATUSES })
  @IsOptional()
  @IsIn(ADMIN_PAYMENT_STATUSES)
  paymentStatus?: (typeof ADMIN_PAYMENT_STATUSES)[number];

  @ApiPropertyOptional({ enum: ADMIN_PAYOUT_STATUSES })
  @IsOptional()
  @IsIn(ADMIN_PAYOUT_STATUSES)
  payoutStatus?: (typeof ADMIN_PAYOUT_STATUSES)[number];

  @ApiPropertyOptional({ enum: ADMIN_DEPOSIT_STATUSES })
  @IsOptional()
  @IsIn(ADMIN_DEPOSIT_STATUSES)
  depositStatus?: (typeof ADMIN_DEPOSIT_STATUSES)[number];

  @ApiPropertyOptional({ example: 'clxyz123property456' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ example: 'clxyz123guest456' })
  @IsOptional()
  @IsString()
  guestId?: string;

  @ApiPropertyOptional({ example: 'clxyz123host456', description: 'Host profile id' })
  @IsOptional()
  @IsString()
  hostId?: string;

  @ApiPropertyOptional({ example: 'apartment' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-01-01', format: 'date' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31', format: 'date' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  @Type(() => Number)
  limit?: number = DEFAULT_PAGE_SIZE;
}
