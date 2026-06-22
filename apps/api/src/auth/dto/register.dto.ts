import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SPOKEN_LANGUAGES } from '@repo/shared';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'guest@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Anna' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Guest' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  wantsToHost?: boolean;

  @ApiPropertyOptional({
    example: ['en', 'ru'],
    description: 'ISO 639-1 language codes the user speaks',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsIn(SPOKEN_LANGUAGES.map((l) => l.code), { each: true })
  spokenLanguages?: string[];
}
