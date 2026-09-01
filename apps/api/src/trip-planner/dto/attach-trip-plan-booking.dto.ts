import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class AttachTripPlanBookingDto {
  @ApiProperty()
  @IsString()
  @MaxLength(40)
  bookingId!: string;
}
