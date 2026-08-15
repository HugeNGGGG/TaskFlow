import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  hasRole,
  TASK_STATUSES,
  type AssignmentView,
  type Paginated,
  type TaskCard,
  type TaskStatus,
  type TimelineEventView,
} from '@task-guild/shared';
import type { Difficulty } from '@task-guild/shared';
import { DIFFICULTY_XP } from '@task-guild/shared';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { GamificationService } from '../gamification/gamification.service';
import {
  AssignDto,
  CancelTaskDto,
  CaptainDto,
  CreateTaskDto,
  DecideExtensionDto,
  ExtensionDto,
  ProgressDto,
  ReviewDto,
  SubmitDto,
  UpdateTaskDto,
} from './dto';

export interface ListTasksQuery {
  page?: number;
  pageSize?: number;
  statuses?: string;
  categoryId?: string;
  difficulty?: Difficulty;
  departmentId?: string;
  isUrgent?: 'true' | 'false';
  keyword?: string;
  sort?: 'newest' | 'deadline' | 'reward';
}

const ACTIVE_TASK_STATUSES = [
  'open',
  'in_progress',
  'pending_review',
] as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly gateway: RealtimeGateway,
    private readonly gamification: GamificationService,
  ) {}

  async list(
    query: ListTasksQuery,
    viewer: { id: string; roleMask: number },
  ): Promise<Paginated<TaskCard>> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const statuses = this.parseStatuses(
      query.statuses,
      viewer.roleMask,
    ) as TaskStatus[];
    const isManager = hasRole(viewer.roleMask, 'MANAGER') ||
      hasRole(viewer.roleMask, 'ADMIN');

    const orConditions: Prisma.TaskWhereInput[] = [];
    if (query.keyword) {
      orConditions.push(
        { title: { contains: query.keyword } },
        { description: { contains: query.keyword } },
        { taskNo: { contains: query.keyword } },
      );
    }
    if (!isManager) {
      orConditions.push(
        { acceptMode: 'bounty' },
        { assignments: { some: { userId: viewer.id } } },
      );
    }

    const where: Prisma.TaskWhereInput = {
      status: { in: statuses },
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.departmentId
        ? { publisher: { departmentId: query.departmentId } }
        : {}),
      ...(query.isUrgent ? { isUrgent: query.isUrgent === 'true' } : {}),
      ...(orConditions.length ? { OR: orConditions } : {}),
    };

    const orderBy = this.resolveOrder(query.sort ?? 'newest');
    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { name: true } },
          assignments: { select: { progressPercent: true } },
          _count: { select: { assignments: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    const now = Date.now();
    return {
      items: items.map((task) => ({
        id: task.id,
        taskNo: task.taskNo,
        title: task.title,
        categoryName: task.category?.name ?? null,
        difficulty: task.difficulty,
        xpReward: task.xpReward,
        deadlineAt: task.deadlineAt.toISOString(),
        acceptMode: task.acceptMode,
        isUrgent: task.isUrgent,
        status: task.status,
        acceptCount: task._count.assignments,
        maxMembers: task.maxMembers,
        progressPercent: this.taskProgressPercent(task),
        overdue:
          task.overdueAt !== null ||
          (task.deadlineAt.getTime() < now &&
            ACTIVE_TASK_STATUSES.includes(
              task.status as (typeof ACTIVE_TASK_STATUSES)[number],
            )),
        publishedAt: task.publishedAt?.toISOString() ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async mine(viewerId: string): Promise<TaskCard[]> {
    const rows = await this.prisma.taskAssignment.findMany({
      where: { userId: viewerId },
      include: {
        task: {
          include: {
            category: { select: { name: true } },
            assignments: { select: { progressPercent: true } },
            _count: { select: { assignments: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 200,
    });
    const now = Date.now();
    return rows.map(({ task }) => ({
      id: task.id,
      taskNo: task.taskNo,
      title: task.title,
      categoryName: task.category?.name ?? null,
      difficulty: task.difficulty,
      xpReward: task.xpReward,
      deadlineAt: task.deadlineAt.toISOString(),
      acceptMode: task.acceptMode,
      isUrgent: task.isUrgent,
      status: task.status,
      acceptCount: task._count.assignments,
      maxMembers: task.maxMembers,
      progressPercent: this.taskProgressPercent(task),
      overdue:
        task.overdueAt !== null ||
        (task.deadlineAt.getTime() < now &&
          ACTIVE_TASK_STATUSES.includes(
            task.status as (typeof ACTIVE_TASK_STATUSES)[number],
          )),
      publishedAt: task.publishedAt?.toISOString() ?? null,
    }));
  }

  async detail(taskId: string, viewerId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        category: true,
        publisher: { select: { id: true, nickname: true, avatarUrl: true } },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatarUrl: true,
                department: { select: { name: true } },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        events: {
          include: {
            author: { select: { nickname: true } },
            assignment: {
              select: { user: { select: { nickname: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!task) {
      throw new NotFoundException('委托不存在');
    }
    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { roleMask: true },
    });
    const isManager = viewer && hasRole(viewer.roleMask, 'MANAGER');
    const isMember = task.assignments.some((item) => item.userId === viewerId);
    if (task.status === 'draft' && !isManager && task.publisherId !== viewerId) {
      throw new NotFoundException('委托不存在');
    }
    if (task.acceptMode === 'assigned' && !isManager && !isMember) {
      throw new ForbiddenException('该委托仅指派成员可见');
    }

    const assignments: AssignmentView[] = task.assignments.map((item) => ({
      userId: item.userId,
      userNickname: item.user.nickname,
      userAvatarUrl: item.user.avatarUrl,
      departmentName: item.user.department?.name ?? null,
      role: item.role,
      status: item.status,
      progressPercent: item.progressPercent,
      joinedAt: item.joinedAt.toISOString(),
      submittedAt: item.submittedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      xpAwarded: item.xpAwarded,
    }));
    const timeline: TimelineEventView[] = task.events.map((event) => ({
      id: event.id,
      type: event.type,
      content: event.content,
      progressPercent: event.progressPercent,
      authorName:
        event.author?.nickname ?? event.assignment?.user.nickname ?? null,
      createdAt: event.createdAt.toISOString(),
    }));
    const myAssignment = assignments.find((item) => item.userId === viewerId) ?? null;
    return {
      id: task.id,
      taskNo: task.taskNo,
      title: task.title,
      description: task.description,
      category: task.category,
      difficulty: task.difficulty,
      xpReward: task.xpReward,
      deadlineAt: task.deadlineAt.toISOString(),
      acceptMode: task.acceptMode,
      maxMembers: task.maxMembers,
      needReview: task.needReview,
      isUrgent: task.isUrgent,
      status: task.status,
      publisher: task.publisher,
      overdueAt: task.overdueAt?.toISOString() ?? null,
      publishedAt: task.publishedAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      cancelledAt: task.cancelledAt?.toISOString() ?? null,
      cancelReason: task.cancelReason,
      createdAt: task.createdAt.toISOString(),
      assignments,
      timeline,
      myAssignment,
      acceptCount: task.assignments.length,
      canAccept:
        task.status === 'open' &&
        task.acceptMode === 'bounty' &&
        !myAssignment &&
        task.assignments.length < task.maxMembers,
    };
  }

  async create(publisherId: string, dto: CreateTaskDto) {
    if (dto.acceptMode === 'assigned' && !dto.assigneeIds?.length) {
      throw new BadRequestException('指派委托需至少选择一名成员');
    }
    if (dto.captainId && !dto.assigneeIds?.includes(dto.captainId)) {
      throw new BadRequestException('队长必须在指派成员中');
    }
    const taskNo = await this.nextTaskNo();
    const isOpen = dto.status === 'open';
    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          taskNo,
          title: dto.title,
          description: dto.description ?? '',
          categoryId: dto.categoryId ?? null,
          difficulty: dto.difficulty,
          xpReward: dto.xpReward ?? DIFFICULTY_XP[dto.difficulty],
          deadlineAt: new Date(dto.deadlineAt),
          acceptMode: dto.acceptMode,
          maxMembers: dto.maxMembers ?? 1,
          needReview: dto.needReview ?? true,
          isUrgent: dto.isUrgent ?? false,
          status: isOpen ? 'open' : 'draft',
          publisherId,
          publishedAt: isOpen ? new Date() : null,
        },
      });
      await tx.taskEvent.create({
        data: {
          taskId: created.id,
          authorId: publisherId,
          type: 'created',
          content: isOpen ? '发布了委托' : '创建了草稿',
        },
      });
      for (const userId of dto.assigneeIds ?? []) {
        const assignment = await tx.taskAssignment.create({
          data: {
            taskId: created.id,
            userId,
            role: userId === dto.captainId ? 'captain' : 'member',
          },
        });
        await tx.taskEvent.create({
          data: {
            taskId: created.id,
            assignmentId: assignment.id,
            authorId: publisherId,
            type: 'accepted',
            content: '被指派加入委托',
          },
        });
        await this.notifications.create({
          userId,
          type: 'assign',
          title: '新的指派委托',
          content: `发布官给你指派了委托“${created.title}”。`,
          link: `/task/${created.id}`,
        });
      }
      if (isOpen && dto.assigneeIds?.length) {
        await tx.task.update({
          where: { id: created.id },
          data: { status: 'in_progress' },
        });
      }
      return tx.task.findUniqueOrThrow({ where: { id: created.id } });
    });
    this.gateway.emitToTask(task.id, 'task.status_changed', {
      taskId: task.id,
      status: task.status,
    });
    return task;
  }

  async update(
    taskId: string,
    dto: UpdateTaskDto,
    actor: { id: string; roleMask: number },
  ) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('委托不存在');
    }
    if (
      task.publisherId !== actor.id &&
      !hasRole(actor.roleMask, 'ADMIN')
    ) {
      throw new ForbiddenException('仅发布官或管理员可编辑该委托');
    }
    if (!['draft', 'open'].includes(task.status)) {
      throw new BadRequestException('仅草稿或待接取状态的委托可编辑');
    }
    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        difficulty: dto.difficulty,
        xpReward: dto.xpReward,
        deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : undefined,
        maxMembers: dto.maxMembers,
        needReview: dto.needReview,
        isUrgent: dto.isUrgent,
        ...(dto.deadlineAt ? { overdueAt: null } : {}),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'update_task',
        targetType: 'task',
        targetId: taskId,
      },
    });
    return updated;
  }

  async publish(taskId: string, actorId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: true },
    });
    if (!task) {
      throw new NotFoundException('委托不存在');
    }
    if (task.status !== 'draft') {
      throw new BadRequestException('仅草稿可发布');
    }
    if (task.acceptMode === 'assigned' && task.assignments.length === 0) {
      throw new BadRequestException('指派委托需先指定成员');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.task.update({
        where: { id: taskId },
        data: {
          status: task.assignments.length ? 'in_progress' : 'open',
          publishedAt: new Date(),
        },
      });
      await tx.taskEvent.create({
        data: {
          taskId,
          authorId: actorId,
          type: 'created',
          content: '发布了委托',
        },
      });
      return result;
    });
    for (const assignment of task.assignments) {
      await this.notifications.create({
        userId: assignment.userId,
        type: 'assign',
        title: '新的指派委托',
        content: `发布官给你指派了委托“${task.title}”。`,
        link: `/task/${taskId}`,
      });
    }
    this.emitStatus(taskId, updated.status);
    return updated;
  }

  async cancel(taskId: string, dto: CancelTaskDto, actorId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: true },
    });
    if (!task) {
      throw new NotFoundException('委托不存在');
    }
    if (!ACTIVE_TASK_STATUSES.includes(task.status as never)) {
      throw new BadRequestException('当前状态不可取消');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.task.update({
        where: { id: taskId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: dto.reason ?? null,
        },
      });
      await tx.taskEvent.create({
        data: {
          taskId,
          authorId: actorId,
          type: 'cancelled',
          content: dto.reason ? `取消了委托：${dto.reason}` : '取消了委托',
        },
      });
      return result;
    });
    for (const assignment of task.assignments) {
      await this.notifications.create({
        userId: assignment.userId,
        type: 'system',
        title: '委托已取消',
        content: `“${task.title}”已被发布官取消。`,
        link: `/task/${taskId}`,
      });
    }
    this.emitStatus(taskId, 'cancelled');
    return updated;
  }

  async accept(taskId: string, userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({ where: { id: taskId } });
      if (!task) {
        throw new NotFoundException('委托不存在');
      }
      if (task.status !== 'open' || task.acceptMode !== 'bounty') {
        throw new BadRequestException('该委托不可自由接取');
      }
      const existing = await tx.taskAssignment.findUnique({
        where: { taskId_userId: { taskId, userId } },
      });
      if (existing) {
        throw new ConflictException('你已接取该委托');
      }
      const accepted = await tx.taskAssignment.count({ where: { taskId } });
      if (accepted >= task.maxMembers) {
        throw new ConflictException('名额已满');
      }
      const assignment = await tx.taskAssignment.create({
        data: { taskId, userId, role: 'member' },
      });
      const updated = await tx.task.update({
        where: { id: taskId },
        data: { status: 'in_progress', overdueAt: null },
      });
      await tx.taskEvent.create({
        data: {
          taskId,
          assignmentId: assignment.id,
          authorId: userId,
          type: 'accepted',
          content: '接取了委托',
        },
      });
      return { assignment, task: updated };
    });
    this.gateway.emitToTask(taskId, 'task.status_changed', {
      taskId,
      status: result.task.status,
    });
    return result.assignment;
  }

  async assign(taskId: string, dto: AssignDto, actorId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: true },
    });
    if (!task) {
      throw new NotFoundException('委托不存在');
    }
    if (['completed', 'cancelled'].includes(task.status)) {
      throw new BadRequestException('已结束的委托不可追加指派');
    }
    const existingIds = new Set(task.assignments.map((item) => item.userId));
    const newIds = dto.userIds.filter((id) => !existingIds.has(id));
    if (newIds.length === 0) {
      return { assigned: 0 };
    }
    const resultingCount = task.assignments.length + newIds.length;
    await this.prisma.$transaction(async (tx) => {
      for (const userId of newIds) {
        const assignment = await tx.taskAssignment.create({
          data: {
            taskId,
            userId,
            role: userId === dto.captainId ? 'captain' : 'member',
          },
        });
        await tx.taskEvent.create({
          data: {
            taskId,
            assignmentId: assignment.id,
            authorId: actorId,
            type: 'accepted',
            content: '被追加指派',
          },
        });
        await this.notifications.create({
          userId,
          type: 'assign',
          title: '新的指派委托',
          content: `发布官给你指派了委托“${task.title}”。`,
          link: `/task/${task.id}`,
        });
      }
      const data: Prisma.TaskUncheckedUpdateInput = {};
      if (task.status === 'open') {
        data.status = 'in_progress';
      }
      if (resultingCount > task.maxMembers) {
        data.maxMembers = resultingCount;
      }
      if (Object.keys(data).length) {
        await tx.task.update({ where: { id: taskId }, data });
      }
    });
    this.gateway.emitToTask(taskId, 'task.status_changed', { taskId, status: 'in_progress' });
    return { assigned: newIds.length };
  }

  async removeAssignment(taskId: string, userId: string, actorId: string) {
    const assignment = await this.prisma.taskAssignment.findUnique({
      where: { taskId_userId: { taskId, userId } },
    });
    if (!assignment) {
      throw new NotFoundException('成员不在该委托中');
    }
    await this.prisma.taskAssignment.delete({ where: { id: assignment.id } });
    await this.prisma.taskEvent.create({
      data: {
        taskId,
        authorId: actorId,
        type: 'accepted',
        content: '成员被移出委托',
      },
    });
    const remaining = await this.prisma.taskAssignment.count({
      where: { taskId },
    });
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
    });
    if (task.status === 'in_progress' && remaining === 0) {
      await this.prisma.task.update({
        where: { id: taskId },
        data: { status: 'open' },
      });
      this.emitStatus(taskId, 'open');
    } else if (task.status === 'pending_review') {
      const incomplete = await this.prisma.taskAssignment.count({
        where: { taskId, status: { not: 'completed' } },
      });
      if (incomplete > 0) {
        await this.prisma.task.update({
          where: { id: taskId },
          data: { status: 'in_progress' },
        });
        this.emitStatus(taskId, 'in_progress');
      }
    }
    return { ok: true };
  }

  async setCaptain(taskId: string, dto: CaptainDto, actorId: string) {
    const assignment = await this.prisma.taskAssignment.findUnique({
      where: { taskId_userId: { taskId, userId: dto.userId } },
    });
    if (!assignment) {
      throw new BadRequestException('该成员不在委托中');
    }
    await this.prisma.taskAssignment.updateMany({
      where: { taskId },
      data: { role: 'member' },
    });
    await this.prisma.taskAssignment.update({
      where: { id: assignment.id },
      data: { role: 'captain' },
    });
    await this.prisma.taskEvent.create({
      data: {
        taskId,
        authorId: actorId,
        type: 'progress',
        content: '变更了队长',
      },
    });
    return { ok: true };
  }

  async updateProgress(
    taskId: string,
    userId: string,
    dto: ProgressDto,
  ) {
    const assignment = await this.prisma.taskAssignment.findUnique({
      where: { taskId_userId: { taskId, userId } },
      include: { user: { select: { nickname: true } } },
    });
    if (!assignment) {
      throw new NotFoundException('你尚未接取该委托');
    }
    if (!['accepted', 'in_progress'].includes(assignment.status)) {
      throw new BadRequestException('当前状态不可更新进度');
    }
    const updated = await this.prisma.taskAssignment.update({
      where: { id: assignment.id },
      data: {
        progressPercent: dto.percent,
        status: 'in_progress',
      },
    });
    const event = await this.prisma.taskEvent.create({
      data: {
        taskId,
        assignmentId: assignment.id,
        authorId: userId,
        type: 'progress',
        progressPercent: dto.percent,
        content: dto.content ?? `进度更新为 ${dto.percent}%`,
      },
    });
    this.gateway.emitToTask(taskId, 'progress.updated', {
      taskId,
      userId,
      nickname: assignment.user.nickname,
      percent: dto.percent,
      content: dto.content ?? null,
    });
    this.gateway.emitToTask(taskId, 'timeline.appended', { event: event.id });
    return updated;
  }

  async submit(taskId: string, userId: string, dto: SubmitDto) {
    const assignment = await this.prisma.taskAssignment.findUnique({
      where: { taskId_userId: { taskId, userId } },
      include: { task: true },
    });
    if (!assignment) {
      throw new NotFoundException('你尚未接取该委托');
    }
    if (!['accepted', 'in_progress'].includes(assignment.status)) {
      throw new BadRequestException('当前状态不可提交');
    }
    const targetIds =
      dto.submitAll && assignment.role === 'captain'
        ? (
            await this.prisma.taskAssignment.findMany({
              where: { taskId, status: { not: 'completed' } },
              select: { userId: true, id: true },
            })
          ).map((item) => item.id)
        : [assignment.id];
    await this.prisma.$transaction(async (tx) => {
      for (const id of targetIds) {
        await tx.taskAssignment.update({
          where: { id },
          data: { status: 'submitted', submittedAt: new Date() },
        });
        await tx.taskEvent.create({
          data: {
            taskId,
            assignmentId: id,
            authorId: userId,
            type: 'submitted',
            content: dto.note ?? '提交了成果',
          },
        });
      }
      await this.recomputeAfterSubmission(tx, taskId);
    });
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
    });
    this.emitStatus(taskId, task.status);
    if (task.status === 'pending_review') {
      await this.notifications.create({
        userId: task.publisherId,
        type: 'review_result',
        title: '有待审核的成果',
        content: `“${task.title}”有新的提交待审核。`,
        link: `/task/${taskId}`,
      });
    } else if (task.status === 'completed') {
      await this.gamification.settleTask(taskId);
    }
    return { ok: true };
  }

  async review(
    taskId: string,
    targetUserId: string,
    dto: ReviewDto,
    reviewerId: string,
  ) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.status !== 'pending_review') {
      throw new BadRequestException('该委托不在待审核状态');
    }
    const assignment = await this.prisma.taskAssignment.findUnique({
      where: { taskId_userId: { taskId, userId: targetUserId } },
    });
    if (!assignment || assignment.status !== 'submitted') {
      throw new BadRequestException('该成员当前没有待审核的提交');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          taskId,
          assignmentId: assignment.id,
          reviewerId,
          decision: dto.decision,
          reason: dto.reason ?? null,
        },
      });
      if (dto.decision === 'approved') {
        await tx.taskAssignment.update({
          where: { id: assignment.id },
          data: { status: 'completed', completedAt: new Date() },
        });
        await tx.taskEvent.create({
          data: {
            taskId,
            assignmentId: assignment.id,
            authorId: reviewerId,
            type: 'approved',
            content: dto.reason ? `审核通过：${dto.reason}` : '审核通过',
          },
        });
        const uncompleted = await tx.taskAssignment.count({
          where: { taskId, status: { not: 'completed' } },
        });
        if (uncompleted === 0) {
          await tx.task.update({
            where: { id: taskId },
            data: { status: 'completed', completedAt: new Date() },
          });
        }
      } else {
        await tx.taskAssignment.update({
          where: { id: assignment.id },
          data: { status: 'in_progress', submittedAt: null },
        });
        await tx.userStats.upsert({
          where: { userId: targetUserId },
          update: { rejectedCount: { increment: 1 } },
          create: { userId: targetUserId, rejectedCount: 1 },
        });
        await tx.taskEvent.create({
          data: {
            taskId,
            assignmentId: assignment.id,
            authorId: reviewerId,
            type: 'rejected',
            content: dto.reason ?? '成果被打回',
          },
        });
        await tx.task.update({
          where: { id: taskId },
          data: { status: 'in_progress' },
        });
      }
    });
    const updated = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
    });
    this.emitStatus(taskId, updated.status);
    this.gateway.emitToTask(taskId, 'review.updated', {
      taskId,
      userId: targetUserId,
      decision: dto.decision,
    });
    await this.notifications.create({
      userId: targetUserId,
      type: 'review_result',
      title: dto.decision === 'approved' ? '成果已通过审核' : '成果被打回',
      content:
        dto.decision === 'approved'
          ? `“${task.title}”的成果已通过审核。`
          : `“${task.title}”的成果被打回：${dto.reason ?? '请修改后重新提交'}`,
      link: `/task/${taskId}`,
    });
    if (updated.status === 'completed') {
      await this.gamification.settleTask(taskId);
    }
    return { ok: true };
  }

  async requestExtension(taskId: string, userId: string, dto: ExtensionDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: true },
    });
    if (!task) {
      throw new NotFoundException('委托不存在');
    }
    const member = task.assignments.some((item) => item.userId === userId);
    if (!member && task.publisherId !== userId) {
      throw new ForbiddenException('仅委托成员可申请延期');
    }
    if (!ACTIVE_TASK_STATUSES.includes(task.status as never)) {
      throw new BadRequestException('当前状态不可申请延期');
    }
    const extension = await this.prisma.deadlineExtension.create({
      data: {
        taskId,
        requesterId: userId,
        requestedDeadline: new Date(dto.requestedDeadline),
        reason: dto.reason,
      },
    });
    await this.prisma.taskEvent.create({
      data: {
        taskId,
        authorId: userId,
        type: 'extension_requested',
        content: `申请延期至 ${dto.requestedDeadline}：${dto.reason}`,
      },
    });
    await this.notifications.create({
      userId: task.publisherId,
      type: 'system',
      title: '收到延期申请',
      content: `“${task.title}”有成员申请延期。`,
      link: `/task/${taskId}`,
    });
    return extension;
  }

  async decideExtension(
    taskId: string,
    extensionId: string,
    dto: DecideExtensionDto,
    actorId: string,
  ) {
    const extension = await this.prisma.deadlineExtension.findUnique({
      where: { id: extensionId },
    });
    if (!extension || extension.taskId !== taskId || extension.status !== 'pending') {
      throw new BadRequestException('延期申请不存在或已处理');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.deadlineExtension.update({
        where: { id: extensionId },
        data: {
          status: dto.approve ? 'approved' : 'rejected',
          decidedById: actorId,
          decidedAt: new Date(),
          decidedReason: dto.reason ?? null,
        },
      });
      if (dto.approve) {
        await tx.task.update({
          where: { id: taskId },
          data: {
            deadlineAt: extension.requestedDeadline,
            overdueAt: null,
          },
        });
      }
      await tx.taskEvent.create({
        data: {
          taskId,
          authorId: actorId,
          type: 'extension_decided',
          content: dto.approve
            ? `批准延期至 ${extension.requestedDeadline.toISOString()}`
            : `驳回延期申请：${dto.reason ?? ''}`,
        },
      });
      return result;
    });
    await this.notifications.create({
      userId: extension.requesterId,
      type: 'system',
      title: dto.approve ? '延期申请已批准' : '延期申请被驳回',
      content: dto.approve
        ? `“${updated.requestedDeadline.toISOString()}”`
        : dto.reason ?? '请按原截止时间完成',
      link: `/task/${taskId}`,
    });
    return updated;
  }

  async extensions(taskId: string) {
    return this.prisma.deadlineExtension.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { nickname: true } },
        decidedBy: { select: { nickname: true } },
      },
    });
  }

  async timeline(taskId: string): Promise<TimelineEventView[]> {
    await this.ensureTaskExists(taskId);
    const events = await this.prisma.taskEvent.findMany({
      where: { taskId },
      include: {
        author: { select: { nickname: true } },
        assignment: {
          select: { user: { select: { nickname: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return events.map((event) => ({
      id: event.id,
      type: event.type,
      content: event.content,
      progressPercent: event.progressPercent,
      authorName:
        event.author?.nickname ?? event.assignment?.user.nickname ?? null,
      createdAt: event.createdAt.toISOString(),
    }));
  }

  async submissions(taskId: string): Promise<AssignmentView[]> {
    await this.ensureTaskExists(taskId);
    const assignments = await this.prisma.taskAssignment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
    return assignments.map((item) => ({
      userId: item.userId,
      userNickname: item.user.nickname,
      userAvatarUrl: item.user.avatarUrl,
      departmentName: item.user.department?.name ?? null,
      role: item.role,
      status: item.status,
      progressPercent: item.progressPercent,
      joinedAt: item.joinedAt.toISOString(),
      submittedAt: item.submittedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      xpAwarded: item.xpAwarded,
    }));
  }

  private async recomputeAfterSubmission(
    tx: Prisma.TransactionClient,
    taskId: string,
  ): Promise<void> {
    const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
    const total = await tx.taskAssignment.count({ where: { taskId } });
    const submitted = await tx.taskAssignment.count({
      where: { taskId, status: { in: ['submitted', 'completed'] } },
    });
    if (total === submitted && total > 0) {
      await tx.task.update({
        where: { id: taskId },
        data: {
          status: task.needReview ? 'pending_review' : 'completed',
          completedAt: task.needReview ? null : new Date(),
        },
      });
    }
  }

  private parseStatuses(raw: string | undefined, roleMask: number): string[] {
    const all = [...TASK_STATUSES];
    if (raw && raw.trim()) {
      const requested = raw
        .split(',')
        .map((item) => item.trim())
        .filter((item) => (all as string[]).includes(item));
      if (requested.length) {
        return requested;
      }
    }
    return hasRole(roleMask, 'MANAGER')
      ? ['open', 'in_progress', 'pending_review', 'completed']
      : ['open', 'in_progress', 'pending_review', 'completed'];
  }

  private resolveOrder(sort: ListTasksQuery['sort']) {
    switch (sort) {
      case 'deadline':
        return [{ isUrgent: 'desc' as const }, { deadlineAt: 'asc' as const }];
      case 'reward':
        return [{ xpReward: 'desc' as const }];
      default:
        return [{ createdAt: 'desc' as const }];
    }
  }

  private async nextTaskNo(): Promise<string> {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `T-${yyyymm}-`;
    const count = await this.prisma.task.count({
      where: { taskNo: { startsWith: prefix } },
    });
    let seq = count + 1;
    for (;;) {
      const taskNo = `${prefix}${String(seq).padStart(4, '0')}`;
      const exists = await this.prisma.task.findUnique({ where: { taskNo } });
      if (!exists) {
        return taskNo;
      }
      seq += 1;
    }
  }

  private taskProgressPercent(task: {
    status: TaskStatus;
    assignments: { progressPercent: number }[];
  }): number {
    if (task.status === 'completed' || task.status === 'pending_review') {
      return 100;
    }
    if (task.status !== 'in_progress' || task.assignments.length === 0) {
      return 0;
    }
    return Math.round(
      task.assignments.reduce((sum, item) => sum + item.progressPercent, 0) /
        task.assignments.length,
    );
  }

  private emitStatus(taskId: string, status: string): void {
    this.gateway.emitToTask(taskId, 'task.status_changed', { taskId, status });
  }

  private async ensureTaskExists(taskId: string): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });
    if (!task) {
      throw new NotFoundException('委托不存在');
    }
  }
}
