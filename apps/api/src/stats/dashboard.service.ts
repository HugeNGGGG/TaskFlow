import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [total, open, inProgress, pendingReview, overdue, completedThisWeek, completedThisMonth] =
      await Promise.all([
        this.prisma.task.count({ where: { status: { not: 'draft' } } }),
        this.prisma.task.count({ where: { status: 'open' } }),
        this.prisma.task.count({ where: { status: 'in_progress' } }),
        this.prisma.task.count({ where: { status: 'pending_review' } }),
        this.prisma.task.count({
          where: {
            overdueAt: { not: null },
            status: { in: ['open', 'in_progress', 'pending_review'] },
          },
        }),
        this.prisma.task.count({ where: { completedAt: { gte: weekStart } } }),
        this.prisma.task.count({ where: { completedAt: { gte: monthStart } } }),
      ]);
    return {
      total,
      open,
      inProgress,
      pendingReview,
      overdue,
      completedThisWeek,
      completedThisMonth,
    };
  }

  async byCategory() {
    const tasks = await this.prisma.task.findMany({
      where: { status: { not: 'draft' } },
      select: { category: { select: { name: true } } },
    });
    const map = new Map<string, number>();
    for (const task of tasks) {
      const key = task.category?.name ?? '未分类';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([key, count]) => ({ key, count }));
  }

  async byDepartment() {
    const assignments = await this.prisma.taskAssignment.findMany({
      where: { task: { status: { not: 'draft' } } },
      select: {
        taskId: true,
        user: { select: { department: { select: { name: true } } } },
      },
    });
    const map = new Map<string, Set<string>>();
    for (const item of assignments) {
      const key = item.user.department?.name ?? '未分配';
      const set = map.get(key) ?? new Set<string>();
      set.add(item.taskId);
      map.set(key, set);
    }
    return [...map.entries()].map(([key, taskIds]) => ({
      key,
      count: taskIds.size,
    }));
  }

  async trend(range: '7d' | '30d'): Promise<unknown[]> {
    const days = range === '7d' ? 7 : 30;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const rows = await this.prisma.task.findMany({
      where: {
        OR: [{ createdAt: { gte: start } }, { completedAt: { gte: start } }],
      },
      select: { createdAt: true, completedAt: true },
    });
    const points = new Map<string, { created: number; completed: number }>();
    for (let i = 0; i < days; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      points.set(key, { created: 0, completed: 0 });
    }
    for (const row of rows) {
      if (row.createdAt >= start) {
        const key = row.createdAt.toISOString().slice(0, 10);
        const point = points.get(key) ?? { created: 0, completed: 0 };
        point.created += 1;
        points.set(key, point);
      }
      if (row.completedAt && row.completedAt >= start) {
        const key = row.completedAt.toISOString().slice(0, 10);
        const point = points.get(key) ?? { created: 0, completed: 0 };
        point.completed += 1;
        points.set(key, point);
      }
    }
    return [...points.entries()].map(([date, value]) => ({
      date,
      created: value.created,
      completed: value.completed,
    }));
  }
}
