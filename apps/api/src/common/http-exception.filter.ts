import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : Array.isArray((body as { message?: unknown }).message)
            ? ((body as { message: string[] }).message.join('；'))
            : ((body as { message?: string }).message ?? exception.message);
      response.status(status).json({ code: status, message });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const status =
        exception.code === 'P2002'
          ? HttpStatus.CONFLICT
          : HttpStatus.BAD_REQUEST;
      response.status(status).json({
        code: status,
        message: exception.code === 'P2002' ? '记录已存在' : '数据操作失败',
      });
      return;
    }

    if (
      exception instanceof Error &&
      exception.name === 'PrismaClientInitializationError'
    ) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        code: HttpStatus.SERVICE_UNAVAILABLE,
        message: '数据库不可用，请稍后重试',
      });
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '服务器内部错误',
    });
  }
}
