import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateDepositClaimDto {
  @ApiProperty({ example: 15000, description: 'Amount to claim, in minor currency units' })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ example: 'Guest left cigarette burns on the sofa upholstery.' })
  @IsString()
  @MinLength(10)
  reason!: string;

  @ApiPropertyOptional({ type: [String], description: 'S3 keys for evidence photos' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceKeys?: string[];
}
