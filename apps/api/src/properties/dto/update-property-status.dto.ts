import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const PROPERTY_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
] as const;

export class UpdatePropertyStatusDto {
  @ApiProperty({ enum: PROPERTY_STATUSES, example: 'ACTIVE' })
  @IsIn(PROPERTY_STATUSES)
  status!: (typeof PROPERTY_STATUSES)[number];
}
