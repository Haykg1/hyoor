import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

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
}
