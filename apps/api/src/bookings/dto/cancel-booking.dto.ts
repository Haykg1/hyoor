import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
  @ApiPropertyOptional({ example: 'Change of travel plans' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description:
      'Host/admin only. When true, apply the property cancellation fee before refunding. Ignored for guest cancels (fee always applied). Defaults to false (waive). Host-applied fees are held for admin review before capture and require a reason.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  applyCancellationFee?: boolean;
}
