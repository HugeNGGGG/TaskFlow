import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser, Public, type RequestUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { env } from '../config/env';
import {
  LoginDto,
  RefreshDto,
  WechatBindDto,
  WechatLoginDto,
} from './dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  async logout(@Body() dto: RefreshDto): Promise<{ ok: boolean }> {
    await this.authService.logout(dto.refreshToken);
    return { ok: true };
  }

  @Public()
  @Post('wechat/login')
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.wechatLogin(dto.code);
  }

  @Public()
  @Post('wechat/bind')
  wechatBind(@Body() dto: WechatBindDto) {
    return this.authService.wechatBind(
      dto.bindToken,
      dto.username,
      dto.password,
    );
  }

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    const row = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
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
      ...row,
      avatarUrl: row.avatarUrl
        ? `${env.publicBaseUrl}/api/v1/users/${user.id}/avatar`
        : null,
    };
  }
}
