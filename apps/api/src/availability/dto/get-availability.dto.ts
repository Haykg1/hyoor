import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class GetAvailabilityDto {
  @ApiProperty({ example: '2026-06-01', format: 'date' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-06-30', format: 'date' })
  @IsDateString()
  to!: string;
}
