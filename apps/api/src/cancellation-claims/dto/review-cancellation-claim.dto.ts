import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const CANCELLATION_FEE_CLAIM_REVIEW_STATUSES = ['APPROVED', 'REJECTED'] as const;

export class ReviewCancellationClaimDto {
  @ApiProperty({ enum: CANCELLATION_FEE_CLAIM_REVIEW_STATUSES })
  @IsIn(CANCELLATION_FEE_CLAIM_REVIEW_STATUSES)
  status!: (typeof CANCELLATION_FEE_CLAIM_REVIEW_STATUSES)[number];

  @ApiPropertyOptional({ example: 'Guest confirmed they asked the host to cancel; fee applies.' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
