import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateHostPlatformFeeDto {
  @ApiPropertyOptional({
    example: 9,
    minimum: 0,
    maximum: 100,
    nullable: true,
    description:
      'Negotiated platform fee percent for this host. Omit/null to use the platform default.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  platformFeePercent?: number | null;
}
