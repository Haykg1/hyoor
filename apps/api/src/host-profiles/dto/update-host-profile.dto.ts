import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

import { CreateHostProfileDto } from './create-host-profile.dto';

export class UpdateHostProfileDto extends PartialType(CreateHostProfileDto) {
  @ApiPropertyOptional({ example: 'payout@example.com' })
  @IsOptional()
  @IsEmail()
  payoutEmail?: string;
}
