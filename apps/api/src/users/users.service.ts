import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../attachments/storage.service';
import { env } from '../config/env';
import {
  CreateUserDto,
  ChangePasswordDto,
  ResetPasswordDto,
  UpdateRolesDto,
  UpdateSelfDto,
  UpdateUserDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  list(query: { q?: string; departmentId?: string }) {
    return this.prisma.user.findMany({
      where: {
        ...(query.q
          ? {
              OR: [
                { username: { contains: query.q } },
                { nickname: { contains: query.q } },
              ],
            }
          : {}),
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatarUrl: true,
        departmentId: true,
        department: { select: { name: true } },
        roleMask: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatarUrl: true,
        departmentId: true,
        roleMask: true,
        department: { select: { name: true } },
        notificationPrefs: true,
      },
    }).then((user) => ({
      ...user,
      avatarUrl: user.avatarUrl
        ? `${env.publicBaseUrl}/api/v1/users/${userId}/avatar`
        : null,
    }));
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (exists) {
      throw new ConflictException('用户名已存在');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        nickname: dto.nickname,
        departmentId: dto.departmentId ?? null,
        roleMask: dto.roleMask ?? 1,
        stats: { create: {} },
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        departmentId: true,
        roleMask: true,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        nickname: dto.nickname,
        departmentId: dto.departmentId,
        avatarUrl: dto.avatarUrl,
        status: dto.status,
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        departmentId: true,
        roleMask: true,
        status: true,
      },
    });
  }

  async updateSelf(userId: string, dto: UpdateSelfDto) {
    await this.ensureExists(userId);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nickname !== undefined ? { nickname: dto.nickname } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatarUrl: true,
        departmentId: true,
        roleMask: true,
        department: { select: { name: true } },
      },
    });
    return {
      ...updated,
      avatarUrl: updated.avatarUrl
        ? `${env.publicBaseUrl}/api/v1/users/${userId}/avatar`
        : null,
    };
  }

  async getAvatarStorageKey(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!user?.avatarUrl) {
      throw new NotFoundException('用户未上传头像');
    }
    return user.avatarUrl;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('仅支持图片文件');
    }
    const safeName = file.originalname
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .slice(-80);
    const storageKey = `avatars/${userId}/${Date.now()}-${safeName}`;
    await this.storage.putBuffer(storageKey, file.buffer);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: storageKey },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatarUrl: true,
        departmentId: true,
        roleMask: true,
        department: { select: { name: true } },
      },
    });
    return {
      ...updated,
      avatarUrl: `${env.publicBaseUrl}/api/v1/users/${userId}/avatar`,
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('新密码不能与旧密码相同');
    }
    const valid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('原密码不正确');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async updateRoles(id: string, dto: UpdateRolesDto) {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { roleMask: dto.roleMask },
      select: { id: true, username: true, roleMask: true },
    });
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    await this.ensureExists(id);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async updateNotificationPrefs(
    userId: string,
    dto: { inapp?: Record<string, boolean>; wechat?: Record<string, boolean> },
  ) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    const prefs = (current?.notificationPrefs as Record<string, unknown>) ?? {};
    const next = {
      ...prefs,
      inapp: { ...(prefs.inapp as object), ...(dto.inapp ?? {}) },
      wechat: { ...(prefs.wechat as object), ...(dto.wechat ?? {}) },
    };
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPrefs: next },
    });
    return next;
  }

  private async ensureExists(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
  }
}
