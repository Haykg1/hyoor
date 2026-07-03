import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmReviewPhotoUploadDto {
  @ApiProperty({ example: 'reviews/clxyz/uuid.jpg' })
  @IsString()
  key!: string;
}
