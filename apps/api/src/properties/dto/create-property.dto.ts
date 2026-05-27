import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreatePropertyInput } from '@repo/shared';
import { CancellationPolicies, PropertyTypes } from '@repo/shared';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export const PROPERTY_TYPES = PropertyTypes;
export const CANCELLATION_POLICIES = CancellationPolicies;

export class CreatePropertyDto implements CreatePropertyInput {
  @ApiProperty({ example: 'Cascade View Apartment', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Spacious apartment with a view of Mount Ararat.', maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ enum: PROPERTY_TYPES, example: 'APARTMENT' })
  @IsIn(PROPERTY_TYPES)
  propertyType!: (typeof PROPERTY_TYPES)[number];

  @ApiProperty({ example: 'Yerevan', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 4, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxGuests!: number;

  @ApiPropertyOptional({ example: 2, minimum: 0, description: 'Max adults (0 = not specified)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxAdults?: number;

  @ApiPropertyOptional({ example: 2, minimum: 0, description: 'Max children (0 = not specified)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxChildren?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0, description: 'Max infants (0 = not specified)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxInfants?: number;

  @ApiProperty({ example: 2, minimum: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  bedrooms!: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  beds!: number;

  @ApiProperty({ example: 1.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bathrooms!: number;

  @ApiProperty({
    example: 28000,
    description: 'Price per night in minor currency units (e.g. AMD)',
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  pricePerNight!: number;

  @ApiProperty({ enum: CANCELLATION_POLICIES, example: 'MODERATE' })
  @IsIn(CANCELLATION_POLICIES)
  cancellationPolicy!: (typeof CANCELLATION_POLICIES)[number];

  @ApiPropertyOptional({ example: 'AM', maxLength: 2 })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ example: 'Kentron', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ example: '12 Cascade Ave', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  addressLine?: string;

  @ApiPropertyOptional({ example: 40.1872 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ example: 44.5152 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ example: 'AMD', maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 5000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  cleaningFee?: number;

  @ApiPropertyOptional({ example: 50000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  securityDeposit?: number;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minNights?: number;

  @ApiPropertyOptional({ example: 30, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxNights?: number;

  @ApiPropertyOptional({ example: '15:00', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  checkInTime?: string;

  @ApiPropertyOptional({ example: '11:00', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  checkOutTime?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  smokingAllowed?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  petsAllowed?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  partiesAllowed?: boolean;

  @ApiPropertyOptional({ example: '22:00', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  quietHoursStart?: string;

  @ApiPropertyOptional({ example: '08:00', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  quietHoursEnd?: string;

  @ApiPropertyOptional({ example: 'No shoes inside.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalRules?: string;

  @ApiPropertyOptional({ example: 'https://booking.example.com/listing/123' })
  @IsOptional()
  @IsUrl()
  externalBookingUrl?: string;
}
