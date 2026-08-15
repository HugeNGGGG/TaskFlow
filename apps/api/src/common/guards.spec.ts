import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

function contextWith(headers: Record<string, string>): ExecutionContext {
  const request = { headers, user: undefined };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('校验有效 access token 并挂载用户', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'u1',
        username: 'admin',
        roleMask: 7,
        type: 'access',
      }),
    } as unknown as JwtService;
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector;
    const guard = new JwtAuthGuard(jwtService, reflector);
    const context = contextWith({ authorization: 'Bearer token' });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('无 token 抛 401', async () => {
    const jwtService = { verifyAsync: jest.fn() } as unknown as JwtService;
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector;
    const guard = new JwtAuthGuard(jwtService, reflector);
    await expect(guard.canActivate(contextWith({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('RolesGuard', () => {
  it('位标记满足任一角色即放行', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([2, 4]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = contextWith({});
    (context.switchToHttp().getRequest() as { user: unknown }).user = {
      roleMask: 4,
    };
    expect(guard.canActivate(context)).toBe(true);
  });

  it('无元数据时放行', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextWith({}))).toBe(true);
  });
});
