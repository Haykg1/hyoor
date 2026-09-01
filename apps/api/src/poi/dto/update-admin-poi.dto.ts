import { PartialType } from '@nestjs/swagger';

import { CreateAdminPoiDto } from './create-admin-poi.dto';

export class UpdateAdminPoiDto extends PartialType(CreateAdminPoiDto) {}
