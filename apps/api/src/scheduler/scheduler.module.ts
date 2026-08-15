import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OverdueService } from './overdue.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [OverdueService],
})
export class SchedulerModule {}
