import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class PunchDto {
  @IsIn(['IN', 'OUT'])
  type: 'IN' | 'OUT';

  @IsString()
  @IsNotEmpty()
  workContent: string;

  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @IsString()
  punchTime?: string;
}

export class CorrectionDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsIn(['IN', 'OUT'])
  type: 'IN' | 'OUT';

  @IsString()
  @IsNotEmpty()
  requestedTime: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class LeaveDto {
  @IsIn(['ANNUAL', 'SICK', 'PERSONAL', 'COMP_TIME', 'BUSINESS_TRIP'])
  leaveType: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'COMP_TIME' | 'BUSINESS_TRIP';

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReviewCorrectionDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class UpdateCompanySettingsDto {
  @IsOptional()
  @Min(0)
  standardWorkHours?: number;

  @IsOptional()
  @IsBoolean()
  deductLunch?: boolean;

  @IsOptional()
  @IsString()
  lunchStart?: string;

  @IsOptional()
  @IsString()
  lunchEnd?: string;

  @IsOptional()
  @IsString()
  workdays?: string;
}
