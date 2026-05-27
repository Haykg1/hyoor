import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider } from '@repo/database/client';
import { IsEnum } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.IDRAM })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;
}
