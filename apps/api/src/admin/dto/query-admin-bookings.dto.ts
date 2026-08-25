import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatuses, PaymentStatuses } from '@repo/shared';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@repo/shared/constants';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryAdminBookingsDto {
  @ApiPropertyOptional({ enum: BookingStatuses })
  @IsOptional()
  @IsIn(BookingStatuses)
  status?: (typeof BookingStatuses)[number];

  @ApiPropertyOptional({ enum: PaymentStatuses })
  @IsOptional()
  @IsIn(PaymentStatuses)
  paymentStatus?: (typeof PaymentStatuses)[number];

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

  @ApiPropertyOptional({
    example: 'apartment',
    description: 'Match booking id, guest/host name, email, or property title',
  })
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
