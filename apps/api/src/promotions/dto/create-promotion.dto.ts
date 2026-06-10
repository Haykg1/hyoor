import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreatePromotionInput } from '@repo/shared';
import { PROMOTION_DISCOUNT_TYPES, PROMOTION_TYPES } from '@repo/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const PROMO_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;

export class CreatePromotionDto implements CreatePromotionInput {
  @ApiProperty()
  @IsString()
  propertyId!: string;

  @ApiProperty({ enum: PROMOTION_TYPES })
  @IsIn(PROMOTION_TYPES)
  type!: CreatePromotionInput['type'];

  @ApiProperty({ enum: PROMOTION_DISCOUNT_TYPES })
  @IsIn(PROMOTION_DISCOUNT_TYPES)
  discountType!: CreatePromotionInput['discountType'];

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @ValidateIf((dto: CreatePromotionDto) => dto.discountType === 'PERCENT')
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  discountPercent?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @ValidateIf((dto: CreatePromotionDto) => dto.discountType === 'FIXED_AMOUNT')
  @IsInt()
  @Min(1)
  @Type(() => Number)
  discountAmount?: number;

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ example: '2026-06-10' })
  @IsISO8601({ strict: true })
  bookingStartDate!: string;

  @ApiProperty({ example: '2026-06-20' })
  @IsISO8601({ strict: true })
  bookingEndDate!: string;

  @ApiPropertyOptional({ example: 'SUMMER20' })
  @ValidateIf((dto: CreatePromotionDto) => dto.type === 'PROMO_CODE')
  @IsString()
  @Matches(PROMO_CODE_PATTERN, {
    message: 'Promo code must be 3–32 uppercase letters, numbers, _ or -',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  promoCode?: string;

  @ApiProperty({ minimum: 1, maximum: 10000 })
  @IsInt()
  @Min(1)
  @Max(10000)
  @Type(() => Number)
  maxApplications!: number;

  @ApiProperty()
  @IsBoolean()
  notifyGuests!: boolean;
}
