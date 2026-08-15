import { IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { ATTACHMENT_AREAS } from '@task-guild/shared';

export class PresignDto {
  @IsString()
  area: (typeof ATTACHMENT_AREAS)[number];

  @IsString()
  fileName: string;

  @IsString()
  logicalName: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  size?: number;
}

export class ConfirmDto {
  @IsString()
  area: (typeof ATTACHMENT_AREAS)[number];

  @IsString()
  logicalName: string;

  @IsString()
  storageKey: string;

  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsInt()
  @Min(1)
  sizeBytes: number;

  @IsOptional()
  @IsString()
  sha256?: string;
}

export class DirectUploadBody {
  @IsString()
  storageKey: string;

  @IsString()
  area: (typeof ATTACHMENT_AREAS)[number];

  @IsString()
  logicalName: string;

  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsOptional()
  @IsISO8601()
  createdAt?: string;
}
