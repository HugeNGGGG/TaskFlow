import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hasRole } from '@task-guild/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(taskId: string, viewer: { id: string; roleMask: number }) {
    await this.assertCanView(taskId, viewer);
    return this.prisma.taskComment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, nickname: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    taskId: string,
    viewer: { id: string; roleMask: number },
    content: string,
  ) {
    await this.assertCanView(taskId, viewer);
    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        authorId: viewer.id,
        content,
      },
      include: { author: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    await this.notifyMentions(taskId, viewer, content);
    return comment;
  }

  private async assertCanView(
    taskId: string,
    viewer: { id: string; roleMask: number },
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: { where: { userId: viewer.id } } },
    });
    if (!task) {
      throw new NotFoundException('委托不存在');
    }
    const isManager = hasRole(viewer.roleMask, 'MANAGER');
    const isMember = task.assignments.length > 0;
    const isPublisher = task.publisherId === viewer.id;
    if (task.status === 'draft' && !isManager && !isPublisher) {
      throw new ForbiddenException('草稿仅发布官可见');
    }
    if (!isManager && !isMember && task.acceptMode === 'assigned') {
      throw new ForbiddenException('仅指派成员可查看该委托评论');
    }
  }

  private async notifyMentions(
    taskId: string,
    viewer: { id: string; roleMask: number },
    content: string,
  ) {
    const names = Array.from(
      new Set(
        Array.from(content.matchAll(/@([\u4e00-\u9fa5A-Za-z0-9_]+)/g)).map(
          (match) => match[1],
        ),
      ),
    ).slice(0, 10);
    if (names.length === 0) {
      return;
    }
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true },
    });
    const mentionedUsers = await this.prisma.user.findMany({
      where: {
        nickname: { in: names },
        id: { not: viewer.id },
      },
      select: { id: true, nickname: true },
    });
    await Promise.all(
      mentionedUsers.map((user) =>
        this.notifications.create({
          userId: user.id,
          type: 'system',
          title: '有人 @ 了你',
          content: `在“${task?.title ?? '任务'}”的评论中 @ 了你`,
          link: `/pages/task/detail?id=${taskId}`,
        }),
      ),
    );
  }
}
