import { HttpException } from '@nestjs/common';

export interface ErrorResponseBody {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown;
}

// 표준 에러 응답 포맷(8장)을 따르는 예외. 컨트롤러/서비스에서 이걸 던지면
// HttpExceptionFilter가 그대로 통과시킨다.
export class AppException extends HttpException {
  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    details?: unknown,
  ) {
    super(
      { statusCode, errorCode, message, details } satisfies ErrorResponseBody,
      statusCode,
    );
  }
}
