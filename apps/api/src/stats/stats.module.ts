import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService, DashboardService],
})
export class StatsModule {}
