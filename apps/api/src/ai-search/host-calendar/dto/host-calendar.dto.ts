import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AiSearchMessageRole } from '@repo/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const MESSAGE_ROLES: AiSearchMessageRole[] = ['user', 'assistant'];
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 500;

class HostCalendarMessageDto {
  @ApiProperty({ enum: MESSAGE_ROLES })
  @IsIn(MESSAGE_ROLES)
  role!: AiSearchMessageRole;

  @ApiProperty({ maxLength: MAX_MESSAGE_LENGTH })
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH)
  content!: string;
}

export class HostCalendarChatDto {
  @ApiProperty({ type: [HostCalendarMessageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => HostCalendarMessageDto)
  messages!: HostCalendarMessageDto[];

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;
}

class HostCalendarChangeEntryDto {
  @ApiProperty({ example: '2026-06-15' })
  @IsString()
  date!: string;

  @ApiProperty()
  @IsBoolean()
  isAvailable!: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  priceOverride?: number | null;
}

export class HostCalendarConfirmDto {
  @ApiProperty({ type: [HostCalendarChangeEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(366)
  @ValidateNested({ each: true })
  @Type(() => HostCalendarChangeEntryDto)
  entries!: HostCalendarChangeEntryDto[];

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;
}
