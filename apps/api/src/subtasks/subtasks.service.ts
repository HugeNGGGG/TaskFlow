import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { hasRole } from '@task-guild/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubtasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(taskId: string, viewer: { id: string; roleMask: number }) {
    await this.assertCanEdit(taskId, viewer);
    return this.prisma.taskSubtask.findMany({
      where: { taskId },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(
    taskId: string,
    viewer: { id: string; roleMask: number },
    title: string,
  ) {
    await this.assertCanEdit(taskId, viewer);
    const count = await this.prisma.taskSubtask.count({ where: { taskId } });
    return this.prisma.taskSubtask.create({
      data: { taskId, title, sort: count },
    });
  }

  async update(
    taskId: string,
    subtaskId: string,
    viewer: { id: string; roleMask: number },
    dto: { title?: string; isDone?: boolean },
  ) {
    await this.assertCanEdit(taskId, viewer);
    const subtask = await this.prisma.taskSubtask.findFirst({
      where: { id: subtaskId, taskId },
    });
    if (!subtask) {
      throw new NotFoundException('子任务不存在');
    }
    return this.prisma.taskSubtask.update({
      where: { id: subtaskId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.isDone !== undefined ? { isDone: dto.isDone } : {}),
      },
    });
  }

  async delete(
    taskId: string,
    subtaskId: string,
    viewer: { id: string; roleMask: number },
  ) {
    await this.assertCanEdit(taskId, viewer);
    const subtask = await this.prisma.taskSubtask.findFirst({
      where: { id: subtaskId, taskId },
    });
    if (!subtask) {
      throw new NotFoundException('子任务不存在');
    }
    await this.prisma.taskSubtask.delete({ where: { id: subtaskId } });
    return { ok: true };
  }

  private async assertCanEdit(
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
    const isPublisher = task.publisherId === viewer.id;
    const isMember = task.assignments.length > 0;
    if (task.status === 'draft' && !isManager && !isPublisher) {
      throw new ForbiddenException('草稿仅发布官可编辑');
    }
    if (!isManager && !isPublisher && !isMember) {
      throw new ForbiddenException('仅任务成员可编辑子任务');
    }
  }
}
