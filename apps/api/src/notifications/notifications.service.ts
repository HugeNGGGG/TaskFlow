import { Injectable, Logger } from '@nestjs/common';
import type { NotificationType } from '@task-guild/shared';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

interface SubscribeTemplates {
  assign?: string;
  review_result?: string;
  deadline_warning?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
  ) {}

  async create(input: {
    userId: string;
    type: NotificationType;
    title: string;
    content: string;
    link?: string;
  }): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        content: input.content,
        link: input.link ?? null,
      },
    });
    this.gateway.notifyNew(input.userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      link: notification.link,
      isRead: false,
      createdAt: notification.createdAt.toISOString(),
    });
    await this.tryWechatSubscribe(input.userId, input.type, input.title);
  }

  private async tryWechatSubscribe(
    userId: string,
    type: NotificationType,
    title: string,
  ): Promise<void> {
    const templates = this.parseTemplates();
    const templateId = (templates as Record<string, string | undefined>)[type];
    if (!templateId) {
      return;
    }
    const binding = await this.prisma.userWechat.findUnique({
      where: { userId },
    });
    if (!binding) {
      return;
    }
    const prefs = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    const wechatPrefs = (prefs?.notificationPrefs as { wechat?: Record<string, boolean> } | null)
      ?.wechat;
    if (wechatPrefs && wechatPrefs[type] === false) {
      return;
    }
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return;
      }
      await fetch(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            touser: binding.openid,
            template_id: templateId,
            page: 'pages/index/index',
            data: { thing1: { value: title.slice(0, 20) } },
          }),
        },
      );
    } catch (error) {
      this.logger.warn(`微信订阅消息发送失败：${String(error)}`);
    }
  }

  private parseTemplates(): SubscribeTemplates {
    try {
      return JSON.parse(env.wxSubscribeTemplates) as SubscribeTemplates;
    } catch {
      return {};
    }
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) {
      return this.accessToken;
    }
    if (!env.wxAppId || !env.wxSecret) {
      return null;
    }
    const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
    url.searchParams.set('grant_type', 'client_credential');
    url.searchParams.set('appid', env.wxAppId);
    url.searchParams.set('secret', env.wxSecret);
    const response = await fetch(url.toString());
    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) {
      return null;
    }
    this.accessToken = data.access_token;
    this.accessTokenExpiresAt =
      Date.now() + ((data.expires_in ?? 7200) - 300) * 1000;
    return this.accessToken;
  }
}
