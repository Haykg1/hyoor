import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class PaymentRefDto {
  @ApiProperty({ example: 'stripe_pi_3NxAbCdEfGhIjKlM', minLength: 1 })
  @IsString()
  @MinLength(1)
  externalPaymentRef!: string;
}
