import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class SuggestPoiPhotosDto {
  @ApiPropertyOptional({ example: 'Republic Square Yerevan fountain', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  query?: string;
}

export class ImportPoiPhotoDto {
  @ApiProperty({ example: 'https://upload.wikimedia.org/.../Republic_Square.jpg' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2000)
  url!: string;

  @ApiPropertyOptional({ example: 'Photo by Jane Doe, CC BY-SA 4.0', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  attribution?: string;

  @ApiPropertyOptional({ example: 'CC BY-SA 4.0', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  license?: string;

  @ApiPropertyOptional({ example: 'https://commons.wikimedia.org/wiki/File:...', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sourceUrl?: string;
}

export class SetPoiPhotoStatusDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';
}
