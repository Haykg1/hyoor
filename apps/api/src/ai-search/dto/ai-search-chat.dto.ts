import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AiSearchMessageRole } from '@repo/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const AI_SEARCH_MESSAGE_ROLES: AiSearchMessageRole[] = ['user', 'assistant'];
const MAX_AI_SEARCH_MESSAGES = 20;
const MAX_AI_SEARCH_MESSAGE_LENGTH = 500;

class AiSearchMessageDto {
  @ApiProperty({ enum: AI_SEARCH_MESSAGE_ROLES })
  @IsIn(AI_SEARCH_MESSAGE_ROLES)
  role!: AiSearchMessageRole;

  @ApiProperty({ maxLength: MAX_AI_SEARCH_MESSAGE_LENGTH })
  @IsString()
  @MaxLength(MAX_AI_SEARCH_MESSAGE_LENGTH)
  content!: string;
}

export class AiSearchChatDto {
  @ApiProperty({ type: [AiSearchMessageDto], maxItems: MAX_AI_SEARCH_MESSAGES })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_AI_SEARCH_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => AiSearchMessageDto)
  messages!: AiSearchMessageDto[];

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;
}
