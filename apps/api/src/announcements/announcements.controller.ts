import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IsBoolean, IsISO8601, IsOptional, IsString } from 'class-validator';
import { ROLES } from '@task-guild/shared';
import { CurrentUser, Roles, type RequestUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

class AnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    const now = new Date();
    return this.prisma.announcement.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      include: { author: { select: { nickname: true } } },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    });
  }

  @Post()
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  create(@Body() dto: AnnouncementDto, @CurrentUser() user: RequestUser) {
    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        isPinned: dto.isPinned ?? false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        authorId: user.id,
      },
    });
  }

  @Patch(':id')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  update(@Param('id') id: string, @Body() dto: AnnouncementDto) {
    return this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        isPinned: dto.isPinned,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  @Delete(':id')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  async remove(@Param('id') id: string) {
    await this.prisma.announcement.delete({ where: { id } });
    return { ok: true };
  }
}
