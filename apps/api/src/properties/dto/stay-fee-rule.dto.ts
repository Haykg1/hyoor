import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StayFeeDepositTypes } from '@repo/shared';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateIf } from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class StayFeeRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ nullable: true, example: '2026-06-01' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @Matches(ISO_DATE)
  dateFrom?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-08-31' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @Matches(ISO_DATE)
  dateTo?: string | null;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minNights!: number;

  @ApiPropertyOptional({ nullable: true, example: 6, minimum: 1 })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxNights?: number | null;

  @ApiProperty({ example: 1000, minimum: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  cleaningFee!: number;

  @ApiProperty({ enum: StayFeeDepositTypes, example: 'FIXED' })
  @IsIn(StayFeeDepositTypes)
  depositType!: (typeof StayFeeDepositTypes)[number];

  @ApiProperty({
    example: 5000,
    description: 'Minor units when FIXED; 0–100 when PERCENT',
  })
  @IsInt()
  @Min(0)
  @ValidateIf((rule: StayFeeRuleDto) => rule.depositType === 'PERCENT')
  @Max(100)
  @Type(() => Number)
  depositValue!: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}
