import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: 'Property id used to resolve the host' })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;
}
