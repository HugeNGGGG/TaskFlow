import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTaskTemplateDto, UpdateTaskTemplateDto } from './dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.taskTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateTaskTemplateDto) {
    const exists = await this.prisma.taskTemplate.findUnique({
      where: { name: dto.name },
    });
    if (exists) {
      throw new ConflictException('模板名称已存在');
    }
    return this.prisma.taskTemplate.create({
      data: {
        name: dto.name,
        titlePrefix: dto.titlePrefix,
        description: dto.description ?? '',
        difficulty: dto.difficulty,
        xpReward: dto.xpReward,
        maxMembers: dto.maxMembers,
        acceptMode: dto.acceptMode,
        needReview: dto.needReview,
      },
    });
  }

  async update(id: string, dto: UpdateTaskTemplateDto) {
    await this.ensureExists(id);
    return this.prisma.taskTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.titlePrefix !== undefined ? { titlePrefix: dto.titlePrefix } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
        ...(dto.xpReward !== undefined ? { xpReward: dto.xpReward } : {}),
        ...(dto.maxMembers !== undefined ? { maxMembers: dto.maxMembers } : {}),
        ...(dto.acceptMode !== undefined ? { acceptMode: dto.acceptMode } : {}),
        ...(dto.needReview !== undefined ? { needReview: dto.needReview } : {}),
      },
    });
  }

  async delete(id: string) {
    await this.ensureExists(id);
    await this.prisma.taskTemplate.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureExists(id: string) {
    const template = await this.prisma.taskTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException('模板不存在');
    }
  }
}
