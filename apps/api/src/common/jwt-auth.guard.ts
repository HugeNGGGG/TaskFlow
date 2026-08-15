import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { env } from '../config/env';
import { IS_PUBLIC_KEY, type AuthedRequest, type RequestUser } from './decorators';
import type { JwtPayload } from '@task-guild/shared';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers['authorization'] ?? '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : '';
    if (!token) {
      throw new UnauthorizedException('未登录');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: env.jwtAccessSecret,
      });
      if (payload.type !== 'access') {
        throw new Error('wrong token type');
      }
      const user: RequestUser = {
        id: payload.sub,
        username: payload.username,
        roleMask: payload.roleMask,
      };
      (request as AuthedRequest).user = user;
      return true;
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
  }
}
