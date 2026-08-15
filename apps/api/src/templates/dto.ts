import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import type { AcceptMode, Difficulty } from '@task-guild/shared';

export class CreateTaskTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  titlePrefix: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  difficulty: Difficulty;

  @IsInt()
  @Min(0)
  xpReward: number;

  @IsInt()
  @Min(1)
  maxMembers: number;

  @IsString()
  acceptMode: AcceptMode;

  @IsBoolean()
  needReview: boolean;
}

export class UpdateTaskTemplateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  titlePrefix?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  difficulty?: Difficulty;

  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxMembers?: number;

  @IsOptional()
  @IsString()
  acceptMode?: AcceptMode;

  @IsOptional()
  @IsBoolean()
  needReview?: boolean;
}
