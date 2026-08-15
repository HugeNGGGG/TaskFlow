import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ROLES, type XpRules } from '@task-guild/shared';
import {
  CurrentUser,
  Public,
  Roles,
  type RequestUser,
} from '../common/decorators';
import { GamificationService } from './gamification.service';

class ManualAdjustDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsInt()
  @Min(-100000)
  @Max(100000)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

class UpdateXpRulesDto {
  @IsNumber() urgentMultiplier: number;
  @IsNumber() onTimeBonusRate: number;
  @IsNumber() earlyBonusRate: number;
  @IsNumber() earlyThresholdHours: number;
  @IsNumber() latePenaltyRate: number;
  @IsNumber() rejectPenaltyRate: number;
  @IsNumber() minXp: number;
  @IsNumber() titlePointsReward: number;
}

@Controller()
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Public()
  @Get('gamification/levels')
  levels() {
    return this.gamification.levels();
  }

  @Public()
  @Get('gamification/titles')
  titles() {
    return this.gamification.titles();
  }

  @Get('gamification/me')
  mine(@CurrentUser() user: RequestUser) {
    return this.gamification.myTitles(user.id);
  }

  @Get('gamification/me/xp-ledger')
  ledger(@CurrentUser() user: RequestUser) {
    return this.gamification.xpLedger(user.id);
  }

  @Get('configs/xp-rules')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  getRules() {
    return this.gamification.getXpRules();
  }

  @Put('configs/xp-rules')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  updateRules(
    @Body() dto: UpdateXpRulesDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.gamification.updateXpRules(dto as XpRules, user.id);
  }

  @Post('xp/manual-adjust')
  @Roles(ROLES.ADMIN)
  async manualAdjust(
    @Body() dto: ManualAdjustDto,
    @CurrentUser() user: RequestUser,
  ) {
    await this.gamification.adjustXp(dto.userId, dto.amount, user.id);
    return { ok: true };
  }
}
