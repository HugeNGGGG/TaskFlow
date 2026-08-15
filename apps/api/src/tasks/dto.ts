import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ACCEPT_MODES, DIFFICULTIES } from '@task-guild/shared';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsEnum(DIFFICULTIES)
  difficulty: (typeof DIFFICULTIES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  xpReward?: number;

  @IsISO8601()
  deadlineAt: string;

  @IsEnum(ACCEPT_MODES)
  acceptMode: (typeof ACCEPT_MODES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxMembers?: number;

  @IsOptional()
  @IsBoolean()
  needReview?: boolean;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @IsOptional()
  @IsIn(['draft', 'open'])
  status?: 'draft' | 'open';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  assigneeIds?: string[];

  @IsOptional()
  @IsString()
  captainId?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsEnum(DIFFICULTIES)
  difficulty?: (typeof DIFFICULTIES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  xpReward?: number;

  @IsOptional()
  @IsISO8601()
  deadlineAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxMembers?: number;

  @IsOptional()
  @IsBoolean()
  needReview?: boolean;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;
}

export class CancelTaskDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssignDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMaxSize(50)
  userIds: string[];

  @IsOptional()
  @IsString()
  captainId?: string;
}

export class CaptainDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class ProgressDto {
  @IsInt()
  @Min(0)
  @Max(100)
  percent: number;

  @IsOptional()
  @IsString()
  content?: string;
}

export class SubmitDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  submitAll?: boolean;
}

export class ReviewDto {
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @ValidateIf((dto: ReviewDto) => dto.decision === 'rejected')
  @IsString()
  @IsNotEmpty()
  reason?: string;
}

export class ExtensionDto {
  @IsISO8601()
  requestedDeadline: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class DecideExtensionDto {
  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
