import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import archiver from 'archiver';
import type { Response } from 'express';
import { hasRole } from '@task-guild/shared';
import type { AttachmentArea } from '@task-guild/shared';
import { CurrentUser, type RequestUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmDto, DirectUploadBody, PresignDto } from './dto';
import { StorageService } from './storage.service';

@Controller()
export class AttachmentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Post('tasks/:id/attachments/presign')
  async presign(
    @Param('id') id: string,
    @Body() dto: PresignDto,
    @CurrentUser() user: RequestUser,
  ) {
    await this.assertAccess(id, user, dto.area, 'write');
    const version = await this.nextVersion(id, dto.area, dto.logicalName);
    const storageKey = this.storage.buildKey({
      taskId: id,
      area: dto.area,
      version,
      logicalName: dto.logicalName,
    });
    return this.storage.presignPut(storageKey);
  }

  @Post('tasks/:id/attachments/confirm')
  async confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmDto,
    @CurrentUser() user: RequestUser,
  ) {
    await this.assertAccess(id, user, dto.area, 'write');
    return this.createAttachmentRow(id, user.id, dto);
  }

  @Post('attachments/upload-direct')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadDirect(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: DirectUploadBody,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) {
      throw new BadRequestException('缺少文件');
    }
    const taskId = body.storageKey.split('/')[1];
    if (!taskId) {
      throw new BadRequestException('非法 storageKey');
    }
    await this.assertAccess(taskId, user, body.area, 'write');
    await this.storage.putBuffer(body.storageKey, file.buffer);
    return this.createAttachmentRow(taskId, user.id, {
      area: body.area,
      logicalName: body.logicalName,
      storageKey: body.storageKey,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: file.size,
    });
  }

  @Get('tasks/:id/attachments')
  async list(
    @Param('id') id: string,
    @Query('area') area?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignments: { where: { userId: user?.id } } },
    });
    if (!task) {
      throw new NotFoundException('委托不存在');
    }
    const isManager = user ? hasRole(user.roleMask, 'MANAGER') : false;
    const isMember = task.assignments.length > 0;
    const visibleAreas: AttachmentArea[] = [];
    if (isManager) {
      visibleAreas.push('source', 'process', 'result');
    } else {
      visibleAreas.push('source');
      if (isMember) {
        visibleAreas.push('process');
      }
    }
    const rows = await this.prisma.attachment.findMany({
      where: {
        taskId: id,
        ...(area ? { area: area as never } : {}),
        OR: [
          { area: { in: visibleAreas } },
          { area: 'result', uploaderId: user?.id },
        ],
      },
      include: { uploader: { select: { nickname: true } } },
      orderBy: [{ area: 'asc' }, { logicalName: 'asc' }, { version: 'desc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      area: row.area,
      logicalName: row.logicalName,
      version: row.version,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      uploaderName: row.uploader.nickname,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  @Get('attachments/:id/presign')
  async downloadPresign(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment) {
      throw new NotFoundException('附件不存在');
    }
    await this.assertAccess(attachment.taskId, user, attachment.area, 'read');
    return { url: await this.storage.presignGet(attachment.storageKey) };
  }

  @Get('attachments/download-direct')
  async downloadDirect(
    @Query('storageKey') storageKey: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { storageKey },
    });
    if (!attachment) {
      throw new NotFoundException('附件不存在');
    }
    await this.assertAccess(attachment.taskId, user, attachment.area, 'read');
    const stream = await this.storage.getStream(storageKey);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
    );
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    stream.pipe(res);
  }

  @Get('tasks/:id/attachments/zip')
  @Header('Content-Type', 'application/zip')
  async downloadZip(
    @Param('id') id: string,
    @Query('area') area: string | undefined,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignments: { where: { userId: user.id } } },
    });
    if (!task) {
      throw new NotFoundException('委托不存在');
    }
    if (!hasRole(user.roleMask, 'MANAGER') && task.assignments.length === 0) {
      throw new ForbiddenException('仅委托成员可打包下载');
    }
    const rows = await this.prisma.attachment.findMany({
      where: { taskId: id, ...(area ? { area: area as never } : {}) },
      orderBy: [{ area: 'asc' }, { logicalName: 'asc' }, { version: 'desc' }],
    });
    if (rows.length === 0) {
      throw new NotFoundException('没有可下载的附件');
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="task-${task.taskNo}-attachments.zip"`,
    );
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (error) => {
      throw error;
    });
    archive.pipe(res);
    for (const row of rows) {
      const stream = await this.storage.getStream(row.storageKey);
      archive.append(stream, {
        name: `${row.area}/${row.logicalName}_v${row.version}_${row.fileName}`,
      });
    }
    await archive.finalize();
  }

  private async assertAccess(
    taskId: string,
    user: RequestUser,
    area: string,
    action: 'read' | 'write',
  ): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: { where: { userId: user.id } } },
    });
    if (!task) {
      throw new NotFoundException('委托不存在');
    }
    const isManager = hasRole(user.roleMask, 'MANAGER');
    const isMember = task.assignments.length > 0;
    if (isManager) {
      return;
    }
    if (action === 'read') {
      if (area === 'source') {
        return;
      }
      if (area === 'process' && isMember) {
        return;
      }
      if (area === 'result') {
        throw new ForbiddenException('仅上传者与发布官可查看成果附件');
      }
      throw new ForbiddenException('无权访问该附件');
    }
    if (area === 'source' && !isManager) {
      throw new ForbiddenException('任务资料仅发布官可上传');
    }
    if ((area === 'process' || area === 'result') && !isMember) {
      throw new ForbiddenException('仅委托成员可上传附件');
    }
  }

  private async nextVersion(
    taskId: string,
    area: string,
    logicalName: string,
  ): Promise<number> {
    const latest = await this.prisma.attachment.findFirst({
      where: { taskId, area: area as never, logicalName },
      orderBy: { version: 'desc' },
    });
    return (latest?.version ?? 0) + 1;
  }

  private async createAttachmentRow(
    taskId: string,
    uploaderId: string,
    dto: {
      area: string;
      logicalName: string;
      storageKey: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      sha256?: string;
    },
  ) {
    const version = await this.nextVersion(taskId, dto.area, dto.logicalName);
    const row = await this.prisma.attachment.create({
      data: {
        taskId,
        area: dto.area as never,
        logicalName: dto.logicalName,
        version,
        storageKey: dto.storageKey,
        fileName: dto.fileName,
        mimeType: dto.mimeType || 'application/octet-stream',
        sizeBytes: dto.sizeBytes,
        sha256: dto.sha256 ?? null,
        uploaderId,
      },
    });
    await this.prisma.taskEvent.create({
      data: {
        taskId,
        authorId: uploaderId,
        type: 'progress',
        content: `上传了${dto.area === 'source' ? '任务资料' : dto.area === 'process' ? '过程附件' : '成果附件'}：${dto.fileName}（v${version}）`,
      },
    });
    return row;
  }
}
