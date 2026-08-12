import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import type { ErrorResponseBody } from './app-exception';

// 8장: 표준 에러 응답 포맷으로 모든 예외를 통일한다.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toErrorResponse(exception);
    if (body.statusCode >= 500) this.logger.error(exception);
    res.status(body.statusCode).json(body);
  }

  private toErrorResponse(exception: unknown): ErrorResponseBody {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (
        typeof response === 'object' &&
        response !== null &&
        'errorCode' in response
      ) {
        return response as ErrorResponseBody;
      }
      // 기본 Nest 예외(예: ValidationPipe) — message가 문자열 배열일 수 있음
      const status = exception.getStatus();
      const message =
        typeof response === 'string'
          ? response
          : Array.isArray((response as { message?: unknown }).message)
            ? (response as { message: string[] }).message.join(', ')
            : ((response as { message?: string }).message ?? exception.message);
      return {
        statusCode: status,
        errorCode: HttpStatus[status] ?? 'ERROR',
        message,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          statusCode: 409,
          errorCode: 'DUPLICATE',
          message: '이미 존재하는 값입니다.',
        };
      }
      if (exception.code === 'P2025') {
        return {
          statusCode: 404,
          errorCode: 'NOT_FOUND',
          message: '대상을 찾을 수 없습니다.',
        };
      }
    }

    return {
      statusCode: 500,
      errorCode: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다.',
    };
  }
}
