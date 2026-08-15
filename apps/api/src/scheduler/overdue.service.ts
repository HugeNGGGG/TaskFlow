import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OverdueService {
  private readonly logger = new Logger(OverdueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 * * * * *')
  async markOverdue(): Promise<void> {
    const now = new Date();
    const overdueTasks = await this.prisma.task.findMany({
      where: {
        overdueAt: null,
        deadlineAt: { lt: now },
        status: { in: ['open', 'in_progress', 'pending_review'] },
      },
      include: { assignments: true, publisher: true },
    });
    for (const task of overdueTasks) {
      await this.prisma.task.update({
        where: { id: task.id },
        data: { overdueAt: now },
      });
      await this.prisma.taskEvent.create({
        data: {
          taskId: task.id,
          type: 'reminder',
          content: '委托已逾期',
        },
      });
      const targets = new Set([
        task.publisherId,
        ...task.assignments.map((item) => item.userId),
      ]);
      for (const userId of targets) {
        await this.notifications.create({
          userId,
          type: 'deadline_warning',
          title: '委托已逾期',
          content: `“${task.title}”已超过截止时间，请尽快处理。`,
          link: `/task/${task.id}`,
        });
      }
      this.logger.log(`Marked task ${task.taskNo} overdue`);
    }
  }

  @Cron('0 */10 * * * *')
  async warnUpcomingDeadlines(): Promise<void> {
    const now = new Date();
    const horizon = new Date(now.getTime() + 24 * 3600 * 1000);
    const tasks = await this.prisma.task.findMany({
      where: {
        deadlineAt: { gt: now, lte: horizon },
        status: { in: ['open', 'in_progress', 'pending_review'] },
      },
      include: { assignments: true },
    });
    for (const task of tasks) {
      const alreadyWarned = await this.prisma.taskEvent.findFirst({
        where: {
          taskId: task.id,
          type: 'reminder',
          content: '距截止不足 24 小时',
        },
      });
      if (alreadyWarned) {
        continue;
      }
      await this.prisma.taskEvent.create({
        data: {
          taskId: task.id,
          type: 'reminder',
          content: '距截止不足 24 小时',
        },
      });
      const targets = new Set([
        task.publisherId,
        ...task.assignments.map((item) => item.userId),
      ]);
      for (const userId of targets) {
        await this.notifications.create({
          userId,
          type: 'deadline_warning',
          title: '委托即将到期',
          content: `“${task.title}”将在 24 小时内截止。`,
          link: `/task/${task.id}`,
        });
      }
    }
  }
}
