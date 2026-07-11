import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const DEPOSIT_CLAIM_REVIEW_STATUSES = ['APPROVED', 'REJECTED'] as const;

export class ReviewDepositClaimDto {
  @ApiProperty({ enum: DEPOSIT_CLAIM_REVIEW_STATUSES })
  @IsIn(DEPOSIT_CLAIM_REVIEW_STATUSES)
  status!: (typeof DEPOSIT_CLAIM_REVIEW_STATUSES)[number];

  @ApiPropertyOptional({ example: 'Evidence photos confirm the damage; deposit captured.' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
