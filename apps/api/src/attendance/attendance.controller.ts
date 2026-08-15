import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, Roles, type RequestUser } from '../common/decorators';
import { ROLES } from '@task-guild/shared';
import { AttendanceService } from './attendance.service';
import {
  CorrectionDto,
  LeaveDto,
  PunchDto,
  ReviewCorrectionDto,
  UpdateCompanySettingsDto,
} from './dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('today')
  today(@CurrentUser() user: RequestUser) {
    return this.attendanceService.getToday(user.id);
  }

  @Post('punch')
  punch(@CurrentUser() user: RequestUser, @Body() dto: PunchDto) {
    return this.attendanceService.punch(user.id, dto);
  }

  @Get('sessions')
  sessions(@CurrentUser() user: RequestUser, @Query('month') month?: string) {
    return this.attendanceService.sessions(user.id, month);
  }

  @Get('corrections')
  corrections(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
  ) {
    return this.attendanceService.listCorrections(user.id, status);
  }

  @Post('corrections')
  createCorrection(
    @CurrentUser() user: RequestUser,
    @Body() dto: CorrectionDto,
  ) {
    return this.attendanceService.createCorrection(user.id, dto);
  }

  @Patch('corrections/:id/cancel')
  cancelCorrection(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.attendanceService.cancelCorrection(user.id, id);
  }

  @Get('leaves')
  leaves(@CurrentUser() user: RequestUser, @Query('status') status?: string) {
    return this.attendanceService.listLeaves(user.id, status);
  }

  @Post('leaves')
  createLeave(@CurrentUser() user: RequestUser, @Body() dto: LeaveDto) {
    return this.attendanceService.createLeave(user.id, dto);
  }

  @Get('company-settings')
  settings() {
    return this.attendanceService.getSettings();
  }

  @Patch('company-settings')
  @Roles(ROLES.ADMIN)
  updateSettings(@Body() dto: UpdateCompanySettingsDto) {
    return this.attendanceService.updateSettings(dto);
  }

  @Get('admin/corrections')
  @Roles(ROLES.MANAGER)
  adminCorrections(@Query('status') status?: string) {
    return this.attendanceService.adminCorrections(status);
  }

  @Patch('admin/corrections/:id')
  @Roles(ROLES.MANAGER)
  reviewCorrection(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewCorrectionDto,
  ) {
    return this.attendanceService.reviewCorrection(user, id, dto);
  }

  @Get('admin/leaves')
  @Roles(ROLES.MANAGER)
  adminLeaves(@Query('status') status?: string) {
    return this.attendanceService.adminLeaveRequests(status);
  }

  @Patch('admin/leaves/:id')
  @Roles(ROLES.MANAGER)
  reviewLeave(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewCorrectionDto,
  ) {
    return this.attendanceService.reviewLeave(user, id, dto.decision);
  }

  @Get('admin/today')
  @Roles(ROLES.MANAGER)
  adminToday(@Query('date') date?: string) {
    return this.attendanceService.adminToday(date);
  }

  @Get('dashboard')
  @Roles(ROLES.MANAGER)
  dashboard(@Query('month') month?: string) {
    return this.attendanceService.dashboard(
      month ?? new Date().toISOString().slice(0, 7),
    );
  }

  @Get('export')
  @Roles(ROLES.MANAGER)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="attendance.csv"')
  async export(
    @Query('month') month: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.attendanceService.exportCsv(
      month ?? new Date().toISOString().slice(0, 7),
    );
    res.send(csv);
  }
}
