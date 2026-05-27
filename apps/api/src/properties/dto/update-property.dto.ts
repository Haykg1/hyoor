import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { CreatePropertyDto } from './create-property.dto';

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {
  @ApiPropertyOptional({
    example: true,
    description:
      'Toggle whether this property appears in the home "Featured Stays" section. Hosts control their own listings.',
  })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}
