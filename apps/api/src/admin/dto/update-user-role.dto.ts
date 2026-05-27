import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { USER_ROLES } from './query-users.dto';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: USER_ROLES, example: 'HOST' })
  @IsIn(USER_ROLES)
  role!: (typeof USER_ROLES)[number];
}
