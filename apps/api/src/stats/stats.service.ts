import { Injectable } from '@nestjs/common';
import type { LeaderboardEntry, MyStats } from '@task-guild/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string): Promise<MyStats> {
    const stats = await this.prisma.userStats.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const levels = await this.prisma.level.findMany({
      orderBy: { level: 'asc' },
    });
    const current = levels.find((item) => item.level === stats.level);
    const levelName = current?.name ?? '见习';
    const completionRate =
      stats.acceptedCount > 0
        ? Math.round((stats.completedCount / stats.acceptedCount) * 100) / 100
        : 0;
    const onTimeRate =
      stats.completedCount > 0
        ? Math.round((stats.onTimeCount / stats.completedCount) * 100) / 100
        : 0;
    return {
      totalXp: stats.totalXp,
      level: stats.level,
      levelName,
      points: stats.points,
      acceptedCount: stats.acceptedCount,
      completedCount: stats.completedCount,
      onTimeCount: stats.onTimeCount,
      overdueCount: stats.overdueCount,
      rejectedCount: stats.rejectedCount,
      streakWeeks: stats.streakWeeks,
      completionRate,
      onTimeRate,
      averageCompletionSeconds:
        stats.completedCount > 0
          ? Math.round(stats.totalCompletionSeconds / stats.completedCount)
          : null,
    };
  }

  async leaderboard(period: 'month' | 'quarter' | 'year'): Promise<LeaderboardEntry[]> {
    const start = this.periodStart(period);
    const users = await this.prisma.user.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatarUrl: true,
        departmentId: true,
        roleMask: true,
        stats: true,
      },
    });
    const completed = await this.prisma.taskAssignment.findMany({
      where: { status: 'completed', completedAt: { gte: start } },
      select: {
        userId: true,
        completedAt: true,
        task: { select: { deadlineAt: true } },
      },
    });
    const byUser = new Map<
      string,
      { completed: number; onTime: number; total: number }
    >();
    for (const item of completed) {
      const entry = byUser.get(item.userId) ?? {
        completed: 0,
        onTime: 0,
        total: 0,
      };
      entry.completed += 1;
      entry.total += 1;
      if (item.completedAt && item.completedAt <= item.task.deadlineAt) {
        entry.onTime += 1;
      }
      byUser.set(item.userId, entry);
    }
    const rows = users
      .map((user) => {
        const window = byUser.get(user.id) ?? {
          completed: 0,
          onTime: 0,
          total: 0,
        };
        return {
          user,
          completedCount: window.completed,
          onTimeRate: window.completed > 0 ? window.onTime / window.completed : 0,
          totalXp: user.stats?.totalXp ?? 0,
          points: user.stats?.points ?? 0,
          level: user.stats?.level ?? 1,
        };
      })
      .sort(
        (a, b) =>
          b.completedCount - a.completedCount ||
          b.onTimeRate - a.onTimeRate ||
          b.totalXp - a.totalXp,
      );
    return rows.map((row, index) => ({
      rank: index + 1,
      user: {
        id: row.user.id,
        username: row.user.username,
        nickname: row.user.nickname,
        avatarUrl: row.user.avatarUrl,
        departmentId: row.user.departmentId,
        roleMask: row.user.roleMask,
      },
      completedCount: row.completedCount,
      onTimeRate: Math.round(row.onTimeRate * 100) / 100,
      totalXp: row.totalXp,
      points: row.points,
      level: row.level,
    }));
  }

  async members() {
    const users = await this.prisma.user.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatarUrl: true,
        departmentId: true,
        roleMask: true,
        stats: true,
        _count: {
          select: {
            assignments: { where: { status: { not: 'completed' } } },
          },
        },
      },
    });
    return users.map((user) => ({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        departmentId: user.departmentId,
        roleMask: user.roleMask,
      },
      activeLoad: user._count.assignments,
      completedCount: user.stats?.completedCount ?? 0,
      onTimeRate:
        user.stats && user.stats.completedCount > 0
          ? Math.round(
              (user.stats.onTimeCount / user.stats.completedCount) * 100,
            ) / 100
          : 0,
      overdueCount: user.stats?.overdueCount ?? 0,
      totalXp: user.stats?.totalXp ?? 0,
      level: user.stats?.level ?? 1,
    }));
  }

  private periodStart(period: 'month' | 'quarter' | 'year'): Date {
    const now = new Date();
    if (period === 'year') {
      return new Date(now.getFullYear(), 0, 1);
    }
    if (period === 'quarter') {
      const month = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), month, 1);
    }
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
