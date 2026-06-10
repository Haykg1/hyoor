import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class BookingQuoteDto {
  @ApiProperty()
  @IsString()
  propertyId!: string;

  @ApiProperty({ example: '2026-07-01', format: 'date' })
  @IsDateString()
  checkIn!: string;

  @ApiProperty({ example: '2026-07-05', format: 'date' })
  @IsDateString()
  checkOut!: string;

  @ApiPropertyOptional({ example: 'SUMMER20' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  promoCode?: string;
}
