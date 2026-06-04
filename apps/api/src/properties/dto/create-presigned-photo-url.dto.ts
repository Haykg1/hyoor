import { ApiProperty } from '@nestjs/swagger';
import type { CreatePresignedPhotoUrlInput } from '@repo/shared';
import { PhotoMimeTypes } from '@repo/shared';
import { IsIn } from 'class-validator';

export class CreatePresignedPhotoUrlDto implements CreatePresignedPhotoUrlInput {
  @ApiProperty({ enum: PhotoMimeTypes, example: 'image/jpeg' })
  @IsIn([...PhotoMimeTypes])
  mimeType!: CreatePresignedPhotoUrlInput['mimeType'];
}
