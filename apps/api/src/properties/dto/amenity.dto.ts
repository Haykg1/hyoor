import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AmenityDto {
  @ApiProperty({ example: 'WiFi', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Essentials', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ example: 'wifi', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  iconKey?: string;
}
