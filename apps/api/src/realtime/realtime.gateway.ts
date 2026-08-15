import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import type { JwtPayload, NotificationView } from '@task-guild/shared';

@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: env.corsOrigins, credentials: true },
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = (client.handshake.auth?.token as string | undefined)
      ?? (client.handshake.query?.token as string | undefined)
      ?? '';
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: env.jwtAccessSecret,
      });
      if (payload.type !== 'access') {
        throw new Error('wrong token type');
      }
      await client.join(`user:${payload.sub}`);
    } catch {
      this.logger.warn(`Rejected unauthenticated socket ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    void client;
  }

  @SubscribeMessage('subscribe:task')
  subscribeTask(client: Socket, payload: { taskId?: string }): void {
    if (payload?.taskId) {
      void client.join(`task:${payload.taskId}`);
    }
  }

  @SubscribeMessage('unsubscribe:task')
  unsubscribeTask(client: Socket, payload: { taskId?: string }): void {
    if (payload?.taskId) {
      void client.leave(`task:${payload.taskId}`);
    }
  }

  @SubscribeMessage('ping')
  ping(client: Socket): void {
    client.emit('pong', { ts: Date.now() });
  }

  emitToTask(taskId: string, event: string, payload: unknown): void {
    this.server.to(`task:${taskId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  notifyNew(userId: string, notification: NotificationView): void {
    this.emitToUser(userId, 'notification.new', notification);
  }
}
