import { ApiProperty } from '@nestjs/swagger';
import { PhotoMimeTypes } from '@repo/shared';
import type { PhotoMimeType } from '@repo/shared';
import { IsIn } from 'class-validator';

export class CreateDepositClaimPhotoPresignedUrlDto {
  @ApiProperty({ enum: PhotoMimeTypes, example: 'image/jpeg' })
  @IsIn(PhotoMimeTypes)
  mimeType!: PhotoMimeType;
}
