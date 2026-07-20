import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

const MAX_BULK_RESOLVE = 100;

export class BulkResolvePaymentFailuresDto {
  @ApiProperty({ type: [String], minItems: 1, maxItems: MAX_BULK_RESOLVE })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_RESOLVE)
  @IsString({ each: true })
  ids!: string[];
}
