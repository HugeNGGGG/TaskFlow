import { Injectable, Logger } from '@nestjs/common';
import {
  DEFAULT_LEVELS,
  DEFAULT_XP_RULES,
  type LevelInfo,
  type TitleInfo,
  type XpRules,
} from '@task-guild/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Prisma } from '../generated/prisma/client';
import {
  computeLevelForXp,
  computeXpBreakdown,
  isoWeekKey,
  previousWeekKey,
} from './pure';

type Tx = Prisma.TransactionClient;

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getXpRules(): Promise<XpRules> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'xp_rules' },
    });
    if (!config) {
      return DEFAULT_XP_RULES;
    }
    return {
      ...DEFAULT_XP_RULES,
      ...(config.value as Partial<XpRules>),
    };
  }

  async updateXpRules(rules: XpRules, actorId: string): Promise<XpRules> {
    const merged = { ...DEFAULT_XP_RULES, ...rules };
    await this.prisma.systemConfig.upsert({
      where: { key: 'xp_rules' },
      update: { value: merged, updatedById: actorId },
      create: { key: 'xp_rules', value: merged, updatedById: actorId },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'update_xp_rules',
        targetType: 'system_config',
        targetId: 'xp_rules',
        detail: merged,
      },
    });
    return merged;
  }

  async levels(): Promise<LevelInfo[]> {
    const rows = await this.prisma.level.findMany({
      orderBy: { level: 'asc' },
    });
    return rows.map((row) => ({
      level: row.level,
      name: row.name,
      xpThreshold: row.xpThreshold,
      icon: row.icon,
      frame: row.frame,
    }));
  }

  async titles(): Promise<TitleInfo[]> {
    const rows = await this.prisma.title.findMany({
      orderBy: { code: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      conditionType: row.conditionType,
      conditionValue: row.conditionValue,
      pointsReward: row.pointsReward,
    }));
  }

  async adjustXp(
    userId: string,
    amount: number,
    actorId: string,
  ): Promise<void> {
    if (!Number.isInteger(amount) || amount === 0) {
      throw new Error('调整值必须是整数且不为 0');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.xpLedger.create({
        data: { userId, amount, reason: 'manual' },
      });
      await this.applyLedgerToStats(tx, userId, amount, amount > 0 ? amount : 0);
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'manual_xp_adjust',
          targetType: 'user',
          targetId: userId,
          detail: { amount },
        },
      });
    });
  }

  async settleTask(taskId: string): Promise<void> {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
    });
    if (task.status !== 'completed') {
      return;
    }
    const assignments = await this.prisma.taskAssignment.findMany({
      where: { taskId, status: 'completed', xpAwarded: null },
    });
    const rules = await this.getXpRules();

    for (const assignment of assignments) {
      await this.prisma.$transaction(async (tx) => {
        const again = await tx.taskAssignment.findUnique({
          where: { id: assignment.id },
        });
        if (!again || again.xpAwarded !== null) {
          return;
        }
        const rejectedCount = await tx.review.count({
          where: { assignmentId: assignment.id, decision: 'rejected' },
        });
        const completedAt = assignment.completedAt ?? new Date();
        const onTime = completedAt <= task.deadlineAt;
        const early =
          onTime &&
          task.deadlineAt.getTime() - completedAt.getTime() >=
            rules.earlyThresholdHours * 3600 * 1000;
        const late = completedAt > task.deadlineAt;
        const breakdown = computeXpBreakdown({
          base: task.xpReward,
          isUrgent: task.isUrgent,
          onTime,
          early,
          late,
          rejectedCount,
          rules,
        });
        const net = breakdown.net;

        for (const row of breakdown.rows) {
          if (row.amount !== 0) {
            await tx.xpLedger.create({
              data: {
                userId: assignment.userId,
                amount: row.amount,
                reason: row.reason as never,
                refTaskId: task.id,
              },
            });
          }
        }

        const durationSeconds = Math.max(
          0,
          Math.round(
            (completedAt.getTime() - assignment.joinedAt.getTime()) / 1000,
          ),
        );
        await this.applyLedgerToStats(
          tx,
          assignment.userId,
          net,
          breakdown.positive,
          {
            completed: true,
            onTime,
            late,
            durationSeconds,
            perfect: onTime && rejectedCount === 0,
          },
        );
        await tx.taskAssignment.update({
          where: { id: assignment.id },
          data: { xpAwarded: net },
        });

        await this.evaluateTitles(tx, assignment.userId);
        await this.notifications.create({
          userId: assignment.userId,
          type: 'xp_award',
          title: '委托完成，经验到账',
          content: `“${task.title}”结算完成，获得 ${net} 点经验。`,
          link: `/task/${task.id}`,
        });
      });
    }
  }

  private async applyLedgerToStats(
    tx: Tx,
    userId: string,
    xpDelta: number,
    pointsDelta: number,
    completion?: {
      completed: boolean;
      onTime: boolean;
      late: boolean;
      durationSeconds: number;
      perfect: boolean;
    },
  ): Promise<void> {
    const stats = await tx.userStats.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const totalXp = Math.max(0, stats.totalXp + xpDelta);
    const now = new Date();
    const weekKey = isoWeekKey(now);
    let streakWeeks = stats.streakWeeks;
    if (completion?.completed) {
      if (stats.lastCompletedWeek === weekKey) {
        streakWeeks = stats.streakWeeks;
      } else if (stats.lastCompletedWeek === previousWeekKey(weekKey)) {
        streakWeeks = stats.streakWeeks + 1;
      } else {
        streakWeeks = 1;
      }
    }
    const levels = await tx.level.findMany({ orderBy: { level: 'asc' } });
    const level = computeLevelForXp(
      totalXp,
      levels.length
        ? levels
        : DEFAULT_LEVELS.map((item) => ({
            level: item.level,
            xpThreshold: item.xpThreshold,
          })),
    );
    await tx.userStats.update({
      where: { userId },
      data: {
        totalXp,
        level,
        points: stats.points + pointsDelta,
        ...(completion?.completed
          ? {
              completedCount: { increment: 1 },
              onTimeCount: { increment: completion.onTime ? 1 : 0 },
              overdueCount: { increment: completion.late ? 1 : 0 },
              streakWeeks,
              lastCompletedWeek: weekKey,
              perfectStreak: completion.perfect
                ? { increment: 1 }
                : 0,
              totalCompletionSeconds: { increment: completion.durationSeconds },
            }
          : {}),
      },
    });
    await this.awardLevelTitles(tx, userId, level);
  }

  private async awardLevelTitles(
    tx: Tx,
    userId: string,
    level: number,
  ): Promise<void> {
    const titles = await tx.title.findMany({
      where: { conditionType: 'level_reach', conditionValue: { lte: level } },
    });
    for (const title of titles) {
      await this.grantTitle(tx, userId, title.id, title.pointsReward);
    }
  }

  private async evaluateTitles(
    tx: Tx,
    userId: string,
  ): Promise<void> {
    const stats = await tx.userStats.findUnique({ where: { userId } });
    if (!stats) {
      return;
    }
    const titles = await tx.title.findMany();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthCompleted = await tx.taskAssignment.count({
      where: {
        userId,
        status: 'completed',
        completedAt: { gte: monthStart },
      },
    });
    for (const title of titles) {
      let met = false;
      switch (title.conditionType) {
        case 'first_complete':
          met = stats.completedCount >= title.conditionValue;
          break;
        case 'streak':
          met = stats.streakWeeks >= title.conditionValue;
          break;
        case 'perfect':
          met = stats.perfectStreak >= title.conditionValue;
          break;
        case 'high_yield':
          met = monthCompleted >= title.conditionValue;
          break;
        case 'level_reach':
          met = stats.level >= title.conditionValue;
          break;
        case 'firefighting': {
          const qualifying = await tx.taskAssignment.count({
            where: {
              userId,
              status: 'completed',
              task: { isUrgent: true },
            },
          });
          met = qualifying >= title.conditionValue;
          break;
        }
      }
      if (met) {
        const awarded = await this.grantTitle(
          tx,
          userId,
          title.id,
          title.pointsReward,
        );
        if (awarded) {
          await this.notifications.create({
            userId,
            type: 'title_award',
            title: '获得新称号',
            content: `恭喜获得称号「${title.name}」：${title.description}`,
            link: '/profile',
          });
        }
      }
    }
  }

  private async grantTitle(
    tx: Tx,
    userId: string,
    titleId: string,
    pointsReward: number,
  ): Promise<boolean> {
    try {
      await tx.userTitle.create({ data: { userId, titleId } });
      if (pointsReward > 0) {
        await tx.userStats.update({
          where: { userId },
          data: { points: { increment: pointsReward } },
        });
      }
      return true;
    } catch {
      this.logger.debug(`Title already held: ${titleId}`);
      return false;
    }
  }

  async myTitles(userId: string): Promise<TitleInfo[]> {
    const rows = await this.prisma.userTitle.findMany({
      where: { userId },
      include: { title: true },
      orderBy: { awardedAt: 'asc' },
    });
    return rows.map((row) => ({
      id: row.title.id,
      code: row.title.code,
      name: row.title.name,
      description: row.title.description,
      conditionType: row.title.conditionType,
      conditionValue: row.title.conditionValue,
      pointsReward: row.title.pointsReward,
    }));
  }

  async xpLedger(userId: string): Promise<unknown[]> {
    const rows = await this.prisma.xpLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      id: row.id,
      amount: row.amount,
      reason: row.reason,
      refTaskId: row.refTaskId,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
