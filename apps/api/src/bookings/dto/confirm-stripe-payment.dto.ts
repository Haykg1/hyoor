import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmStripePaymentDto {
  @ApiProperty({ example: 'pm_1P...', description: 'Stripe PaymentMethod ID from the SetupIntent' })
  @IsString()
  paymentMethodId!: string;
}
