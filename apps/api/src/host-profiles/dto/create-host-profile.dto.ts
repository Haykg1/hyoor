import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const HOST_TYPES = ['INDIVIDUAL', 'COMPANY'] as const;

export type HostTypeDto = (typeof HOST_TYPES)[number];

export class CreateHostProfileDto {
  @ApiProperty({ enum: HOST_TYPES, example: 'INDIVIDUAL' })
  @IsIn(HOST_TYPES)
  hostType!: HostTypeDto;

  @ApiPropertyOptional({ example: 'RentStar LLC', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ example: 'REG-123456', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyRegNumber?: string;

  @ApiPropertyOptional({ example: 'VAT-789012', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vatNumber?: string;
}
