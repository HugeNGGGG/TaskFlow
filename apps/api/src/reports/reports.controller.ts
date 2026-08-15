import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../common/decorators';
import { ROLES } from '@task-guild/shared';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('export-tasks')
  @Roles(ROLES.MANAGER)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="task-guild-tasks.csv"',
  )
  async exportTasks(@Res() res: Response) {
    const csv = await this.reportsService.exportTasksCsv();
    res.send(csv);
  }
}
