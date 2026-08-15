import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsObject, IsOptional } from 'class-validator';
import type { Response } from 'express';
import { ROLES } from '@task-guild/shared';
import {
  CurrentUser,
  Public,
  Roles,
  type RequestUser,
} from '../common/decorators';
import {
  ChangePasswordDto,
  CreateUserDto,
  ResetPasswordDto,
  UpdateRolesDto,
  UpdateSelfDto,
  UpdateUserDto,
} from './dto';
import { UsersService } from './users.service';
import { StorageService } from '../attachments/storage.service';

class NotificationPrefsDto {
  @IsOptional()
  @IsObject()
  inapp?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  wechat?: Record<string, boolean>;
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storage: StorageService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.usersService.getMe(user.id);
  }

  @Get()
  @Roles(ROLES.ADMIN)
  list(@Query('q') q?: string, @Query('departmentId') departmentId?: string) {
    return this.usersService.list({ q, departmentId });
  }

  @Post()
  @Roles(ROLES.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateSelfDto) {
    return this.usersService.updateSelf(user.id, dto);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Post('me/change-password')
  changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) {
      throw new BadRequestException('缺少图片文件');
    }
    return this.usersService.uploadAvatar(user.id, file);
  }

  @Public()
  @Get(':id/avatar')
  async avatar(@Param('id') id: string, @Res() res: Response) {
    const storageKey = await this.usersService.getAvatarStorageKey(id);
    const stream = await this.storage.getStream(storageKey);
    const extension = storageKey.split('.').pop()?.toLowerCase();
    const contentType =
      extension === 'png'
        ? 'image/png'
        : extension === 'gif'
          ? 'image/gif'
          : extension === 'webp'
            ? 'image/webp'
            : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    stream.pipe(res);
  }

  @Patch(':id/roles')
  @Roles(ROLES.ADMIN)
  updateRoles(@Param('id') id: string, @Body() dto: UpdateRolesDto) {
    return this.usersService.updateRoles(id, dto);
  }

  @Put('me/notification-prefs')
  updatePrefs(
    @CurrentUser() user: RequestUser,
    @Body() dto: NotificationPrefsDto,
  ) {
    return this.usersService.updateNotificationPrefs(user.id, dto);
  }

  @Post(':id/reset-password')
  @Roles(ROLES.ADMIN)
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto);
  }
}
