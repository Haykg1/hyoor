import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { POI_DESTINATION_CATEGORIES, POI_PRICE_BANDS, POI_STATUSES } from '@repo/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class PoiLabelsDto {
  @ApiProperty({ example: 'Republic Square' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  en!: string;

  @ApiProperty({ example: 'Հանրապետության հրապարակ' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  hy!: string;

  @ApiProperty({ example: 'Площадь Республики' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  ru!: string;
}

class PoiDescriptionLabelsDto {
  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  en!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  hy!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  ru!: string;
}

class PoiAttributesDto {
  @ApiPropertyOptional({ example: 8000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  averageMealAmd?: number;

  @ApiPropertyOptional({ enum: POI_PRICE_BANDS })
  @IsOptional()
  @IsIn([...POI_PRICE_BANDS])
  priceBand?: (typeof POI_PRICE_BANDS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  servesAlcohol?: boolean;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  @Type(() => Number)
  typicalDurationMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  openingHoursNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({ example: 'https://example.com/menu' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  websiteMenu?: string;

  @ApiPropertyOptional({ example: '+374 10 59 11 99' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;
}

export class CreateAdminPoiDto {
  @ApiPropertyOptional({ example: 'republic_square' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @ApiProperty({ example: 'Yerevan' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 'Yerevan' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  region!: string;

  @ApiPropertyOptional({ example: 'AM' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  country?: string;

  @ApiProperty({ example: 40.17764 })
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 44.51139 })
  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @ApiProperty({ enum: POI_DESTINATION_CATEGORIES })
  @IsIn([...POI_DESTINATION_CATEGORIES])
  category!: (typeof POI_DESTINATION_CATEGORIES)[number];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ type: PoiLabelsDto })
  @ValidateNested()
  @Type(() => PoiLabelsDto)
  nameLabels!: PoiLabelsDto;

  @ApiProperty({ type: PoiDescriptionLabelsDto })
  @ValidateNested()
  @Type(() => PoiDescriptionLabelsDto)
  descriptionLabels!: PoiDescriptionLabelsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  wikipediaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  wikipediaUrl?: string;

  @ApiPropertyOptional({ type: PoiAttributesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PoiAttributesDto)
  @IsObject()
  attributes?: PoiAttributesDto;

  @ApiPropertyOptional({ enum: POI_STATUSES })
  @IsOptional()
  @IsIn([...POI_STATUSES])
  status?: (typeof POI_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  usableInPlanner?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}
