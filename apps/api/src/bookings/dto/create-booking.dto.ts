import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'clxyz123property456' })
  @IsString()
  propertyId!: string;

  @ApiProperty({ example: '2026-07-01', format: 'date' })
  @IsDateString()
  checkIn!: string;

  @ApiProperty({ example: '2026-07-05', format: 'date' })
  @IsDateString()
  checkOut!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guestCount!: number;

  @ApiPropertyOptional({ example: 'Late check-in around 22:00 please.' })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({ example: 'SUMMER20' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  promoCode?: string;
}
