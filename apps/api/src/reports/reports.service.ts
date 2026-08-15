import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportTasksCsv(): Promise<string> {
    const tasks = await this.prisma.task.findMany({
      include: {
        category: { select: { name: true } },
        assignments: { select: { progressPercent: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 5000,
    });

    const header = [
      '任务编号',
      '标题',
      '类别',
      '难度',
      '经验奖励',
      '截止时间',
      '状态',
      '接取模式',
      '已接取人数',
      '人数上限',
      '平均进度',
    ];

    const statusMap: Record<string, string> = {
      draft: '草稿',
      open: '待接取',
      in_progress: '进行中',
      pending_review: '待审核',
      completed: '已完成',
      cancelled: '已取消',
    };

    const rows = tasks.map((task) => {
      const average =
        task.assignments.length === 0
          ? task.status === 'completed' || task.status === 'pending_review'
            ? 100
            : 0
          : Math.round(
              task.assignments.reduce((sum, item) => sum + item.progressPercent, 0) /
                task.assignments.length,
            );
      return [
        task.taskNo,
        task.title,
        task.category?.name ?? '',
        task.difficulty,
        String(task.xpReward),
        task.deadlineAt.toISOString(),
        statusMap[task.status] ?? task.status,
        task.acceptMode === 'bounty' ? '悬赏' : '指派',
        String(task.assignments.length),
        String(task.maxMembers),
        String(average),
      ];
    });

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
}
