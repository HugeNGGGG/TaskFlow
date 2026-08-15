import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { IsOptional, IsObject } from 'class-validator';
import { CurrentUser, type RequestUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

class PrefsDto {
  @IsOptional()
  @IsObject()
  inapp?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  wechat?: Record<string, boolean>;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('unread') unread?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = Math.max(1, Number(page ?? 1));
    const size = Math.min(50, Math.max(1, Number(pageSize ?? 20)));
    return this.prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unread === 'true' ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * size,
      take: size,
    });
  }

  @Post('read-all')
  async readAll(@CurrentUser() user: RequestUser) {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { ok: true };
  }

  @Patch(':id/read')
  async read(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true, readAt: new Date() },
    });
    return { ok: true };
  }

  @Delete()
  async clear(@CurrentUser() user: RequestUser) {
    await this.prisma.notification.deleteMany({ where: { userId: user.id } });
    return { ok: true };
  }

  @Put('prefs')
  async updatePrefs(
    @CurrentUser() user: RequestUser,
    @Body() dto: PrefsDto,
  ) {
    const current = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { notificationPrefs: true },
    });
    const prefs = (current?.notificationPrefs as Record<string, unknown>) ?? {};
    const next = {
      ...prefs,
      inapp: { ...(prefs.inapp as object), ...(dto.inapp ?? {}) },
      wechat: { ...(prefs.wechat as object), ...(dto.wechat ?? {}) },
    };
    await this.prisma.user.update({
      where: { id: user.id },
      data: { notificationPrefs: next },
    });
    return next;
  }
}
