import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      return { tasks: [], members: [] };
    }
    const [tasks, members] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: trimmed } },
            { description: { contains: trimmed } },
            { taskNo: { contains: trimmed } },
          ],
          status: { not: 'draft' },
        },
        select: {
          id: true,
          taskNo: true,
          title: true,
          difficulty: true,
          status: true,
          deadlineAt: true,
          category: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.user.findMany({
        where: {
          OR: [
            { nickname: { contains: trimmed } },
            { username: { contains: trimmed } },
          ],
        },
        select: {
          id: true,
          username: true,
          nickname: true,
          avatarUrl: true,
          department: { select: { name: true } },
        },
        orderBy: { nickname: 'asc' },
        take: 10,
      }),
    ]);
    return {
      tasks: tasks.map((task) => ({
        ...task,
        categoryName: task.category?.name ?? null,
        deadlineAt: task.deadlineAt.toISOString(),
      })),
      members,
    };
  }
}
