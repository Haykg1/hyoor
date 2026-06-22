import { IsOptional, IsString, IsUUID } from 'class-validator';

export class BulkImportConfirmDto {
  @IsUUID()
  previewId!: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
