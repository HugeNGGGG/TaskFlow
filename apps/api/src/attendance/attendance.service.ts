import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hasRole } from '@task-guild/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  CorrectionDto,
  LeaveDto,
  PunchDto,
  ReviewCorrectionDto,
  UpdateCompanySettingsDto,
} from './dto';
import {
  localDayEndUtc,
  localDayStartUtc,
  pairDayPunches,
  toLocalDateString,
} from './pairing';

const MAX_FUTURE_MS = 5 * 60 * 1000;
const MAX_PAST_MS = 60 * 60 * 1000;

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getToday(userId: string) {
    const date = toLocalDateString(new Date());
    return {
      date,
      punches: await this.prisma.punchRecord.findMany({
        where: {
          userId,
          punchTime: { gte: localDayStartUtc(date), lte: localDayEndUtc(date) },
        },
        orderBy: { punchTime: 'asc' },
      }),
    };
  }

  async punch(userId: string, dto: PunchDto) {
    const now = new Date();
    const punchAt = dto.punchTime ? new Date(dto.punchTime) : now;
    if (Number.isNaN(punchAt.getTime())) {
      throw new BadRequestException('打卡时间格式不正确');
    }
    const diff = punchAt.getTime() - now.getTime();
    if (diff > MAX_FUTURE_MS || diff < -MAX_PAST_MS) {
      throw new BadRequestException(
        '打卡时间超出允许范围（不得晚于当前 5 分钟或早于 1 小时），超范围请发起补卡申请',
      );
    }
    const date = toLocalDateString(punchAt);
    const last = await this.prisma.punchRecord.findFirst({
      where: {
        userId,
        punchTime: { gte: localDayStartUtc(date), lte: localDayEndUtc(date) },
      },
      orderBy: { punchTime: 'desc' },
    });
    if (last?.type === dto.type) {
      throw new ConflictException(
        dto.type === 'IN'
          ? '今天已完成上班打卡，请勿重复提交'
          : '今天已完成下班打卡，请勿重复提交',
      );
    }
    const hasGps = dto.latitude != null && dto.longitude != null;
    const punch = await this.prisma.punchRecord.create({
      data: {
        userId,
        type: dto.type,
        punchTime: punchAt,
        workContent: dto.workContent,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        source: hasGps ? 'GPS' : 'MANUAL',
      },
    });
    await this.recomputeDay(userId, date);
    return punch;
  }

  async sessions(userId: string, month?: string) {
    const target = month ?? toLocalDateString(new Date()).slice(0, 7);
    const sessions = await this.prisma.workSession.findMany({
      where: { userId, date: { startsWith: target } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    const totalMinutes = sessions.reduce(
      (sum, item) => sum + (item.durationMinutes ?? 0),
      0,
    );
    const settings = await this.getSettings();
    const standardMinutes = settings.standardWorkHours * 60;
    return {
      month: target,
      sessions,
      summary: {
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        standardHours: settings.standardWorkHours,
        overtimeHours:
          totalMinutes > standardMinutes
            ? Math.round(((totalMinutes - standardMinutes) / 60) * 100) / 100
            : 0,
        sessionCount: sessions.length,
      },
    };
  }

  async createCorrection(userId: string, dto: CorrectionDto) {
    const session = await this.prisma.workSession.findUnique({
      where: { id: dto.sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('工作时段不存在');
    }
    const expectedType =
      session.status === 'MISSING_OUT'
        ? 'OUT'
        : session.status === 'MISSING_IN'
          ? 'IN'
          : null;
    if (!expectedType) {
      throw new BadRequestException('仅异常时段可发起补卡');
    }
    if (dto.type !== expectedType) {
      throw new BadRequestException('补卡类型与该异常不匹配');
    }
    const requestedAt = new Date(dto.requestedTime);
    if (Number.isNaN(requestedAt.getTime())) {
      throw new BadRequestException('补卡时间格式不正确');
    }
    if (requestedAt.getTime() > Date.now() + MAX_FUTURE_MS) {
      throw new BadRequestException('补卡时间不能晚于当前 5 分钟');
    }
    if (expectedType === 'OUT' && requestedAt.getTime() <= session.startTime.getTime()) {
      throw new BadRequestException('下班补卡时间需晚于上班打卡时间');
    }
    if (
      expectedType === 'IN' &&
      session.endTime &&
      requestedAt.getTime() >= session.endTime.getTime()
    ) {
      throw new BadRequestException('上班补卡时间需早于下班打卡时间');
    }
    const pending = await this.prisma.correctionRequest.findFirst({
      where: { sessionId: session.id, status: 'PENDING' },
    });
    if (pending) {
      throw new ConflictException('该时段已有待审批的补卡申请');
    }
    return this.prisma.correctionRequest.create({
      data: {
        userId,
        sessionId: session.id,
        date: session.date,
        type: dto.type,
        requestedTime: requestedAt,
        reason: dto.reason,
      },
    });
  }

  async listCorrections(userId: string, status?: string) {
    return this.prisma.correctionRequest.findMany({
      where: { userId, ...(status ? { status: status as never } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelCorrection(userId: string, id: string) {
    const correction = await this.prisma.correctionRequest.findUnique({
      where: { id },
    });
    if (!correction || correction.userId !== userId) {
      throw new NotFoundException('补卡申请不存在');
    }
    if (correction.status !== 'PENDING') {
      throw new BadRequestException('仅待审批的申请可取消');
    }
    return this.prisma.correctionRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async createLeave(userId: string, dto: LeaveDto) {
    if (dto.startDate > dto.endDate) {
      throw new BadRequestException('开始日期不能晚于结束日期');
    }
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: dto.endDate },
        endDate: { gte: dto.startDate },
      },
    });
    if (overlap) {
      throw new ConflictException('该日期范围与已有待审批或已批准的请假重叠');
    }
    return this.prisma.leaveRequest.create({
      data: {
        userId,
        leaveType: dto.leaveType,
        startDate: dto.startDate,
        endDate: dto.endDate,
        reason: dto.reason,
      },
    });
  }

  async listLeaves(userId: string, status?: string) {
    return this.prisma.leaveRequest.findMany({
      where: { userId, ...(status ? { status: status as never } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSettings() {
    return (
      (await this.prisma.companySetting.findUnique({ where: { id: 'default' } })) ??
      this.defaultSettings()
    );
  }

  async updateSettings(dto: UpdateCompanySettingsDto) {
    await this.prisma.companySetting.upsert({
      where: { id: 'default' },
      update: {
        ...(dto.standardWorkHours !== undefined
          ? { standardWorkHours: dto.standardWorkHours }
          : {}),
        ...(dto.deductLunch !== undefined ? { deductLunch: dto.deductLunch } : {}),
        ...(dto.lunchStart !== undefined ? { lunchStart: dto.lunchStart } : {}),
        ...(dto.lunchEnd !== undefined ? { lunchEnd: dto.lunchEnd } : {}),
        ...(dto.workdays !== undefined ? { workdays: dto.workdays } : {}),
      },
      create: {
        id: 'default',
        standardWorkHours: dto.standardWorkHours ?? 8,
        deductLunch: dto.deductLunch ?? false,
        lunchStart: dto.lunchStart ?? '12:00',
        lunchEnd: dto.lunchEnd ?? '13:00',
        workdays: dto.workdays ?? 'MON,TUE,WED,THU,FRI',
      },
    });
    return this.getSettings();
  }

  async adminCorrections(status?: string) {
    return this.prisma.correctionRequest.findMany({
      where: status ? { status: status as never } : {},
      include: { user: { select: { id: true, nickname: true, username: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewCorrection(
    reviewer: { id: string; roleMask: number },
    id: string,
    dto: ReviewCorrectionDto,
  ) {
    if (!hasRole(reviewer.roleMask, 'MANAGER')) {
      throw new ForbiddenException('仅发布官或管理员可审批补卡');
    }
    const correction = await this.prisma.correctionRequest.findUnique({
      where: { id },
    });
    if (!correction) {
      throw new NotFoundException('补卡申请不存在');
    }
    if (correction.status !== 'PENDING') {
      throw new BadRequestException('仅待审批申请可处理');
    }
    const updated = await this.prisma.correctionRequest.update({
      where: { id },
      data: {
        status: dto.decision,
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
        adminNote: dto.adminNote,
      },
    });
    if (dto.decision === 'APPROVED') {
      await this.prisma.punchRecord.create({
        data: {
          userId: updated.userId,
          type: updated.type,
          punchTime: updated.requestedTime,
          workContent: '补卡',
          source: 'MANUAL',
        },
      });
      await this.recomputeDay(updated.userId, updated.date);
    }
    return updated;
  }

  async adminLeaveRequests(status?: string) {
    return this.prisma.leaveRequest.findMany({
      where: status ? { status: status as never } : {},
      include: { user: { select: { id: true, nickname: true, username: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewLeave(
    reviewer: { id: string; roleMask: number },
    id: string,
    decision: 'APPROVED' | 'REJECTED',
  ) {
    if (!hasRole(reviewer.roleMask, 'MANAGER')) {
      throw new ForbiddenException('仅发布官或管理员可审批请假');
    }
    const leave = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) {
      throw new NotFoundException('请假申请不存在');
    }
    if (leave.status !== 'PENDING') {
      throw new BadRequestException('仅待审批申请可处理');
    }
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: decision, approverId: reviewer.id, reviewedAt: new Date() },
    });
  }

  async adminToday(date?: string) {
    const target = date ?? toLocalDateString(new Date());
    return this.prisma.punchRecord.findMany({
      where: {
        punchTime: { gte: localDayStartUtc(target), lte: localDayEndUtc(target) },
      },
      include: { user: { select: { id: true, nickname: true, username: true } } },
      orderBy: { punchTime: 'asc' },
    });
  }

  async dashboard(month: string) {
    const users = await this.prisma.user.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        nickname: true,
        username: true,
        department: { select: { name: true } },
      },
    });
    const sessions = await this.prisma.workSession.findMany({
      where: { date: { startsWith: month } },
      select: {
        userId: true,
        durationMinutes: true,
        status: true,
      },
    });
    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: `${month}-31` },
        endDate: { gte: `${month}-01` },
      },
      select: {
        userId: true,
        startDate: true,
        endDate: true,
      },
    });
    const leaveMap = new Map<string, number>();
    for (const leave of leaves) {
      const start = leave.startDate < `${month}-01` ? `${month}-01` : leave.startDate;
      const end = leave.endDate > `${month}-31` ? `${month}-31` : leave.endDate;
      const days =
        Math.floor(
          (new Date(`${end}T00:00:00+08:00`).getTime() -
            new Date(`${start}T00:00:00+08:00`).getTime()) /
            (24 * 60 * 60 * 1000),
        ) + 1;
      leaveMap.set(
        leave.userId,
        (leaveMap.get(leave.userId) ?? 0) + Math.max(days, 0),
      );
    }
    const sessionMap = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const list = sessionMap.get(session.userId) ?? [];
      list.push(session);
      sessionMap.set(session.userId, list);
    }
    const rows = users.map((user) => {
      const userSessions = sessionMap.get(user.id) ?? [];
      const totalMinutes = userSessions.reduce(
        (sum, session) => sum + (session.durationMinutes ?? 0),
        0,
      );
      const leaveDays = leaveMap.get(user.id) ?? 0;
      return {
        user: {
          id: user.id,
          nickname: user.nickname,
          username: user.username,
          departmentName: user.department?.name ?? '未分配部门',
        },
        sessionCount: userSessions.length,
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        abnormalCount: userSessions.filter((session) =>
          ['MISSING_IN', 'MISSING_OUT'].includes(session.status),
        ).length,
        leaveDays,
      };
    });
    const activeUserCount = users.length;
    const attendedUserCount = rows.filter((row) => row.sessionCount > 0).length;
    const totalMinutes = rows.reduce((sum, row) => sum + row.totalMinutes, 0);
    const settings = await this.getSettings();
    const standardMinutes = settings.standardWorkHours * 60;
    const totalOvertimeMinutes = Math.max(
      totalMinutes - standardMinutes * attendedUserCount,
      0,
    );
    const totalLeaveDays = rows.reduce((sum, row) => sum + row.leaveDays, 0);
    const averageHours =
      attendedUserCount > 0
        ? Math.round((totalMinutes / attendedUserCount / 60) * 100) / 100
        : 0;
    return {
      month,
      activeUserCount,
      attendedUserCount,
      attendanceRate:
        activeUserCount > 0
          ? Math.round((attendedUserCount / activeUserCount) * 10000) / 100
          : 0,
      averageHours,
      standardWorkHours: settings.standardWorkHours,
      totalOvertimeHours:
        Math.round((totalOvertimeMinutes / 60) * 100) / 100,
      totalLeaveDays,
      rows,
    };
  }

  async exportCsv(month: string): Promise<string> {
    const data = await this.dashboard(month);
    const header = [
      '昵称',
      '账号',
      '部门',
      '工作时段数',
      '总工时',
      '异常时段数',
    ];
    const rows = data.rows.map((row) => [
      row.user.nickname,
      row.user.username,
      row.user.departmentName,
      String(row.sessionCount),
      String(row.totalHours),
      String(row.abnormalCount),
    ]);
    return [header, ...rows]
      .map((row) => row.map((cell) => this.escapeCsv(cell)).join(','))
      .join('\r\n');
  }

  private escapeCsv(value: string): string {
    if (/[",\r\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  async recomputeDay(userId: string, date: string) {
    const settings = await this.getSettings();
    const prev = toLocalDateString(
      new Date(localDayStartUtc(date).getTime() - 24 * 60 * 60 * 1000),
    );
    const next = toLocalDateString(
      new Date(localDayEndUtc(date).getTime() + 24 * 60 * 60 * 1000),
    );
    const punches = await this.prisma.punchRecord.findMany({
      where: {
        userId,
        punchTime: { gte: localDayStartUtc(prev), lte: localDayEndUtc(next) },
      },
      orderBy: { punchTime: 'asc' },
    });
    const results = pairDayPunches(
      punches.map((p) => ({ type: p.type, punchTime: p.punchTime })),
      settings,
    );
    for (const day of [prev, date, next]) {
      await this.prisma.correctionRequest.updateMany({
        where: { sessionId: { in: [] } },
        data: { sessionId: null },
      });
      const existing = await this.prisma.workSession.findMany({
        where: { userId, date: day },
      });
      await this.prisma.correctionRequest.updateMany({
        where: { sessionId: { in: existing.map((s) => s.id) } },
        data: { sessionId: null },
      });
      await this.prisma.workSession.deleteMany({ where: { userId, date: day } });
      const dayResults = results.filter((r) => r.date === day);
      if (dayResults.length > 0) {
        await this.prisma.workSession.createMany({
          data: dayResults.map((r) => ({
            userId,
            date: r.date,
            startTime: r.startTime,
            endTime: r.endTime,
            durationMinutes: r.durationMinutes,
            status: r.status,
            note: r.note,
          })),
        });
      }
    }
    return this.prisma.workSession.findMany({
      where: { userId, date },
      orderBy: { startTime: 'asc' },
    });
  }

  private defaultSettings() {
    return {
      id: 'default',
      standardWorkHours: 8,
      deductLunch: false,
      lunchStart: '12:00',
      lunchEnd: '13:00',
      workdays: 'MON,TUE,WED,THU,FRI',
    };
  }
}
