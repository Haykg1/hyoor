import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class PaymentRefDto {
  @ApiProperty({ example: 'idram_txn_3NxAbCdEfGhIjKlM', minLength: 1 })
  @IsString()
  @MinLength(1)
  externalPaymentRef!: string;
}
