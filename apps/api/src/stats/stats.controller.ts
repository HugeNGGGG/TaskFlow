import { Controller, Get, Query } from '@nestjs/common';
import { ROLES } from '@task-guild/shared';
import { CurrentUser, Roles, type RequestUser } from '../common/decorators';
import { DashboardService } from './dashboard.service';
import { StatsService } from './stats.service';

@Controller()
export class StatsController {
  constructor(
    private readonly stats: StatsService,
    private readonly dashboard: DashboardService,
  ) {}

  @Get('stats/me')
  me(@CurrentUser() user: RequestUser) {
    return this.stats.me(user.id);
  }

  @Get('stats/leaderboard')
  leaderboard(@Query('period') period?: string) {
    const value = ['month', 'quarter', 'year'].includes(period ?? '')
      ? (period as 'month' | 'quarter' | 'year')
      : 'month';
    return this.stats.leaderboard(value);
  }

  @Get('stats/members')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  members() {
    return this.stats.members();
  }

  @Get('dashboard/overview')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  overview() {
    return this.dashboard.overview();
  }

  @Get('dashboard/by-category')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  byCategory() {
    return this.dashboard.byCategory();
  }

  @Get('dashboard/by-department')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  byDepartment() {
    return this.dashboard.byDepartment();
  }

  @Get('dashboard/trend')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  trend(@Query('range') range?: string) {
    return this.dashboard.trend(range === '30d' ? '30d' : '7d');
  }
}
