import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const REVIEW_TARGETS = ['PROPERTY', 'GUEST'] as const;

export class CreateReviewDto {
  @ApiProperty({ example: 'clxyz123booking456' })
  @IsString()
  bookingId!: string;

  @ApiProperty({ enum: REVIEW_TARGETS, example: 'PROPERTY' })
  @IsIn(REVIEW_TARGETS)
  target!: (typeof REVIEW_TARGETS)[number];

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating!: number;

  @ApiPropertyOptional({ example: 'Great stay, highly recommend!', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
