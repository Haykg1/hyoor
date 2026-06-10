import { ApiProperty } from '@nestjs/swagger';
import type { CompareSharePair } from '@repo/shared';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCompareShareDto implements CompareSharePair {
  @ApiProperty({ description: 'Property ID shown in the left compare column' })
  @IsString()
  @IsNotEmpty()
  leftId!: string;

  @ApiProperty({ description: 'Property ID shown in the right compare column' })
  @IsString()
  @IsNotEmpty()
  rightId!: string;
}
