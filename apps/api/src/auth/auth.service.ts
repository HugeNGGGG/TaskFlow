import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '@task-guild/shared';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueTokens(user: {
    id: string;
    username: string;
    roleMask: number;
  }): Promise<TokenPair> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roleMask: user.roleMask,
      type: 'access',
    };
    const refreshPayload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roleMask: user.roleMask,
      type: 'refresh',
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: env.jwtAccessSecret,
        expiresIn: env.jwtAccessTtlSeconds,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: env.jwtRefreshSecret,
        expiresIn: `${env.jwtRefreshTtlDays}d` as `${number}d`,
      }),
    ]);
    const expiresAt = new Date(
      Date.now() + env.jwtRefreshTtlDays * 24 * 60 * 60 * 1000,
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });
    return { accessToken, refreshToken };
  }

  async login(username: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('账号或密码错误');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('账号或密码错误');
    }
    return this.issueTokens(user);
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(rawRefreshToken, {
        secret: env.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('无效的刷新令牌');
    }
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawRefreshToken) },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('账号不可用');
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(user);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawRefreshToken) },
    });
    if (stored && !stored.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  private async code2Session(
    code: string,
  ): Promise<{ openid: string; unionid?: string }> {
    if (!env.wxAppId || !env.wxSecret) {
      throw new ServiceUnavailableException('未配置微信小程序凭证');
    }
    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', env.wxAppId);
    url.searchParams.set('secret', env.wxSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');
    const response = await fetch(url.toString());
    const data = (await response.json()) as {
      openid?: string;
      unionid?: string;
      errcode?: number;
      errmsg?: string;
    };
    if (!data.openid || data.errcode) {
      throw new UnauthorizedException(
        `微信登录失败：${data.errmsg ?? '未知错误'}`,
      );
    }
    return { openid: data.openid, unionid: data.unionid };
  }

  async wechatLogin(code: string): Promise<
    | { needBind: true; bindToken: string }
    | ({ needBind: false } & TokenPair)
  > {
    const { openid } = await this.code2Session(code);
    const binding = await this.prisma.userWechat.findUnique({
      where: { openid },
      include: { user: true },
    });
    if (binding && binding.user.status === 'active') {
      const tokens = await this.issueTokens(binding.user);
      return { needBind: false, ...tokens };
    }
    const bindToken = await this.jwtService.signAsync(
      { openid, type: 'bind' },
      { secret: env.jwtRefreshSecret, expiresIn: '10m' },
    );
    return { needBind: true, bindToken };
  }

  async wechatBind(
    bindToken: string,
    username: string,
    password: string,
  ): Promise<TokenPair> {
    let openid: string;
    try {
      const payload = await this.jwtService.verifyAsync<{
        openid: string;
        type: string;
      }>(bindToken, { secret: env.jwtRefreshSecret });
      if (payload.type !== 'bind') {
        throw new Error('wrong type');
      }
      openid = payload.openid;
    } catch {
      throw new UnauthorizedException('绑定凭证无效或已过期');
    }

    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('账号或密码错误');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const existing = await this.prisma.userWechat.findUnique({
      where: { openid },
    });
    if (existing && existing.userId !== user.id) {
      throw new ForbiddenException('该微信已绑定其他账号');
    }
    await this.prisma.userWechat.upsert({
      where: { openid },
      update: { userId: user.id },
      create: { openid, userId: user.id },
    });
    return this.issueTokens(user);
  }

  generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }
}
